const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function completeProfile(
  email: string,
  fullName: string,
  username: string,
  options?: { dob?: string; avatarDataUrl?: string; avatarStyle?: 'emoji'; avatarEmoji?: string; avatarBg?: string }
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${BACKEND_URL}/auth/complete-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fullName, username, ...(options || {}) }),
  });
  if (!res.ok) {
    try {
      const data = await res.json();
      return { ok: false, message: data?.message || 'Failed to complete profile' };
    } catch {
      return { ok: false, message: 'Failed to complete profile' };
    }
  }
  return res.json();
}

export async function checkUsername(username: string): Promise<{ available: boolean; invalid?: boolean; message?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/check-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) return { available: false, message: data?.message || 'Failed to check username' };
    return data;
  } catch {
    return { available: false, message: 'Failed to check username' };
  }
}
