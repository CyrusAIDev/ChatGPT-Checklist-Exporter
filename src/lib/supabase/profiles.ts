import { supabase } from './client'

export type Profile = {
  id: string
  is_pro: boolean
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, is_pro')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Profile
}

// Calls the grant-pro edge function to flip is_pro = true for the current user.
// During testing this happens instantly. When Stripe is connected, the Stripe
// webhook will call the same edge function instead.
export async function grantPro(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not signed in')

  const { error } = await supabase.functions.invoke('grant-pro', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (error) throw new Error(error.message ?? 'Failed to upgrade')
}
