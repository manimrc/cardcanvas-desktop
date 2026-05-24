use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env file if present
    dotenvy::dotenv().ok();

    // Init tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "cardcanvas_backend=debug,tower_http=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    // Resolve configuration from environment
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://cardcanvas.db".to_string());
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "dev-secret-please-change-in-production".to_string());
    let media_dir = std::env::var("MEDIA_DIR")
        .unwrap_or_else(|_| "./uploads".to_string());

    // Initialize state (db connection & migrations)
    let state = cardcanvas_backend::init_app_state(&database_url, jwt_secret, media_dir).await?;

    // Run the API server
    cardcanvas_backend::start_axum_server(state).await?;

    Ok(())
}
