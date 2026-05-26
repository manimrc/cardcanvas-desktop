use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, put},
    Json, Router,
};
use uuid::Uuid;

use crate::{
    infrastructure::{auth::AuthUser, validation::ValidatedJson},
    errors::{AppError, Result},
    state::AppState,
};
use super::models::*;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_cards).post(create_card))
        .route("/all", get(get_all_cards))
        .route("/:id", put(update_card).delete(delete_card))
}

async fn get_cards(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Query(params): Query<CardQuery>,
) -> Result<Json<Vec<Card>>> {
    let uid: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;
    let cards = state.card_service.get_cards(uid, params.board_id).await?;
    Ok(Json(cards))
}

async fn get_all_cards(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<Card>>> {
    let uid: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;
    let cards = state.card_service.get_all_cards(uid).await?;
    Ok(Json(cards))
}

async fn create_card(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateCardRequest>,
) -> Result<(StatusCode, Json<Card>)> {
    let uid: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;
    let card = state.card_service.create_card(uid, req).await?;
    Ok((StatusCode::CREATED, Json(card)))
}

async fn update_card(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateCardRequest>,
) -> Result<Json<Card>> {
    let uid: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;
    let card = state.card_service.update_card(uid, id, req).await?;
    Ok(Json(card))
}

async fn delete_card(
    AuthUser(claims): AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    let uid: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    let card_opt = state.card_service.get_card(uid, id).await?;
    
    if let Some(card) = card_opt {
        state.card_service.delete_card(uid, id).await?;

        if let Some(content) = &card.content {
            if content.starts_with("/api/media/files/") {
                let other_ref_count = state.card_service.count_references_to_content(uid, content).await?;
                if other_ref_count == 0 {
                    let storage_path = &content["/api/media/files/".len()..];
                    let _ = state.media_service.delete_file(uid, storage_path).await;
                }
            }
        }
    }

    Ok(Json(serde_json::json!({ "success": true })))
}
