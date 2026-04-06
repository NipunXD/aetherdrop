# 🚀 AetherDrop

AetherDrop is a modern, secure file-sharing platform that allows users to upload files and share them via temporary, expiring links.

Built as a full-stack system with production-ready infrastructure, it focuses on **privacy, control, and simplicity**.

---

## 🌐 Live Demo

> Accessible via Cloudflare Tunnel (temporary public URL)
> https://trinity-aid-tribute-approved.trycloudflare.com/

---

## ✨ Features

* 📦 Upload multiple files at once
* 🔐 Secure file access via unique links
* ⏳ Expiry-based file deletion
* 📉 Download limits per file
* 🗂 Automatic ZIP generation for multi-file downloads
* ☁️ AWS S3 storage integration
* 🧹 Background cleanup service (cron-based)
* 🌍 Public access via Cloudflare Tunnel
* ⚡ Fast and responsive UI

---

## 🧠 How It Works

1. User uploads files
2. Files are stored in AWS S3
3. A unique shareable link is generated
4. Download requests are validated:

   * Expiry time
   * Download count
5. Files are streamed and zipped on demand
6. Expired files are automatically deleted

---

## 🏗 Architecture

```
Frontend (React + Vite + Tailwind)
        ↓
Nginx (Reverse Proxy)
        ↓
Backend (Node.js + Express)
        ↓
MongoDB (Metadata)
        ↓
AWS S3 (File Storage)
```

---

## ⚙️ Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS
* Framer Motion

### Backend

* Node.js
* Express.js
* Multer (file handling)
* Archiver (ZIP streaming)

### Infrastructure

* AWS S3
* MongoDB Atlas
* Docker & Docker Compose
* Nginx
* Cloudflare Tunnel

---

## 🔒 Key Highlights

* No direct S3 exposure
* Backend-controlled access
* Download limit enforcement
* Expiry-based cleanup system
* Fully containerized deployment

---

## 🚀 Deployment

The application is deployed on an AWS EC2 instance using Docker.

Public access is enabled via Cloudflare Tunnel with HTTPS support.

---

## 📂 Project Structure

```
aetherdrop/
├── frontend/
├── backend/
├── docker-compose.yml
└── README.md
```

---

## 🧪 Future Improvements

* User authentication
* File encryption
* Progress indicators
* Drag & drop upload
* Custom domains
* Analytics dashboard

---

## 🤝 Contributing

Feel free to fork and improve the project.

---

## 📜 License

MIT License

---

## 👨‍💻 Author

Built with focus on real-world deployment and system design.
