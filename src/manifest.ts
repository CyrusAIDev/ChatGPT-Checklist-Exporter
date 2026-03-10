import type { Manifest } from 'webextension-polyfill'
import pkg from '../package.json'
import { IS_DEV, PORT } from '../scripts/utils'

export async function getManifest(): Promise<Manifest.WebExtensionManifest> {
  // update this file to update this manifest.json
  // can also be conditional based on your need

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: 'ChatGPT Checklist Exporter',
    version: pkg.version,
    description: 'Turn ChatGPT plans into a Google Sheets checklist.',
    action: {
      default_icon: './assets/icon-512.png',
      default_popup: './popup/index.html'
    },
    options_ui: {
      page: './options/index.html',
      open_in_tab: true
    },
    background: {
      service_worker: 'background.js'
    },
    content_scripts: [
      {
        matches: ['https://chatgpt.com/*'],
        js: ['./content/index.global.js']
      }
    ],
    icons: {
      16: './assets/icon-512.png',
      48: './assets/icon-512.png',
      128: './assets/icon-512.png'
    },
    permissions: ['storage', 'identity', 'scripting'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://sheets.googleapis.com/*'
    ],
    oauth2: {
      client_id:
        '361235602045-fmp9tt7qa980m7eo0taotb8ql40dgplq.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'"
    }
  }

  if (IS_DEV) {
    // this is required on dev for Vite script to load
    manifest.content_security_policy = {
      extension_pages: `script-src 'self' http://localhost:${PORT}; object-src 'self'`
    }
  }

  return manifest
}
