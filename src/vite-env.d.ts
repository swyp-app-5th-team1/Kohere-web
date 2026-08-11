/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 서버 주소. 개발 중에는 빈 값이라 상대주소로 나가고 Vite 프록시가 중계한다. */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
