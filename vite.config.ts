import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS=1 npm run dev → self-signed cert for LAN phone testing
// (getUserMedia requires a secure context outside localhost).
export default defineConfig({
  base: './',
  plugins: [react(), ...(process.env.HTTPS ? [basicSsl()] : [])],
  server: { host: true },
})
