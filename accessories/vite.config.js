import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The demo imports the dog from ../mascot without copying it.
// dedupe: ../mascot's files use React from this folder's node_modules (one React on the page).
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { fs: { allow: ['..'] } }
});
