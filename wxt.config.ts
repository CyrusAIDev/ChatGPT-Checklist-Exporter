import { defineConfig } from 'wxt'
import react from '@vitejs/plugin-react'

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Living Checklist for ChatGPT',
    version: '1.0.0',
    description: 'One living checklist per ChatGPT conversation.',
    action: {
      default_title: 'Open Living Checklist',
      default_icon: {
        16: '/icon-16.png',
        32: '/icon-32.png',
        48: '/icon-48.png',
        128: '/icon-128.png',
      },
    },
    permissions: ['storage', 'sidePanel', 'tabs'],
    host_permissions: ['https://chatgpt.com/*', 'https://claude.ai/*'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    icons: {
      16: '/icon-16.png',
      32: '/icon-32.png',
      48: '/icon-48.png',
      128: '/icon-128.png',
    },
  },
  vite: () => ({
    plugins: [react()],
  }),
})
