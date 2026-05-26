use std::path::PathBuf;
use uuid::Uuid;
use crate::errors::{AppError, Result};
use super::repository::MediaRepository;
use super::models::UploadResponse;
use axum::extract::multipart::Field;

pub struct MediaService {
    repo: MediaRepository,
    media_dir: String,
}

impl MediaService {
    pub fn new(repo: MediaRepository, media_dir: String) -> Self {
        Self { repo, media_dir }
    }

    pub async fn save_file(
        &self,
        user_id: Uuid,
        filename: String,
        mime_type: String,
        data: Vec<u8>,
    ) -> Result<UploadResponse> {
        let upload_base = PathBuf::from(&self.media_dir);
        let user_dir = upload_base.join(user_id.to_string());
        
        tokio::fs::create_dir_all(&user_dir)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

        let file_id = Uuid::new_v4().to_string();
        let ext = std::path::Path::new(&filename)
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e))
            .unwrap_or_default();
        
        let storage_filename = format!("{}{}", file_id, ext);
        let file_path = user_dir.join(&storage_filename);
        let size_bytes = data.len() as i64;

        tokio::fs::write(&file_path, &data)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

        let storage_path = format!("{}/{}", user_id, storage_filename);

        self.repo.create_media(user_id, &filename, &mime_type, size_bytes, &storage_path).await?;

        let url = format!("/api/media/files/{}", storage_path);

        Ok(UploadResponse {
            url,
            mime_type,
        })
    }

    pub async fn save_file_stream(
        &self,
        user_id: Uuid,
        filename: String,
        mime_type: String,
        mut field: Field<'_>,
    ) -> Result<UploadResponse> {
        let upload_base = PathBuf::from(&self.media_dir);
        let user_dir = upload_base.join(user_id.to_string());
        
        tokio::fs::create_dir_all(&user_dir)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

        let file_id = Uuid::new_v4().to_string();
        let ext = std::path::Path::new(&filename)
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e))
            .unwrap_or_default();
        
        let storage_filename = format!("{}{}", file_id, ext);
        let file_path = user_dir.join(&storage_filename);

        use tokio::io::AsyncWriteExt;
        let mut file = tokio::fs::File::create(&file_path)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

        let mut size_bytes = 0i64;
        let mut write_failed = false;
        let mut stream_err = None;

        while let Some(chunk) = field.chunk().await.transpose() {
            let chunk = match chunk {
                Ok(c) => c,
                Err(e) => {
                    stream_err = Some(AppError::BadRequest(e.to_string()));
                    break;
                }
            };

            size_bytes += chunk.len() as i64;
            if let Err(e) = file.write_all(&chunk).await {
                stream_err = Some(AppError::Internal(anyhow::anyhow!(e)));
                write_failed = true;
                break;
            }
        }

        if write_failed || stream_err.is_some() {
            let _ = tokio::fs::remove_file(&file_path).await;
            return Err(stream_err.unwrap_or_else(|| AppError::BadRequest("Upload stream interrupted".into())));
        }

        let storage_path = format!("{}/{}", user_id, storage_filename);

        self.repo.create_media(user_id, &filename, &mime_type, size_bytes, &storage_path).await?;

        let url = format!("/api/media/files/{}", storage_path);

        Ok(UploadResponse {
            url,
            mime_type,
        })
    }

    pub async fn delete_file(&self, user_id: Uuid, storage_path: &str) -> Result<()> {
        if storage_path.contains("..") || storage_path.contains('\\') {
            return Err(AppError::BadRequest("Invalid storage path".into()));
        }

        let upload_base = PathBuf::from(&self.media_dir);
        let file_path = upload_base.join(storage_path);

        if file_path.exists() {
            tokio::fs::remove_file(&file_path)
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
        }

        self.repo.delete_media(user_id, storage_path).await?;
        Ok(())
    }

    pub fn get_file_path(&self, user_id: Uuid, filename: &str) -> Result<(PathBuf, String)> {
        if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
            return Err(AppError::BadRequest("Invalid filename".into()));
        }

        let upload_base = PathBuf::from(&self.media_dir);
        let file_path = upload_base.join(user_id.to_string()).join(filename);

        if !file_path.exists() {
            return Err(AppError::NotFound);
        }

        let ext = std::path::Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or_default()
            .to_lowercase();

        let mime_type = match ext.as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            "pdf" => "application/pdf",
            "mp3" => "audio/mpeg",
            "wav" => "audio/wav",
            "ogg" => "audio/ogg",
            "m4a" => "audio/mp4",
            "flac" => "audio/flac",
            "aac" => "audio/aac",
            "opus" => "audio/opus",
            "mp4" => "video/mp4",
            "webm" => "video/webm",
            "mkv" => "video/x-matroska",
            "mov" => "video/quicktime",
            "avi" => "video/x-msvideo",
            "wmv" => "video/x-ms-wmv",
            "flv" => "video/x-flv",
            _ => "application/octet-stream",
        }.to_string();

        Ok((file_path, mime_type))
    }

    pub async fn read_file(&self, user_id: Uuid, filename: &str) -> Result<(Vec<u8>, String)> {
        let (file_path, mime_type) = self.get_file_path(user_id, filename)?;

        let data = tokio::fs::read(&file_path)
            .await
            .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

        Ok((data, mime_type))
    }
}

