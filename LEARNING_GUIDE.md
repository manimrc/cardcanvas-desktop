# 🎨 Welcome to CardCanvas! Your Learning Guide

> **CardCanvas** is a visual workspace for organizing cards, notes, links, and media on an infinite canvas.

Whether you are a developer looking to understand how the app works, or someone trying to deploy it for the first time, this guide is designed for *you*. We've used simple language, clear concepts, and beautiful formatting to make learning enjoyable!

---

## 🌟 What Can CardCanvas Do?

Imagine an infinite digital whiteboard where you can place sticky notes, but on steroids. Here is what is inside:

- 📝 **Rich Text Cards:** A full editor with tables and task lists (powered by TipTap).
- 🔗 **Link & Image Cards:** Bookmark URLs or upload images directly.
- 📄 **PDF Cards:** Embed and preview your PDF documents right on the board!
- 🎨 **14-Color Palette:** Color-code your thoughts for visual organization.
- 🔍 **Search & Tags:** Find exactly what you need, instantly.
- 📁 **Folders & Boards:** Keep your workspaces neatly organized.
- 🖌️ **Whiteboard Mode:** Draw and sketch freely (powered by Excalidraw).
- 📦 **Runs Anywhere:** Use it as a native app on macOS, Linux, and Windows.

---

## 🧠 Core Concepts Explained

Before we dive into setup, let's understand *how* CardCanvas works under the hood. 

### 1. The Frontend (What You See)
Built with **Next.js 16** and **React 19**. It uses **Vanilla CSS** for its beautiful dark theme and glassmorphism effects. For the rich text editor, it leverages **TipTap**, and for the drawing canvas, it uses **Excalidraw**.

### 2. The Backend & Database (Where Data Lives)
CardCanvas doesn't require a massive cloud database setup. It uses **SQLite** natively. Your entire database is just a single file on your computer! 

### 3. Desktop Apps (Tauri)
To make CardCanvas run like a normal app on your computer, we use **Tauri**. Tauri packages the Next.js web application into a lightning-fast native desktop window, written in Rust.
Tauri communicates with the Next.js frontend using Rust commands, acting as the secure bridge between the user interface and the local SQLite database.

---

## 🚀 How to Run CardCanvas Locally

Want to tinker with the code? Here's the easiest way to get started.

> [!IMPORTANT]
> You'll need **Node.js (version 20)** and **Rust** installed on your computer.

### Step 1: Download and Install Dependencies
Open your terminal and run:
```bash
git clone https://github.com/YOUR_USERNAME/cardcanvas.git
cd cardcanvas
npm install --legacy-peer-deps
```

### Step 2: Start the Dev Server
```bash
npm run tauri dev
```

### Step 3: Open the App
The Tauri window will open automatically. Any code changes you make to the React frontend or Rust backend will instantly show up! 

---

## 💻 Building the Desktop App (macOS & Windows)

Want an actual `.dmg` or `.exe` file to install CardCanvas like a native app?

It's just one command:
```bash
npm run tauri build
```
This does all the hard work: building Next.js into static HTML, compiling the Rust backend, and packaging it up into a tiny installer file. 
The final file will be waiting for you in the `src-tauri/target/release/bundle/` folder!

---

## 🛠️ Troubleshooting (Help, it broke!)

Here are quick fixes to common hiccups:

- **"command not found"**: Ensure you have installed both Node.js and Rust and restarted your terminal.
- **Port 3000 is in use**: Another app is running on port 3000, preventing the Next.js frontend from starting. Stop the other app.
- **Missing OS Dependencies**: On Linux, Tauri requires webkit2gtk and other libraries to be installed (`sudo apt-get install libwebkit2gtk-4.1-dev`).

---

Enjoy exploring and building with **CardCanvas**! 🎉
