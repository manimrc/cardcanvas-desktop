use sqlx::{SqlitePool, sqlite::{SqlitePoolOptions, SqliteConnectOptions}};
use std::str::FromStr;

pub async fn create_pool(url: &str) -> anyhow::Result<SqlitePool> {
    let conn_options = SqliteConnectOptions::from_str(url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(conn_options)
        .await?;

    Ok(pool)
}

pub async fn run_migrations(pool: &SqlitePool) -> anyhow::Result<()> {
    sqlx::migrate!("./migrations").run(pool).await?;
    tracing::info!("Database migrations applied successfully");
    Ok(())
}
