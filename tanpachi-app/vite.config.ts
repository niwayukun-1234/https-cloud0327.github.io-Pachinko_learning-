import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  // `vite preview`(動作確認用)はサンドボックスの公開URL等、任意のホストから
  // アクセスできるようにする。本番のビルド成果物には影響しない。
  preview: {
    allowedHosts: true,
  },
})
