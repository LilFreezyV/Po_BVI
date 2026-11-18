import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // host: true — слушаем и IPv4, и IPv6: иначе localhost резолвится в [::1]
  // и часть браузеров/предпросмотров не может достучаться до сервера
  server: { host: true, port: 5173, strictPort: true, open: false },
})
