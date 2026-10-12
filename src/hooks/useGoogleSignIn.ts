import { useEffect, useRef, useState } from 'react';
import {
  GoogleSignInCancelled,
  preloadGoogleSignIn,
  signInWithGooglePopup,
  type AuthResponse,
  type GoogleSignInStatus,
} from '@/lib/api/auth';

const LABELS: Record<GoogleSignInStatus, string | null> = {
  opening: 'Opening Google…',
  waiting: 'Waiting for Google…',
  idle: null,
  verifying: 'Signing you in…',
};

/**
 * State for a "Continue with Google" button. Preloads Google Sign-In when the form mounts,
 * so the popup opens as soon as the user clicks, and tracks the popup so the button shows
 * progress instead of sitting still.
 */
export function useGoogleSignIn() {
  const [status, setStatus] = useState<GoogleSignInStatus | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    preloadGoogleSignIn();
  }, []);

  /**
   * Call straight from the click handler, before any await. Resolves to null when the
   * attempt was replaced by a newer click, which needs no message.
   */
  const signIn = async (): Promise<AuthResponse | null> => {
    const attempt = ++attemptRef.current;
    const report = (next: GoogleSignInStatus) => {
      if (attemptRef.current === attempt) setStatus(next);
    };

    report('opening');
    try {
      return await signInWithGooglePopup(report);
    } catch (err) {
      if (err instanceof GoogleSignInCancelled) return null;
      throw err;
    } finally {
      if (attemptRef.current === attempt) setStatus(null);
    }
  };

  const busy = status === 'opening' || status === 'waiting' || status === 'verifying';
  return { busy, label: status ? LABELS[status] : null, signIn };
}
