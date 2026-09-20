// PM2 configuration for the tanpachi-app sandbox preview.
//
// `vite preview` serves the already-built `dist/` output on port 3000 so the
// sandbox public URL can reach it. Always run `npm run build` before starting
// (preview does not build).
module.exports = {
  apps: [
    {
      name: 'tanpachi-app',
      script: 'npx',
      args: 'vite preview --port 3000 --host 0.0.0.0',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
