import { createClient } from '@supabase/supabase-js'

const chromeStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const result = await chrome.storage.local.get(`supa_${key}`)
    return (result[`supa_${key}`] as string) ?? null
  },
  async setItem(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [`supa_${key}`]: value })
  },
  async removeItem(key: string): Promise<void> {
    await chrome.storage.local.remove(`supa_${key}`)
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
    },
  },
)
