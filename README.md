# 🌧️ Rainy

**Vite 프론트엔드 + Cloudflare Workers 백엔드 프로젝트**

Rainy는 서버리스 API로 애니메이션 초기값을 계산하고 프론트엔드에서 몰입형 빗방울 효과를 렌더링합니다.

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
| [📖 빠른 시작](./docs/03_QUICKSTART.md) | 5분 안에 개발 환경 구성 |
| [🏗️ 프로젝트 구조](./docs/02_PROJECT_STRUCTURE.md) | 디렉토리 구조 설명 |
| [🔧 백엔드 가이드](./docs/01_BACKEND_GUIDE.md) | Cloudflare Worker API 사용법 |
| [🚀 배포 가이드](./docs/04_DEPLOYMENT.md) | GitHub Pages + Cloudflare Workers 배포 |

---

## 🏛️ 프로젝트 구조

```
rainy/
├── docs/                          # 📚 문서
│   ├── 01_BACKEND_GUIDE.md
│   ├── 02_PROJECT_STRUCTURE.md
│   ├── 03_QUICKSTART.md
│   └── 04_DEPLOYMENT.md
├── src/                           # 🎨 프론트엔드
│   ├── services/
│   │   └── api.js                # 백엔드 API 호출
│   ├── main.js
│   └── style.css
├── backend/                       # 🔧 Cloudflare Workers 백엔드
│   ├── src/
│   │   └── index.js              # Worker 엔트리포인트
│   ├── wrangler.toml              # Workers 배포 구성
│   └── package.json
├── public/                        # 📁 정적 자산
│   └── img/
├── index.html                     # Vite 진입점
├── vite.config.js
├── package.json
└── .env                          # 프론트엔드 환경 변수
```

---

## 🔗 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/animation/init` | 애니메이션 초기값 생성 |

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
npm run deploy -- --env production  # Cloudflare Workers 배포
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

- `backend/wrangler.toml`을 사용해 Workers를 배포
- 환경 변수은 Cloudflare Dashboard 또는 `wrangler.toml`에서 설정

---

## 💡 API 사용 예시

### 브라우저 콘솔에서

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

## 🔒 보안

- `.env` 파일에서 `VITE_API_URL`만 관리
- 프로덕션에서는 `VITE_API_URL`을 Cloudflare Workers 주소로 변경
- MongoDB 또는 Express 관련 레거시 파일은 제거되었습니다

---

## 📝 라이선스

MIT

---

**[📖 전체 가이드 보기](./docs/03_QUICKSTART.md)** | **[🏗️ 구조 설명](./docs/02_PROJECT_STRUCTURE.md)** | **[🚀 배포하기](./docs/04_DEPLOYMENT.md)**
