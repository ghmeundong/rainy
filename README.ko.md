# 🌧️ Rainy

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Now-blue?style=for-the-badge&logo=github)](https://ghmeundong.github.io/rainy/)
![Stars](https://img.shields.io/github/stars/ghmeundong/rainy?style=for-the-badge)
![License](https://img.shields.io/github/license/ghmeundong/rainy?style=for-the-badge)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-FF8C00?style=for-the-badge&logo=cloudflare)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js)

**After the Rain** — 서버 생성 애니메이션, Web Worker 물리, Cloudflare Workers로 구동되는 몰입형 3D 비 이후 시각화.

Rainy는 폭우가 그친 뒤의 고요한 장면을 드리프트하는 물방울, 부드러운 파문, 반사 효과와 함께 렌더링합니다.

Live demo: https://ghmeundong.github.io/rainy/

---

## 🎬 Demo

| After the rain | Glass droplets | Rippling reflections |
|---|---|---|
| ![After the rain](./docs/quote-raining.gif) | ![Glass droplets](./docs/glass-droplets.gif) | ![Ripple effect](./docs/escampar-ripple-effect.gif) |

---

## ✨ 하이라이트

- 폭우가 그친 뒤의 잔잔한 장면을 표현하는 3D 물방울, 반사면, 파문 모션
- Cloudflare Workers 백엔드가 애니메이션 상태를 생성하고 컴팩트한 바이너리 페이로드를 제공
- Web Worker가 물리 연산을 처리하여 부드럽고 저지연 렌더링 지원
- GitHub Pages 프론트엔드 + 서버리스 백엔드의 간단한 배포 경로

---

## 🎯 빠른 시작

```bash
# Install frontend dependencies and start the dev server
npm install
npm run dev

# Start backend locally
cd backend
npm install
npm run dev
```

Open the site at: `http://localhost:5173/rainy/` or view the live demo at `https://ghmeundong.github.io/rainy/`

---

## 📚 문서

| 문서 | 내용 |
|---------|-------------|
| [📘 개발 가이드](./docs/DEVELOPMENT.md) | 로컬 설정, 실행, 디버깅 |
| [🧱 아키텍처](./docs/ARCHITECTURE.md) | 시스템 디자인과 데이터 흐름 |
| [🛠️ API 스펙](./docs/API.md) | 백엔드 API 형식 및 예시 |
| [🚀 배포 가이드](./docs/DEPLOYMENT.md) | GitHub Pages + Cloudflare Workers 배포 |

---

## 🏛️ 프로젝트 구조

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

## 🔗 API 엔드포인트

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/animation/init` | 애니메이션 초기값 생성 |
| GET | `/api/animation/init?binary=1` | 바이너리 초기값 페이로드 생성 |

**Base URL**: `http://localhost:8787`

---

## 🛠️ 주요 명령어

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

## 📦 기술 스택

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

## 🚀 배포

### Frontend (GitHub Pages)

```bash
npm run build
npm run deploy
```

### Backend (Cloudflare Workers)

- `backend/wrangler.toml` is used to deploy Workers
- Environment variables can be configured in the Cloudflare dashboard or `wrangler.toml`

---

## 💡 API 사용 예시

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

**[English README](./README.md)**
