export type CheckEmailResponse = { exists: boolean };

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function checkEmailExists(email: string): Promise<CheckEmailResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/check-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  if (!res.ok) {
    // Surface a generic non-blocking error; caller can decide UX
    throw new Error('Failed to check email');
  }

  const data = (await res.json()) as CheckEmailResponse;
  return data;
}
