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
- **refresh 토큰은 응답 본문에 없다.** `Set-Cookie: refreshToken` (HttpOnly) 으로만 내려오므로
  저장하지도, 읽지도 않는다. 대신 모든 요청이 `credentials: 'include'` 로 나가 브라우저가
  재발급 때 쿠키를 실어 보낸다. 프론트·API 도메인이 다르게 배포되면 서버에
  `Access-Control-Allow-Credentials: true` 와 와일드카드가 아닌 정확한 `Origin` 이 필요하다.
- 로그인 실패 문구는 서버 `message`(영문)가 아니라 `error.code` 로 분기한다
  (`loginErrorMessage`). 401 은 미등록 이메일과 비밀번호 오류를 구분하지 않으므로 문구도
  구분하지 않는다.
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
| 로그인 | 시안대로 구현. `POST /api/v1/auth/login` 연동 완료 |
| ID/PW 찾기 | 시안대로 구현. API 미출시라 경로는 가정값 |
| 회원가입 · 온보딩 · 매물 등록 · 매물 관리 · 관리자 | 라우트만 잡아 둔 자리 표시 |

서버에 아직 없는 API: 이메일 · 비밀번호 **가입**, 이메일 · 비밀번호 찾기, 매물 등록, 사진 업로드.
계정 찾기 경로는 [`src/api/auth.ts`](src/api/auth.ts) 의 `FIND_EMAIL_PATH` ·
`RESET_PASSWORD_PATH` 와 [`src/api/client.ts`](src/api/client.ts) 의 `NO_AUTH_PATHS` 에
가정값으로 들어 있다.

### 로그인 — 백엔드 확정 후 고칠 곳

1. **남은 시도 횟수.** 시안에 "로그인 N회 실패" 모달이 있으나 401 응답에 횟수가 없어 아직
   표시할 수 없다. 서버가 내려주면 `loginErrorMessage` 와 호출부만 고치면 된다.
2. **잠금 기준 횟수.** API 는 5회 연속 실패로 잠기는데 시안은 10회 기준이라 서버를 10회로
   맞추기로 했다. 그래서 잠금 문구에는 횟수를 넣지 않았다.

### 재발급 (`POST /api/v1/auth/reissue`)

웹과 앱이 같은 엔드포인트를 쓴다. 서버가 refresh 를 **쿠키 우선, 없으면 요청 본문** 순으로 읽어서,
웹은 본문 없이 부르고 앱은 종전대로 본문에 담아 보낸다. 본문을 안 보내는 것은 오류가 아니다.

- **응답 채널이 요청 채널을 따른다.** 쿠키로 보냈으면 회전된 refresh 도 `Set-Cookie` 로만 오고
  본문의 `refreshToken` 은 `null` 이다. 웹 코드가 refresh 를 만질 일이 없다.
- **refresh 는 매번 회전되고 이전 토큰은 즉시 무효해진다.** 다시 쓰면 탈취로 간주해 그 사용자의
  **모든 세션이 끊긴다.** 그래서 두 가지가 강제된다 —
  `credentials: 'include'`(새 쿠키를 저장하지 못하면 다음 재발급이 옛 토큰을 재사용한다)와
  `refreshInFlight` 중복 방지(재발급이 겹쳐 돌면 두 번째가 회전된 토큰을 재사용한다).
- 401 `AUTH_INVALID_REFRESH_TOKEN` 은 만료 · 위조 · 무효화 · 재사용 탐지를 구분하지 않는다.
  어느 쪽이든 세션을 정리하고 로그인 화면으로 보낸다.

### 로그아웃 (`POST /api/v1/auth/logout`)

refresh 를 읽는 규칙은 재발급과 같아 웹은 본문 없이 부른다. 쿠키로 보낸 요청에는 `Max-Age=0`
삭제 쿠키가 함께 내려와 브라우저의 refresh 도 지워진다. 이미 무효한 토큰이어도 204 라 멱등하다.
재발급과 다른 점 두 가지가 중요하다.

- **인증이 필요하다** (`Authorization: Bearer <accessToken>`, `ACTIVE` 회원). 재발급은 인증이
  불필요했지만 로그아웃은 아니다 — `NO_AUTH_PATHS` 에 넣으면 안 된다.
- **access 토큰은 무효화되지 않는다.** 남은 만료 시간까지 그대로 API 가 호출되므로 클라이언트가
  직접 지워야 한다. 그래서 `logout` 은 호출이 실패해도 `clearTokens` 를 건너뛰지 않는다 —
  막아버리면 로그아웃을 눌렀는데 로그인 상태로 남는다.
