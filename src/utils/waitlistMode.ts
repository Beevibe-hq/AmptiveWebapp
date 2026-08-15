export const WAITLIST_STORAGE_KEY = 'amptive_preview_access';
export const PREVIEW_ACCESS_CODE = 'amptive_launch';

/**
 * Checks whether the app is currently locked in Waitlist-only mode.
 * Waitlist mode is active unless VITE_WAITLIST_MODE is explicitly set to 'false'
 * OR the user has valid preview access stored in localStorage / query param.
 */
export function isWaitlistModeActive(): boolean {
  // Check if env variable explicitly disabled it
  if (import.meta.env.VITE_WAITLIST_MODE === 'false') {
    return false;
  }

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const previewParam = params.get('preview') || params.get('access');

    // Unlock via query param: ?preview=amptive_launch or ?preview=amptive2026
    if (previewParam === PREVIEW_ACCESS_CODE || previewParam === 'amptive2026' || previewParam === 'granted') {
      localStorage.setItem(WAITLIST_STORAGE_KEY, 'granted');
      return false;
    }

    // Re-lock via query param: ?preview=lock
    if (previewParam === 'lock') {
      localStorage.removeItem(WAITLIST_STORAGE_KEY);
      return true;
    }

    // Check saved session in localStorage
    const isGranted = localStorage.getItem(WAITLIST_STORAGE_KEY) === 'granted';
    if (isGranted) {
      return false;
    }
  }

  // Default: Waitlist mode is active for all public visitors
  return true;
}

export function unlockPreviewAccess(passcode: string): boolean {
  if (passcode.trim() === PREVIEW_ACCESS_CODE || passcode.trim() === 'amptive2026') {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WAITLIST_STORAGE_KEY, 'granted');
    }
    return true;
  }
  return false;
}

export function lockPreviewAccess(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WAITLIST_STORAGE_KEY);
  }
}
