import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from './supabase'

async function publicFunction<T = any>(name: string, payload: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'No fue posible completar la operación')
  return data as T
}

export async function loginByUsername(username: string, password: string) {
  const data = await publicFunction<any>('login-by-username', { username, password })
  await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
  return data
}

export async function requestPasswordReset(username: string) {
  return publicFunction<{ ok: boolean; message: string }>('request-password-reset', { username })
}

export async function verifyPasswordReset(username: string, token: string, newPassword: string) {
  const data = await publicFunction<any>('verify-password-reset', {
    username,
    token,
    new_password: newPassword,
  })
  if (data.session?.access_token && data.session?.refresh_token) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  }
  return data
}

export async function invokeAuthed<T = any>(name: string, payload: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sesión expirada')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'No fue posible completar la operación')
  return data
}
