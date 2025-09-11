export type VerifyOtpResponse = { success: boolean; message?: string };
export type ResendOtpResponse = { success: boolean; message?: string };

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  if (!res.ok) {
    return { success: false, message: 'Verification failed. Please try again.' };
  }
  return res.json();
}

export async function resendOtp(email: string): Promise<ResendOtpResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    return { success: false, message: 'Failed to resend code. Please try again.' };
  }
  return res.json();
}

export async function isVerified(email: string): Promise<{ verified: boolean }> {
  const res = await fetch(`${BACKEND_URL}/auth/is-verified`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) return { verified: false };
  return res.json();
}

export async function stashSignup(email: string, password: string): Promise<{ ok: boolean; token?: string; ttlSeconds?: number; message?: string }> {
  const res = await fetch(`${BACKEND_URL}/auth/stash-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) return { ok: false, message: 'Failed to prepare secure sign-in.' };
  return res.json();
}

export async function consumeSignup(token: string): Promise<{ ok: boolean; email?: string; password?: string; message?: string }> {
  const res = await fetch(`${BACKEND_URL}/auth/consume-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  if (!res.ok) return { ok: false, message: 'Token invalid or expired.' };
  return res.json();
}
