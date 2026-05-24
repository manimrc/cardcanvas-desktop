use axum::{
    extract::{Multipart, State, Path},
    routing::{post, get},
    response::IntoResponse,
    http::header,
    Json, Router,
};
use uuid::Uuid;

use crate::{
    infrastructure::auth::AuthUser,
    errors::{AppError, Result},
    state::AppState,
};
use super::models::UploadResponse;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/upload", post(upload_media))
        .route("/files/:user_id/:filename", get(serve_media))
}


async fn upload_media(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>> {
    let uid: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    if let Some(field) = multipart.next_field().await
        .map_err(|e| AppError::BadRequest(e.to_string()))? {

        let filename = field.file_name()
            .unwrap_or("upload")
            .to_string();
        let mime_type = field.content_type()
            .unwrap_or("application/octet-stream")
            .to_string();

        let data = field.bytes().await
            .map_err(|e| AppError::BadRequest(e.to_string()))?;

        let response = state.media_service.save_file(uid, filename, mime_type, data.to_vec()).await?;
        
        return Ok(Json(response));
    }

    Err(AppError::BadRequest("No file in request".into()))
}

async fn serve_media(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path((user_id_str, filename)): Path<(String, String)>,
) -> Result<axum::response::Response> {
    let user_id = Uuid::parse_str(&user_id_str)
        .map_err(|_| AppError::BadRequest("Invalid user ID".into()))?;

    let (file_path, mime_type) = state.media_service.get_file_path(user_id, &filename)?;

    let metadata = tokio::fs::metadata(&file_path)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
    let file_size = metadata.len();

    let range_header = headers.get(header::RANGE).and_then(|v| v.to_str().ok());

    if let Some(r_str) = range_header {
        if let Some((start, end)) = parse_range(r_str, file_size) {
            use tokio::io::AsyncSeekExt;
            use tokio::io::AsyncReadExt;

            let mut file = tokio::fs::File::open(&file_path)
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

            file.seek(std::io::SeekFrom::Start(start))
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

            let max_chunk = 2 * 1024 * 1024;
            let requested_size = end - start + 1;
            let chunk_size = std::cmp::min(requested_size, max_chunk);

            let mut buffer = vec![0u8; chunk_size as usize];
            let bytes_read = file.read(&mut buffer)
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

            buffer.truncate(bytes_read);
            let actual_end = start + bytes_read as u64 - 1;

            let content_range = format!("bytes {}-{}/{}", start, actual_end, file_size);
            let content_length = bytes_read.to_string();

            return Ok((
                axum::http::StatusCode::PARTIAL_CONTENT,
                [
                    (header::CONTENT_TYPE, mime_type),
                    (header::ACCEPT_RANGES, "bytes".to_string()),
                    (header::CONTENT_RANGE, content_range),
                    (header::CONTENT_LENGTH, content_length),
                    (header::CACHE_CONTROL, "public, max-age=31536000".to_string()),
                ],
                axum::body::Body::from(buffer),
            ).into_response());
        }
    }

    let data = tokio::fs::read(&file_path)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    Ok((
        [
            (header::CONTENT_TYPE, mime_type),
            (header::CONTENT_LENGTH, file_size.to_string()),
            (header::ACCEPT_RANGES, "bytes".to_string()),
            (header::CACHE_CONTROL, "public, max-age=31536000".to_string()),
        ],
        axum::body::Body::from(data),
    ).into_response())
}

fn parse_range(range_str: &str, file_size: u64) -> Option<(u64, u64)> {
    if !range_str.starts_with("bytes=") {
        return None;
    }
    let range_val = &range_str[6..];
    let parts: Vec<&str> = range_val.split('-').collect();
    if parts.len() != 2 {
        return None;
    }

    let start = parts[0].trim().parse::<u64>().ok()?;
    let end = if parts[1].trim().is_empty() {
        file_size - 1
    } else {
        parts[1].trim().parse::<u64>().ok()?
    };

    if start <= end && start < file_size {
        let actual_end = std::cmp::min(end, file_size - 1);
        Some((start, actual_end))
    } else {
        None
    }
}

