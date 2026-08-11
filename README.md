# Kohere Web

임대인이 매물을 등록하는 웹. Kohere iOS 앱은 임차인(외국인)용이고, 임대인은 앱을 설치하지 않고도
매물을 올릴 수 있어야 해서 별도 웹으로 만든다.

API 서버는 [Kohere-backend](https://github.com/swyp-app-5th-team1/Kohere-backend) 를 그대로 쓴다.

## 기술 스택

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router v7

빌드 결과물은 **정적 파일**이다. 별도 서버 프로세스가 필요 없다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
```

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 타입 검사 후 `dist/` 에 정적 파일 생성 |
| `npm run preview` | 빌드 결과물을 로컬에서 확인 |
| `npm run lint` | oxlint |

Node 는 `^20.19.0 || >=22.12.0` 가 필요하다 (`.nvmrc` 참고).

## 배포

`npm run build` → **`dist/` 폴더**가 전부다. 이 안의 파일을 정적으로 서빙하면 된다.

서버 쪽에 두 가지가 필요하다.

1. **SPA fallback** — 화면 전환을 자바스크립트가 처리하는 구조라 `/signup` 같은 경로에 대응하는
   파일이 서버에 없다. 존재하지 않는 경로는 `index.html` 로 응답해야 새로고침 시 404 가 나지 않는다.
   Caddy 기준으로는 `try_files {path} /index.html` 한 줄이다.
2. **API 와 도메인이 다르면 CORS 설정** — 같은 도메인 하위 경로로 서빙하면 필요 없다.

## API 연동

- 모든 응답은 `{ success, data, error }` 봉투로 감싸져 온다. [`src/api/client.ts`](src/api/client.ts) 가
  이를 벗겨 `data` 만 돌려주고, 실패하면 `ApiError` 를 던진다.
- 인증은 `Authorization: Bearer <accessToken>`. 401 을 받으면 `/auth/reissue` 로 재발급 후
  원 요청을 한 번만 재시도한다. 동시에 여러 요청이 401 이어도 재발급은 한 번만 돈다.
- 개발 중에는 `VITE_API_BASE_URL` 이 비어 있어 `/api/...` 상대주소로 나가고,
  Vite 프록시([`vite.config.ts`](vite.config.ts))가 개발 서버로 중계한다. 그래서 로컬에서 CORS 가 생기지 않는다.

### 환경 변수

| 파일 | `VITE_API_BASE_URL` |
| --- | --- |
| `.env.development` | 비움 (상대주소 → Vite 프록시) |
| `.env.production` | `https://dev.kohere.app` |

같은 도메인 하위로 배포하기로 정해지면 `.env.production` 도 비우고
`vite.config.ts` 에 `base` 를 지정한다.

## 구현 현황

| 화면 | 상태 |
| --- | --- |
| 로그인 | 시안대로 구현. API 경로는 서버 구현 후 확정 |
| 회원가입 · 온보딩 · 매물 등록 · 매물 관리 · 관리자 | 라우트만 잡아 둔 자리 표시 |

서버에 아직 없는 API: 이메일 · 비밀번호 가입/로그인, 매물 등록, 사진 업로드.
로그인 경로는 [`src/api/auth.ts`](src/api/auth.ts) 의 `LOGIN_PATH` 와
[`src/api/client.ts`](src/api/client.ts) 의 `NO_AUTH_PATHS` 두 곳에 가정값으로 들어 있다.
