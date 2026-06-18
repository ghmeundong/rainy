# 📁 프로젝트 디렉토리 구조 (Vite 권장)

```
rainy/
│
├── 📄 index.html              ← Vite entry point
├── 📄 package.json
├── 📄 vite.config.js
├── 📄 .env
├── 📄 .env.example
├── 📄 .gitignore
│
├── 📂 src/                    ← 프론트엔드 소스 코드
│   ├── 📄 main.js
│   ├── 📄 style.css
│   │
│   ├── 📂 services/
│   │   └── 📄 api.js          ← 백엔드 API 호출
│   │
│   ├── 📂 components/         ← UI 컴포넌트 (미래 확장)
│   └── 📂 utils/              ← 헬퍼 함수 (미래 확장)
│
├── 📂 public/                 ← 정적 자산
│   └── 📂 img/
│
├── 📂 backend/                ← Cloudflare Workers 백엔드
│   ├── 📂 src/
│   │   └── 📄 server.js
│   ├── 📄 package.json
│   ├── 📄 .env.local
│   └── 📄 .env.example
│
├── 📂 dist/                   ← 빌드 출력
├── 📂 docs/                   ← 문서
│   ├── 01_BACKEND_GUIDE.md
│   ├── 02_PROJECT_STRUCTURE.md
│   ├── 03_QUICKSTART.md
│   └── 04_DEPLOYMENT.md
│
├── 📄 README.md
└── 📄 .gitignore
```

---

## 📋 각 폴더 설명

### `src/` - 프론트엔드 소스 코드
- **main.js**: 앱 진입점 (jQuery, Three.js, RainyDay 초기화)
- **style.css**: 전역 스타일
- **services/api.js**: 백엔드 통신 API
- **components/**: 재사용 가능한 UI 컴포넌트
- **utils/**: 헬퍼/유틸리티 함수

### `public/` - 정적 자산
Vite가 번들링하지 않는 파일들 (이미지, 폰트 등)

### `backend/` - Cloudflare Worker 백엔드
Cloudflare Workers로 애니메이션 초기값을 계산하는 서버리스 API

### `docs/` - 문서
모든 마크다운 문서를 여기에 관리

---

## 🚀 개발 방법

### 터미널 1: 백엔드
```bash
cd backend
npm run dev
# localhost:8787에서 실행
```

### 터미널 2: 프론트엔드
```bash
npm run dev
# localhost:5173에서 실행
```

---

## 🔗 Import 사용 예시

Vite alias를 사용한 깔끔한 import:

```javascript
// 절대 경로 import (권장)
import { api } from '@services/api.js'
import { helpers } from '@utils/helpers.js'

// 상대 경로 import (작동하지만 덜 권장)
import { api } from './services/api.js'
```

---

## ✅ Vite 권장 사항 체크

- ✅ `index.html` 루트 위치
- ✅ `src/` 폴더 중심 구조
- ✅ `public/` 정적 자산
- ✅ `vite.config.js` 설정
- ✅ 환경 변수 분리 (.env, .env.example)
- ✅ 백엔드 독립 프로젝트
- ✅ `docs/` 문서 관리

---

## 📝 파일 추가 시 위치

| 종류 | 위치 |
|------|------|
| API 함수 | `src/services/` |
| UI 컴포넌트 | `src/components/` |
| 헬퍼 함수 | `src/utils/` |
| 이미지 | `public/img/` |
| 전역 스타일 | `src/style.css` |
| 컴포넌트 스타일 | `src/components/*.css` |

---

## 🎯 향후 확장 예시

```
src/
├── main.js
├── style.css
├── services/
│   ├── api.js          (완성)
│   ├── auth.js         (추가 가능)
│   └── storage.js      (추가 가능)
├── components/
│   ├── Gallery.js      (추가 가능)
│   ├── PhotoCard.js    (추가 가능)
│   └── Modal.js        (추가 가능)
└── utils/
    ├── helpers.js      (추가 가능)
    └── validators.js   (추가 가능)
```
