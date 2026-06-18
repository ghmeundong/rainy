# 🚀 빠른 시작 가이드

> Cloudflare Workers 백엔드와 Vite + JavaScript 프론트엔드

---

## ⚡ 5분 안에 시작하기

### 1️⃣ 백엔드 실행 (포트 8787)

```bash
cd backend
npm run dev
```

✅ 다음이 나타나면 성공:
```
✨ Listening on http://localhost:8787
```

### 2️⃣ 프론트엔드 실행 (포트 5173)

```bash
npm run dev
```

✅ 브라우저에서 접속:
```
http://localhost:5173/rainy/
```

---

## 🧪 API 테스트

### 콘솔에서 직접 테스트

브라우저 개발자 도구 (F12) → Console에서:

```javascript
await api.health();
await api.animation.init({
  width: window.innerWidth,
  height: window.innerHeight,
  devicePixelRatio: window.devicePixelRatio,
  isMobile: window.matchMedia('(max-width: 900px)').matches ? 'true' : 'false'
});
```

---

## 📋 환경 변수 설정

### 백엔드
`backend` 폴더에는 Cloudflare Worker 백엔드가 있습니다.

### 프론트엔드 (.env)
```env
VITE_API_URL=http://localhost:8787
```

---

## 📋 주요 파일 위치

| 파일 | 경로 |
|------|------|
| 백엔드 워커 | `backend/src/index.js` |
| API 서비스 | `src/services/api.js` |
| 프론트엔드 진입점 | `src/main.js` |
| Vite 설정 | `vite.config.js` |
| 프론트엔드 env | `.env` |

---

## 🔗 API 엔드포인트

```
GET    http://localhost:8787/api/health              # 상태 확인
GET    http://localhost:8787/api/animation/init       # 애니메이션 초기값 생성
```

---

## 🛠️ 유용한 명령어

### 빌드
```bash
npm run build  # dist/ 폴더에 최적화된 파일 생성
```

### 배포 (GitHub Pages)
```bash
npm run build
npm run deploy
```

### 의존성 설치
```bash
npm install      # 프론트엔드
cd backend
npm install      # 백엔드
```

---

## 📚 더 알아보기

- [백엔드 가이드](./01_BACKEND_GUIDE.md)
- [프로젝트 구조](./02_PROJECT_STRUCTURE.md)
- [배포 가이드](./04_DEPLOYMENT.md)

---

- ## ✅ 체크리스트
-
- [ ] 백엔드 실행 (`cd backend && npm run dev`)
- [ ] 프론트엔드 실행 (`npm run dev`)
- [ ] http://localhost:5173/rainy/ 접속
- [ ] 콘솔에서 `api.health()` 테스트

---

**이제 개발을 시작할 준비가 완료되었습니다!** 🎉
