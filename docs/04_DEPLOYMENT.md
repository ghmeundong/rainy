# 📦 배포 가이드

완성된 프로젝트를 프로덕션 환경에 배포하는 방법입니다.

---

## 🚀 배포 옵션

### 1️⃣ GitHub Pages (프론트엔드)

#### 자동 배포
```bash
npm run build
npm run deploy
```

#### 수동 배포
1. `npm run build` 실행
2. GitHub 리포지토리 → Settings → Pages
3. Source: `gh-pages` branch 선택
4. 저장 후 2~3분 대기

배포 URL: `https://your-username.github.io/rainy/`

---

### 2️⃣ Cloudflare Workers 백엔드 배포

#### Cloudflare Workers

1. [Cloudflare](https://dash.cloudflare.com)에 로그인
2. 새 Workers 서비스 생성
3. `backend/wrangler.toml`을 사용하여 Worker 배포
4. 환경 변수를 필요하면 Cloudflare Dashboard에서 설정

#### 배포 명령
```bash
cd backend
npm run deploy -- --env production
```

배포 URL: `https://<your-worker-url>.workers.dev`

---

### 3️⃣ 환경 변수 설정

#### 프로덕션 Frontend
```.env.production
VITE_API_URL=https://<your-worker-url>.workers.dev
```

---

## ✅ 배포 체크리스트

- [ ] 로컬에서 테스트 완료
- [ ] `.env` 파일 민감 정보 제거
- [ ] `npm run build` 성공
- [ ] 백엔드 환경 변수 설정
- [ ] 프론트엔드 API URL 업데이트
- [ ] GitHub Pages 배포
- [ ] 백엔드 배포 (Cloudflare Workers)
- [ ] 프로덕션 환경 테스트
- [ ] 프론트엔드 `VITE_API_URL` 업데이트

## 🔒 보안 설정

1. **환경 변수**: 프로덕션 플랫폼의 환경 변수 설정에서만 관리
2. **CORS**: 필요시 프로덕션 도메인만 허용하도록 수정
3. **API 인증**: JWT 토큰 추가 검토
4. **HTTPS**: 모든 배포 플랫폼이 자동으로 제공

---

## 📝 배포 후 확인

```bash
# 프로덕션 URL에서 테스트
curl https://your-backend-url.com/api/health
```

응답:
```json
{
  "status": "ok",
  "timestamp": "2026-06-17...",
  "environment": "production"
}
```

---

## 🔄 업데이트 배포

### 프론트엔드
```bash
npm run build
npm run deploy
```

### 백엔드
```bash
cd backend
npm run deploy -- --env production
```

---

## 🐛 트러블슈팅

### GitHub Pages에서 API 호출 실패
- `.env.production` 파일 확인
- `npm run build` 후 `dist/index.html` 확인

- 환경 변수 설정 확인
- Cloudflare Worker 배포 URL과 `VITE_API_URL` 일치 여부 확인
- 서버 로그 확인

### CORS 오류
- 프론트엔드 도메인이 백엔드 CORS 화이트리스트에 포함되어 있는지 확인

---

## 📚 참고 자료

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler)
- [GitHub Pages 가이드](https://pages.github.com/)
