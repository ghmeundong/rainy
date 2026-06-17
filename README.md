# 🌧️ Rainy

![Stars](https://img.shields.io/github/stars/ghmeundong/rainy?style=for-the-badge)
![License](https://img.shields.io/github/license/ghmeundong/rainy?style=for-the-badge)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-FF8C00?style=for-the-badge&logo=cloudflare)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js)

**After the Rain** — immersive 3D rain-aftermath visualization with server-generated animation, Web Worker physics, and Cloudflare Workers.

Rainy renders the calm scene after a storm with drifting droplets, soft ripples, and reflective rain effects.

---

## 🎬 Demo

| After the rain | Glass droplets | Rippling reflections |
|---|---|---|
| ![After the rain](./docs/quote-raining.gif) | ![Glass droplets](./docs/glass-droplets.gif) | ![Ripple effect](./docs/escampar-ripple-effect.gif) |

---

## ✨ Highlights

- Immersive “after the rain” visualization with 3D droplets, reflective surfaces, and ripple motion
- Cloudflare Workers backend generates animation state and serves compact binary payloads
- Web Workers handle physics for smooth, low-latency rendering
- Simple deploy path: GitHub Pages frontend + serverless backend

---

## 🎯 Quick Start

```bash
# Install frontend dependencies and start the dev server
npm install
npm run dev

# Start backend locally
cd backend
npm install
npm run dev
```

Open the site at: `http://localhost:5173/rainy/`

---

## 📚 Documentation

| Document | Description |
|---------|-------------|
| [📘 Development Guide](./docs/DEVELOPMENT.md) | Local setup, running, debugging |
| [🧱 Architecture](./docs/ARCHITECTURE.md) | System design and data flow |
| [🛠️ API Spec](./docs/API.md) | Backend API format and examples |
| [🚀 Deployment Guide](./docs/DEPLOYMENT.md) | GitHub Pages + Cloudflare Workers deployment |

---

## 🏛️ Project Structure

```
rainy/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
├── src/                           # Frontend source
│   ├── services/
│   │   └── api.js                # Backend API client
│   ├── main.js
│   └── style.css
├── backend/                       # Cloudflare Workers backend
│   ├── src/
│   │   └── index.js              # Worker entry point
│   ├── wrangler.toml              # Worker deployment config
│   └── package.json
├── public/                        # Static assets
│   ├── img/
│   └── js/
│       ├── jquery.min.js
│       ├── jquery.ripples.min.js
│       └── rainyday.js
├── index.html                     # Vite entry page
├── vite.config.js
├── package.json
└── .env.example                  # Environment variable template
```

---

## 🔗 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Check API health |
| GET | `/api/animation/init` | Generate animation initialization data |
| GET | `/api/animation/init?binary=1` | Generate binary initialization payload |

**Base URL**: `http://localhost:8787`

---

## 🛠️ Main Commands

```bash
# Frontend
npm run dev          # Development server
npm run build        # Build
npm run deploy       # Deploy to GitHub Pages

# Backend
cd backend
npm run dev          # Cloudflare Workers local development
npm run deploy -- --env production  # Deploy Cloudflare Workers
```

---

## 📦 Tech Stack

### Frontend
- **Vite**: fast bundler
- **jQuery**: water ripple effect
- **Three.js**: 3D rain rendering
- **RainyDay.js**: glass droplet effect

### Backend
- **Cloudflare Workers**: serverless API
- **Wrangler**: local development and deployment
- **CORS**: cross-origin request support

---

## 🚀 Deployment

### Frontend (GitHub Pages)

```bash
npm run build
npm run deploy
```

### Backend (Cloudflare Workers)

- `backend/wrangler.toml` is used to deploy Workers
- Environment variables can be configured in the Cloudflare dashboard or `wrangler.toml`

---

## 💡 API Example

### Browser console

```javascript
await api.health();
await api.animation.init({
  width: window.innerWidth,
  height: window.innerHeight,
  devicePixelRatio: window.devicePixelRatio,
  isMobile: window.matchMedia('(max-width: 900px)').matches ? 'true' : 'false',
});
```

---

## 🔒 Security

- Manage `VITE_API_URL` in `.env`
- Use the Cloudflare Workers URL for production

---

## 📝 License

MIT

---

**[📘 Development Guide](./docs/DEVELOPMENT.md)** | **[🧱 Architecture](./docs/ARCHITECTURE.md)** | **[🚀 Deployment Guide](./docs/DEPLOYMENT.md)**
