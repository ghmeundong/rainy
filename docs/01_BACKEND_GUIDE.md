 # 🔧 Cloudflare Workers 백엔드 가이드

 이 문서는 `Rainy` 애플리케이션의 Cloudflare Workers 백엔드 API 사용법을 설명합니다.

 ---

 ## 🚀 현재 상태

 ✅ **Cloudflare Workers 백엔드 준비 완료**
 - 로컬 개발 서버 실행 중 (`http://localhost:8787`)
 - `backend/src/index.js`에서 애니메이션 초기값을 생성
 - 프론트엔드가 `/api/animation/init`을 호출하여 초기값을 사용

 ---

 ## 🔗 API 엔드포인트

 기본 URL
 ```
 http://localhost:8787
 ```

 | 메서드 | 경로 | 설명 |
 |--------|------|------|
 | GET | `/api/health` | 서버 상태 확인 |
 | GET | `/api/animation/init` | 애니메이션 초기값 생성 |

 ---

 ## 🧪 API 테스트

 ### 1. 헬스 체크
 ```bash
 curl http://localhost:8787/api/health
 ```

 ### 2. 애니메이션 초기값 생성
 ```bash
 curl "http://localhost:8787/api/animation/init?width=1200&height=700&devicePixelRatio=1&isMobile=false"
 ```

 ### 3. 브라우저 콘솔 테스트
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

 ## 📁 프로젝트 구조

 ```
 rainy/
 ├── backend/                    # Cloudflare Workers 백엔드
 │   ├── src/
 │   │   └── index.js            # Worker 엔트리포인트
 │   ├── package.json
 │   └── wrangler.toml           # Cloudflare Workers 구성
 └── src/                        # 프론트엔드
 ```

 ---

 ## 🚀 개발 서버 실행

 ### 터미널 1: 백엔드 (포트 8787)
 ```bash
 cd backend
 npm install
 npm run dev
 ```

 ### 터미널 2: 프론트엔드 (포트 5173)
 ```bash
 npm install
 npm run dev
 ```

 ---

 ## 📋 환경 변수 설정

 백엔드에는 별도 `.env`가 필요하지 않습니다.

 프론트엔드 `.env`
 ```env
 VITE_API_URL=http://localhost:8787
 ```

 ---

 ## 🔒 CORS

 백엔드가 모든 출처에서 접근 가능하도록 CORS 헤더를 반환합니다. 프로덕션에서는 필요한 도메인만 허용하도록 수정하세요.

 ---

 ## ✅ 체크리스트

 - [ ] `cd backend && npm run dev`로 백엔드 실행
 - [ ] `npm run dev`로 프론트엔드 실행
 - [ ] `await api.health()` 호출 확인
 - [ ] `await api.animation.init(...)` 호출 확인
---

## 🐛 트러블슈팅

- **백엔드가 시작되지 않는 경우**: `backend` 폴더에서 `npm install` 후 `npm run dev` 실행
- **프론트엔드가 올바른 API로 연결되지 않는 경우**: 루트 `.env`에서 `VITE_API_URL=http://localhost:8787` 확인
- **CORS 오류가 발생하는 경우**: 프론트엔드에서 호출한 도메인이 `http://localhost:8787`인지 확인

---

## 📚 참고 자료

- [Cloudflare Workers 공식 문서](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler)

