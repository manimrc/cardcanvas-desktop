#!/usr/bin/env node
/**
 * Build script for CardCanvas desktop app.
 *
 * Steps:
 * 1. Run `next build` to generate the standalone output
 * 2. Copy the static + public files into standalone
 * 3. Copy native modules (better-sqlite3) into standalone
 * 4. Resolve symlinks (Next.js standalone uses them, electron-builder can't follow)
 * 5. Run electron-builder to produce .dmg / .exe
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT, '.next', 'static');
const STATIC_DEST = path.join(STANDALONE, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT, 'public');
const PUBLIC_DEST = path.join(STANDALONE, 'public');

function run(cmd) {
  console.log(`\n▶ ${cmd}\n`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  ⚠ Skipping (not found): ${src}`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`  ✓ Copied ${path.basename(src)} → ${path.relative(ROOT, dest)}`);
}

/**
 * Replace symlinks with actual copies recursively
 */
function resolveSymlinks(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      const target = fs.realpathSync(fullPath);
      if (fs.existsSync(target)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        fs.cpSync(target, fullPath, { recursive: true });
        console.log(`  ✓ Resolved symlink: ${entry.name}`);
      }
    } else if (stat.isDirectory()) {
      resolveSymlinks(fullPath);
    }
  }
}

// Step 1: Build Next.js
console.log('\n━━━ Step 1: Building Next.js (standalone) ━━━');
run('npx next build');

// Step 2: Copy static assets into standalone
console.log('\n━━━ Step 2: Copying static assets ━━━');
copyDirSync(STATIC_SRC, STATIC_DEST);
copyDirSync(PUBLIC_SRC, PUBLIC_DEST);

// Step 3: Copy better-sqlite3 native binding into standalone
console.log('\n━━━ Step 3: Copying native modules ━━━');
const nativeDeps = ['better-sqlite3', 'bindings', 'file-uri-to-path'];
for (const dep of nativeDeps) {
  const src = path.join(ROOT, 'node_modules', dep);
  const dest = path.join(STANDALONE, 'node_modules', dep);
  copyDirSync(src, dest);
}

// Step 4: Resolve symlinks (Next.js standalone creates them, electron-builder can't handle them)
console.log('\n━━━ Step 4: Resolving symlinks ━━━');
resolveSymlinks(path.join(STANDALONE, '.next'));
resolveSymlinks(path.join(STANDALONE, 'node_modules'));

// Step 5: Build Electron app
console.log('\n━━━ Step 5: Packaging with electron-builder ━━━');
run('npx electron-builder --config electron-builder.yml');

console.log('\n━━━ ✅ Build complete! Check the dist/ folder ━━━\n');
