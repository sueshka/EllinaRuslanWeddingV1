import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // music files in src/assets/misc have upper-case extensions
  assetsInclude: ['**/*.MP3'],
})
