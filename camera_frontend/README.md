<div align="center">

# 📷 Digital Camera Web App & Secure API

### A production-grade, full-stack browser camera platform with real-time AI vision, voice control, and a hardened REST API.

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black&style=flat-square" alt="React 18"/>
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white&style=flat-square" alt="Vite"/>
  <img src="https://img.shields.io/badge/Django-5.x-092E20?logo=django&logoColor=white&style=flat-square" alt="Django 5"/>
  <img src="https://img.shields.io/badge/DRF-API-A30000?logo=django&logoColor=white&style=flat-square" alt="DRF"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white&style=flat-square" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white&style=flat-square" alt="Docker"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License"/>
</p>

<p>
  <a href="https://digital-camera-6pmo.vercel.app"><b>🚀 Live App</b></a> ·
  <a href="https://digital-camera-backend.onrender.com/api/"><b>⚙️ Live API</b></a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-api-reference">API Reference</a>
</p>

</div>

---

## 📖 Overview

**Digital Camera Web App** turns any browser into a full-featured camera studio. It combines a real-time computer-vision pipeline (`face-api.js`) with hands-free voice control and a Django REST backend secured by per-user API keys — no native app required.

Built as a showcase of a complete, deployable full-stack architecture: typed frontend, containerized backend, managed serverless database, and CI-friendly deploy targets.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

### 🎨 Frontend

| Feature | Description |
|---|---|
| **Real-time Camera Controls** | Instant switching between front (user) and rear (environment) cameras |
| **Capture Modes** | Single shot, self-timer (3s / 5s / 10s), and burst mode |
| **Live Filters & Overlays** | Instagram-style real-time filters, custom watermarks, grid overlays |
| **AI Face Detection** | Real-time face tracking and landmark detection via `face-api.js` |
| **AR Stickers** | Face-tracked overlays (sunglasses, hats, and more) |
| **Background Blur** | Real-time subject isolation and background blurring |
| **Voice Control** | Hands-free commands — *"capture"*, *"enhance"*, *"apply vintage"* |
| **Studio Tools** | Time-lapse creator, GIF maker, built-in photo editor, live histogram |

### 🛡️ Backend

| Feature | Description |
|---|---|
| **Secure API Architecture** | Endpoint protection via `djangorestframework-api-key` |
| **Dynamic Key Generation** | Self-service API key generation from the frontend settings portal |
| **Cloud Storage Ready** | Secure ingestion and storage of Base64 / JPEG uploads |
| **CORS Optimized** | Strictly scoped to the verified frontend origin only |
| **Containerized** | Ships as a Docker image for reproducible deploys |

---

## 🏗 Architecture

```mermaid
flowchart LR
    subgraph Client["Browser Client (React + TypeScript)"]
        A[Camera Stream] --> B[face-api.js Vision Layer]
        B --> C[Filters / AR / Voice Engine]
        C --> D[Capture Pipeline]
    end

    D -- "Base64 JPEG + Api-Key header" --> E[Django REST Framework]

    subgraph Server["Backend (Django + DRF)"]
        E --> F[API Key Auth Middleware]
        F --> G[Image Processing]
        G --> H[(PostgreSQL / Neon)]
    end

    E -->|JSON response| D
```

**Flow summary:** the browser captures and pre-processes frames client-side (filters, face landmarks, AR), then uploads finished images to the Django API using a per-user API key. DRF validates the key, persists the image record, and returns a confirmation payload.

---

## 🛠️ Tech Stack

<table>
<tr><td valign="top">

**Frontend**
- React 18
- TypeScript (strict mode)
- Vite
- Framer Motion
- face-api.js
- Tailwind CSS
- Lucide Icons

</td><td valign="top">

**Backend**
- Python 3.11
- Django 5.x
- Django REST Framework
- `djangorestframework-api-key`
- PostgreSQL (Neon serverless)
- Whitenoise + Gunicorn
- Docker

</td></tr>
</table>

---

## 📂 Project Structure

```
.
├── camera_frontend/              # React + TypeScript client
│   ├── src/
│   │   ├── components/           # UI components (camera, filters, studio tools)
│   │   ├── hooks/                # Camera stream, voice control, face detection hooks
│   │   ├── lib/                  # API client, auth key storage
│   │   └── App.tsx
│   ├── public/
│   └── package.json
│
├── digital-camera-backend/       # Django + DRF API
│   ├── camera_api/
│   │   ├── models.py             # Image + API key models
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── config/                   # Django settings, CORS, environment config
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js **v18+**
- Python **3.11+**
- PostgreSQL *(optional locally — falls back to SQLite)*
- Docker *(optional, for containerized backend)*

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/digital-camera.git
cd digital-camera
```

### 2. Backend setup (Django)

```bash
cd digital-camera-backend

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env             # then fill in your values

python manage.py migrate
python manage.py runserver
```

### 3. Frontend setup (React)

```bash
cd camera_frontend

npm install
cp .env.example .env.local       # then fill in your values

npm run dev
```

The app will be available at `http://localhost:5173`, connecting to the API at `http://localhost:8000/api/`.

---

## 🔐 Environment Variables

**Backend** (`digital-camera-backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | Django secret key | `change-me-in-production` |
| `DEBUG` | Debug mode toggle | `False` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host/db` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origin(s) | `http://localhost:5173` |

**Frontend** (`camera_frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:8000/api` |

> ⚠️ Never commit real `.env` files. Only `.env.example` templates should be version-controlled.

---

## 📡 API Reference

### Authentication

All write endpoints require an API key issued via the frontend's **Settings → API Portal**.

```
Authorization: Api-Key <token>
```

### Key Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/keys/generate/` | Generate a new API key for a user | ❌ |
| `POST` | `/api/photos/` | Upload a captured photo (Base64/JPEG) | ✅ |
| `GET` | `/api/photos/` | List uploaded photos for the authenticated key | ✅ |
| `GET` | `/api/photos/{id}/` | Retrieve a single photo record | ✅ |
| `DELETE` | `/api/photos/{id}/` | Delete a photo record | ✅ |

**Example upload request:**

```bash
curl -X POST https://digital-camera-backend.onrender.com/api/photos/ \
  -H "Authorization: Api-Key YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "<base64-jpeg-data>", "caption": "Sunset shot"}'
```

---

## 🧪 Testing

```bash
# Backend
cd digital-camera-backend
python manage.py test

# Frontend
cd camera_frontend
npm run test
npm run lint
```

---

## 🌐 Deployment

| Layer | Platform | Notes |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Continuous deployment on every push to `main` |
| **Backend** | [Render](https://render.com) | Dockerized; auto-deploys on branch push |
| **Database** | [Neon](https://neon.tech) | Serverless PostgreSQL, connection pooling enabled |

---

## 🗺️ Roadmap

- [ ] Multi-language UI (i18n)
- [ ] Offline-first capture (PWA + background sync)
- [ ] Shared cloud albums with permissions
- [ ] Companion mobile app (React Native)
- [ ] Rate limiting & usage analytics per API key

---

## 🤝 Contributing

Contributions are welcome and appreciated.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "feat: add amazing feature"`
4. Push to your branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and ensure `npm run lint` / `python manage.py test` pass before submitting.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for full details.

<div align="center">

---

Made with ❤️ using React, TypeScript, and Django

</div>
