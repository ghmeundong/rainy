# 🌧️ Rainy

**Vite 프론트엔드 + Cloudflare Workers 백엔드 프로젝트**

Rainy는 서버리스 API로 애니메이션 초기값을 계산하고 프론트엔드에서 비 효과를 렌더링합니다.

---

## 🎯 빠른 시작

```bash
# 루트에서 프론트엔드 설치 및 실행
npm install
npm run dev

# 백엔드 실행
cd backend
npm install
npm run dev
```

브라우저에서 접속: `http://localhost:5173/rainy/`

---

## 📚 문서

| 문서 | 내용 |
|------|------|
| [📘 개발 가이드](./docs/DEVELOPMENT.md) | 개발 환경 구성, 로컬 실행, 디버깅 |
| [🧱 아키텍처](./docs/ARCHITECTURE.md) | 시스템 구성과 데이터 흐름 |
| [🛠️ API 스펙](./docs/API.md) | 백엔드 API 형태 및 사용 예시 |
| [🚀 배포 가이드](./docs/DEPLOYMENT.md) | GitHub Pages + Cloudflare Workers 배포 |

---

## 🏛️ 프로젝트 구조

```
rainy/
├── docs/                          # 📚 문서
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
├── src/                           # 🎨 프론트엔드
│   ├── services/
│   │   └── api.js                # 백엔드 API 호출
│   ├── workers/
│   │   └── physicsWorker.js      # Web Worker 물리 계산
│   ├── main.js
│   └── style.css
├── backend/                       # 🔧 Cloudflare Workers 백엔드
│   ├── src/
│   │   └── index.js              # Worker 엔트리포인트
│   ├── wrangler.toml              # Workers 배포 구성
│   └── package.json
├── public/                        # 📁 정적 자산
│   ├── img/
│   └── js/
│       ├── jquery.min.js
│       ├── jquery.ripples.min.js
│       └── rainyday.js
├── index.html                     # Vite 진입점
├── vite.config.js
├── package.json
└── .env.example                  # 환경 변수 템플릿
```

---

## 🔗 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/animation/init` | 애니메이션 초기값 생성 |
| GET | `/api/animation/init?binary=1` | 바이너리 응답으로 초기값 생성 |

**기본 URL**: `http://localhost:8787`

---

## 🛠️ 주요 명령어

```bash
# 프론트엔드
npm run dev          # 개발 서버
npm run build        # 빌드
npm run deploy       # GitHub Pages 배포

# 백엔드
cd backend
npm run dev          # Cloudflare Workers 로컬 개발
npm run deploy       # Cloudflare Workers 배포
```

---

## 📦 기술 스택

### 프론트엔드
- **Vite**: 빠른 번들러
- **jQuery**: DOM 조작
- **Three.js**: 3D 그래픽
- **RainyDay.js**: 빗소리 효과

### 백엔드
- **Cloudflare Workers**: 서버리스 API
- **Wrangler**: 로컬 개발 및 배포
- **CORS**: Cross-origin 요청 지원

---

## 🚀 배포

### 프론트엔드 (GitHub Pages)

```bash
npm run build
npm run deploy
```

### 백엔드 (Cloudflare Workers)

```bash
cd backend
npm run deploy
```

배포 전에 `VITE_API_URL`이 프로덕션 Worker 주소로 설정되어 있는지 확인하세요.

---

## 🌐 환경 변수

프로젝트는 `.env` 파일을 사용해 로컬 개발 API 주소를 관리합니다.

```env
VITE_API_URL=http://localhost:8787
```

프로덕션 배포 시에는 다음처럼 빌드 전에 설정합니다.

```powershell
$env:VITE_API_URL='https://rainy-api-production.ghmeundong.workers.dev'
npm run deploy
```

---

## 💡 API 사용 예시

### 브라우저 콘솔에서

```javascript
const response = await fetch('http://localhost:8787/api/animation/init');
const config = await response.json();
const responseBinary = await fetch('http://localhost:8787/api/animation/init?binary=1');
```

---

## 🔒 보안

- `.env` 파일은 실제 값 저장용이며 일반적으로 Git에 커밋하지 않습니다.
- `.env.example` 파일은 필요한 환경 변수를 문서화하기 위한 템플릿입니다.
- 프로덕션 API 주소는 빌드 시 환경 변수로 주입합니다.

---

## 📝 라이선스

MIT

---

**[English README](./README.md)**
