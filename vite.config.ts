import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 개발 중에는 /api 로 시작하는 요청을 dev 서버로 중계한다.
    // 브라우저 입장에서는 localhost:5173 으로만 요청하는 셈이라 CORS 가 발생하지 않는다.
    // 이 설정은 빌드 결과물에 포함되지 않는다.
    proxy: {
      '/api': {
        target: 'https://dev.kohere.app',
        changeOrigin: true,
      },
    },
  },
})
