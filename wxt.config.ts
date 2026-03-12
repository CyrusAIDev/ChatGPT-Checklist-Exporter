import { defineConfig } from 'wxt'
import react from '@vitejs/plugin-react'

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Living Checklist for ChatGPT',
    version: '0.1.0',
    description: 'One living checklist per ChatGPT conversation.',
    action: {
      default_title: 'Open Living Checklist',
    },
    permissions: ['storage', 'sidePanel', 'tabs'],
    host_permissions: ['https://chatgpt.com/*'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    icons: {
      16: '/icon-512.png',
      32: '/icon-512.png',
      48: '/icon-512.png',
      128: '/icon-512.png',
    },
  },
  vite: () => ({
    plugins: [react()],
  }),
})
