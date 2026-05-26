#!/bin/bash
set -e

echo "🚀 Starting Deployment & Packaging for Sleekly Desktop v2..."

# 1. Ensure we are in the correct directory (project root or scripts)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
FRONTEND_DIR="$PROJECT_ROOT/sleekly-frontend"

echo "📂 Project Directory: $PROJECT_ROOT"

# 2. Check dependencies
if ! [ -x "$(command -v npm)" ]; then
  echo "❌ Error: npm is not installed. Please install Node.js." >&2
  exit 1
fi

if ! [ -x "$(command -v cargo)" ]; then
  echo "❌ Error: cargo (Rust toolchain) is not installed. Please install Rustup." >&2
  exit 1
fi

# 3. Clean and install packages
echo "⚛️ Installing npm packages..."
cd "$FRONTEND_DIR"
npm install

# 4. Compile frontend and build Tauri installers
echo "🏗️ Compiling Next.js assets and building Tauri desktop installers..."
# Running tauri build automatically triggers the next static export build via 'npm run build:tauri'
npm run tauri build

echo "--------------------------------------------------------"
echo "✅ Packaging completed successfully!"
echo "--------------------------------------------------------"
echo "📦 Generated desktop installers are located in:"
echo "👉 $FRONTEND_DIR/src-tauri/target/release/bundle/"
echo "--------------------------------------------------------"
