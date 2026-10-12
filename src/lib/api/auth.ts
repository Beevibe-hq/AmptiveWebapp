import { api } from './client';
import { normalizeUserProfile } from './profiles';
import { $auth, $users } from './services';
import type { LoginRequest, RegisterRequest, SetPinRequest, UserProfile } from './services';

function decodeTokenExpiry(token: string): number | undefined {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return undefined;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp - now;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export interface UserResponse {
  status: boolean;
  status_code: number;
  message: string;
  data: UserProfile | null;
}

export interface LoginResponse {
  user: UserProfile | null;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  status: boolean;
  status_code?: number;
  message?: string;
  data?: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    user: UserProfile | null;
  };
  error?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface RegisterOptions {
  username?: string;
  dob?: string;
  name?: string;
  phone_number?: string;
  profile_picture?: string;
}

export interface AuthResponse {
  status: boolean;
  message?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    user?: UserProfile;
  };
  user?: UserProfile;
  access_token?: string;
  refresh_token?: string;
  error?: string;
}



function unsupportedAuthResponse(message: string): AuthResponse {
  return {
    status: false,
    message,
    error: message,
  };
}

export async function login(email: string, password: string, phoneNumber?: string): Promise<LoginResponse> {
  try {
    const loginData: LoginRequest = { password };
    if (phoneNumber) {
      loginData.phone_number = phoneNumber;
    } else if (email) {
      loginData.email = email;
    }

    const response = await $auth.login(loginData);

    const user = normalizeUserProfile(response.user);
    if (!user) {
      throw new Error('Login response did not include a valid user profile.');
    }

    const expiresIn = decodeTokenExpiry(response.access_token);
    const tokenExpiry = expiresIn ?? 86400;
    api.setSessionTokens(response.access_token, response.refresh_token, tokenExpiry);

    return {
      user,
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      status: true,
      message: 'Login successful',
      data: {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user,
      },
    };
  } catch (error: any) {
    return {
      user: null,
      access_token: '',
      refresh_token: '',
      status: false,
      message: error.message,
      error: error.message,
    };
  }
}

export async function register(email: string, password: string, options?: RegisterOptions): Promise<any> {
  try {
    const registerData: RegisterRequest = {
      email,
      password,
      username: options?.username!,
      dob: options?.dob!,
      name: options?.name,
      phone_number: options?.phone_number,
      profile_picture: options?.profile_picture,
    };
    const response = await $auth.register(registerData) as unknown as { user: UserProfile; access_token: string; refresh_token: string };
    const user = response.user;
    const accessToken = response.access_token;
    const refreshToken = response.refresh_token;

    if (accessToken) {
      const expiresIn = 86400;
      api.setSessionTokens(accessToken, refreshToken ?? '', expiresIn);
    }

    return {
      status: true,
      message: 'Registered successfully',
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  } catch (error: any) {
    return unsupportedAuthResponse(error.message);
  }
}

export const signUpWithEmail = register;

export async function signOut(): Promise<void> {
  await logout();
}

export async function signOutSilent(): Promise<{ error: null }> {
  api.clearSessionTokens();
  return { error: null };
}

export async function logout(): Promise<void> {
  api.clearSessionTokens();
  localStorage.removeItem('amptive.auth');
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = api.getToken();
  if (!token) return null;

  try {
    const response = await $users.getCurrent();
    return normalizeUserProfile(response);
  } catch {
    api.clearSessionTokens();
    return null;
  }
}

export async function getSession(): Promise<{ user: UserProfile | null; token: string | null }> {
  const token = api.getToken();
  if (!token) return { user: null, token: null };

  try {
    const response = await $users.getCurrent();
    return { user: normalizeUserProfile(response), token };
  } catch (error: any) {
    const errorStr = String(error);
    if (errorStr.includes('401') || errorStr.includes('unauthorized') || errorStr.includes('Invalid login') || errorStr.includes('Token expired')) {
      api.clearSessionTokens();
      return { user: null, token: null };
    }
    console.warn('Session fetch error (non-auth):', error);
    return { user: null, token };
  }
}

export async function refreshSession(): Promise<AuthResponse> {
  const refreshToken = api.getRefreshToken();
  if (!refreshToken) {
    return unsupportedAuthResponse('No refresh token available.');
  }

  try {
    const response = await $auth.refresh({ refresh_token: refreshToken });

    api.setSessionTokens(response.access_token, response.refresh_token);

    return {
      status: true,
      message: 'Session refreshed',
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      data: {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      },
    };
  } catch (error: any) {
    api.clearSessionTokens();
    return unsupportedAuthResponse(error.message);
  }
}

export async function setWalletPin(data: SetPinRequest): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await $auth.setPin(data);
    return {
      ok: response.status === true,
      message: response.message || 'Wallet setup complete',
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error.message || 'Could not set wallet PIN.',
    };
  }
}

// ---------------------------------------------------------------------------
// Google Sign-In via Google Identity Services (client-side token flow)
// ---------------------------------------------------------------------------
// TODO(security): Token storage currently uses localStorage (consistent with
// the existing auth pattern in this codebase). Migrate to HttpOnly cookies
// set by the backend for improved XSS resilience when the backend supports it.

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let gisLoadPromise: Promise<void> | null = null;

/** Dynamically load the Google Identity Services script (idempotent, retries after a failure). */
function loadGoogleScript(): Promise<void> {
  if (typeof (window as any).google?.accounts?.id !== 'undefined') return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Drop the failed tag and the cached promise. Otherwise the next attempt waits on
      // load/error events that already fired, and the button hangs with no way back.
      script.remove();
      gisLoadPromise = null;
      reject(new Error('Failed to load Google Identity Services.'));
    };
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

/** Rejection reason for an attempt that was replaced by a newer click or abandoned. Not shown to users. */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in was cancelled.');
    this.name = 'GoogleSignInCancelled';
  }
}

/**
 * Where the popup flow is, so the button can say so:
 * - opening:   clicked, waiting for Google's window to appear
 * - waiting:   Google's window is open (this window lost focus)
 * - idle:      the user came back without signing in (closed the window, or it never opened)
 * - verifying: Google returned a credential and we're exchanging it with the backend
 */
export type GoogleSignInStatus = 'opening' | 'waiting' | 'idle' | 'verifying';

type PendingCredential = { resolve: (credential: string) => void; reject: (err: Error) => void };

let pendingCredential: PendingCredential | null = null;
let hiddenButtonContainer: HTMLDivElement | null = null;

/**
 * Initialize GIS and render Google's button off-screen, once. Returns the clickable element,
 * or null if the script isn't loaded yet. Synchronous, so it can run inside a click handler.
 */
function getHiddenGoogleButton(): HTMLElement | null {
  const google = (window as any).google;
  if (!google?.accounts?.id || !GOOGLE_CLIENT_ID) return null;

  if (!hiddenButtonContainer || !document.body.contains(hiddenButtonContainer)) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      // Registered once for the page; routes each credential to whichever attempt is waiting.
      callback: (response: { credential?: string; error?: string }) => {
        const pending = pendingCredential;
        pendingCredential = null;
        if (!pending) return;
        if (response.credential) {
          pending.resolve(response.credential);
        } else {
          pending.reject(new Error(response.error || 'Google authentication was cancelled.'));
        }
      },
    });

    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    google.accounts.id.renderButton(container, { type: 'standard', size: 'large' });
    hiddenButtonContainer = container;
  }

  return hiddenButtonContainer.querySelector('div[role="button"]') as HTMLElement | null;
}

/**
 * Fetch and set up Google Sign-In ahead of the click. Call it when a sign-in form mounts:
 * the popup then opens the instant the user clicks, and the click happens while the browser
 * still counts it as user-initiated, so the popup isn't blocked.
 */
export function preloadGoogleSignIn(): void {
  if (!GOOGLE_CLIENT_ID) return;
  loadGoogleScript()
    .then(() => getHiddenGoogleButton())
    .catch(() => {
      // Retried on click.
    });
}

/** Click Google's button and wait for its credential, reporting progress through onStatus. */
function requestGoogleCredential(onStatus?: (status: GoogleSignInStatus) => void): Promise<string> {
  // A new click replaces any attempt still waiting (e.g. one whose window was closed).
  pendingCredential?.reject(new GoogleSignInCancelled());
  pendingCredential = null;

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let returnTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      settled = true;
      if (pendingCredential === attempt) pendingCredential = null;
      clearTimeout(openTimer);
      clearTimeout(returnTimer);
      clearTimeout(expiryTimer);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onVisibility);
    };

    const attempt: PendingCredential = {
      resolve: (credential) => {
        finish();
        resolve(credential);
      },
      reject: (err) => {
        finish();
        reject(err);
      },
    };
    pendingCredential = attempt;

    /*
     * GIS reports nothing when its window is closed, so focus is the only signal. Coming
     * back without a credential only resets the button; the attempt stays alive, so a
     * credential that arrives afterwards (the user clicked back here mid-sign-in, then
     * finished) still completes the login.
     */
    const onLeave = () => {
      if (settled) return;
      clearTimeout(openTimer);
      clearTimeout(returnTimer);
      onStatus?.('waiting');
    };
    const onReturn = () => {
      if (settled) return;
      clearTimeout(returnTimer);
      // The credential is posted just before Google's window closes; give it a moment.
      returnTimer = setTimeout(() => {
        if (!settled) onStatus?.('idle');
      }, 1500);
    };
    const onVisibility = () => (document.hidden ? onLeave() : onReturn());

    window.addEventListener('blur', onLeave);
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onVisibility);

    // Stop holding the attempt after a generous window; nobody is mid-sign-in after this.
    expiryTimer = setTimeout(() => attempt.reject(new GoogleSignInCancelled()), 5 * 60 * 1000);

    const open = (button: HTMLElement | null) => {
      if (settled) return;
      if (button) {
        button.click();
      } else {
        /*
         * Fall back to One Tap, which returns an ID token through the same callback.
         *
         * The OAuth token client is deliberately not used here. It yields an *access*
         * token — an opaque bearer credential for calling Google's APIs — where the
         * backend expects a signed identity assertion it can verify. Sending one is
         * indistinguishable from a valid request on the wire and comes back as a flat
         * 400 "Social authentication failed."
         */
        try {
          (window as any).google.accounts.id.prompt();
        } catch {
          attempt.reject(new Error('Could not open Google Sign-In.'));
          return;
        }
      }
      // If Google's window never takes focus (popup blocked, or opened too long after the
      // click), stop the spinner so the user can try again.
      openTimer = setTimeout(() => {
        if (!settled) onStatus?.('idle');
      }, 4000);
    };

    // Preloaded: click now, inside the user's click, so the popup opens immediately.
    const button = getHiddenGoogleButton();
    if (button) {
      open(button);
      return;
    }

    // Not preloaded (slow connection or a failed preload): load, then open.
    loadGoogleScript()
      .then(() => open(getHiddenGoogleButton()))
      .catch(() => {
        attempt.reject(new Error('Could not load Google Sign-In. Check your connection and try again.'));
      });
  });
}

/**
 * Legacy redirect-based Google sign-in (kept as fallback).
 * Redirects the browser to the backend's OAuth initiation endpoint.
 */
export function signInWithGoogle(): void {
  const backendUrl = import.meta.env.VITE_API_URL || '/api/v1';
  window.location.href = `${backendUrl}/auth/google`;
}

/**
 * Client-side Google Sign-In via popup.
 * 1. Opens Google's account chooser (loading Google Identity Services first if needed)
 * 2. Sends the credential (ID token) to the backend for verification
 * 3. Stores session tokens and returns the authenticated user
 *
 * Call it directly from the click handler, before any await: the popup has to open while the
 * browser still treats the click as user-initiated. Throws GoogleSignInCancelled when a newer
 * attempt replaces this one; callers should ignore that rather than show an error.
 */
export async function signInWithGooglePopup(
  onStatus?: (status: GoogleSignInStatus) => void
): Promise<AuthResponse> {
  if (!GOOGLE_CLIENT_ID) {
    return unsupportedAuthResponse('Google Sign-In is not configured. Missing VITE_GOOGLE_CLIENT_ID.');
  }

  let credential: string;
  try {
    credential = await requestGoogleCredential(onStatus);
  } catch (err: any) {
    if (err instanceof GoogleSignInCancelled) throw err;
    return unsupportedAuthResponse(err?.message || 'Google authentication failed.');
  }
  onStatus?.('verifying');

  /*
   * An ID token is a JWT: three dot-separated base64 segments. Checking the shape here
   * turns "wrong kind of Google credential" into a message that says so, instead of the
   * backend's opaque 400 — the two failures are otherwise identical from the console.
   */
  if (credential.split('.').length !== 3) {
    return unsupportedAuthResponse(
      'Google returned an unexpected credential type. Please try signing in again.'
    );
  }

  // TEMPORARY DIAGNOSTIC — remove once social login is working.
  // Prints only the token's public claims (never the signature or any personal fields),
  // so we can see which Google client the credential was issued for. The backend rejects
  // a token whose `aud` doesn't match its own configured client ID, and that failure is
  // indistinguishable from a wrong token type in the console.
  try {
    const claims = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    console.log('[google-signin] token diagnostic', {
      segments: credential.split('.').length,
      aud: claims.aud,
      azp: claims.azp,
      iss: claims.iss,
      expired: typeof claims.exp === 'number' ? claims.exp * 1000 < Date.now() : 'unknown',
      frontendClientId: GOOGLE_CLIENT_ID,
      audMatchesFrontend: claims.aud === GOOGLE_CLIENT_ID,
    });
  } catch {
    console.log('[google-signin] token diagnostic: credential is not a decodable JWT', {
      segments: credential.split('.').length,
      startsWith: credential.slice(0, 6),
    });
  }

  // Send the Google credential to the backend social login endpoint
  try {
    const response = await api.post<any>(
      '/auth/social/login',
      { provider: 'google', token: credential },
      { skipAuth: true }
    );

    if (response?.access_token) {
      const expiresIn = response.expires_in ?? 86400;
      api.setSessionTokens(response.access_token, response.refresh_token || '', expiresIn);
    } else {
      return unsupportedAuthResponse('Backend did not return a valid session.');
    }

    const user = response?.user ? normalizeUserProfile(response.user) : await getCurrentUser();

    return {
      status: true,
      message: 'Google login successful',
      access_token: response?.access_token,
      refresh_token: response?.refresh_token,
      user: user || undefined,
      is_new_user: Boolean(response?.is_new_user),
      requires_profile_completion: Boolean(response?.requires_profile_completion),
      data: {
        access_token: response?.access_token,
        refresh_token: response?.refresh_token,
        user: user || undefined,
        is_new_user: response?.is_new_user,
        requires_profile_completion: response?.requires_profile_completion,
      },
    };
  } catch (err: any) {
    // fetch's network failure: "Failed to fetch" (Chrome), "Load failed" (Safari), "NetworkError…" (Firefox).
    if (err instanceof TypeError && /failed to fetch|load failed|networkerror/i.test(err.message)) {
      return unsupportedAuthResponse("Couldn't reach Amptive. Check your connection and try again.");
    }
    return unsupportedAuthResponse(err?.message || 'Google authentication failed.');
  }
}

export async function completeSocialProfile(payload: { username?: string; dob?: string; profile_picture?: string }): Promise<AuthResponse> {
  try {
    const response = await api.post<any>('/auth/social/complete', payload);
    return {
      status: true,
      message: 'Profile completed successfully',
      data: response,
    };
  } catch (err: any) {
    return unsupportedAuthResponse(err?.message || 'Failed to complete social profile.');
  }
}

async function generatePkceChallenge(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  const codeVerifier = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);

  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { codeVerifier, codeChallenge: base64Digest };
}

/**
 * Initiates X (Twitter) OAuth 2.0 PKCE login flow.
 * Redirects user to Twitter's authorization page.
 */
export async function signInWithX(): Promise<void> {
  const clientId = import.meta.env.VITE_X_CLIENT_ID || import.meta.env.VITE_TWITTER_CLIENT_ID;
  if (!clientId) {
    throw new Error('X (Twitter) Sign-In is not configured. Missing VITE_X_CLIENT_ID in .env.local.');
  }

  const { codeVerifier, codeChallenge } = await generatePkceChallenge();
  const state = Math.random().toString(36).substring(2, 15);

  sessionStorage.setItem('x_oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('x_oauth_state', state);

  const redirectUri = `${window.location.origin}/auth/callback`;
  const scope = 'tweet.read users.read offline.access';

  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  window.location.href = authUrl;
}

/**
 * Initiates Facebook OAuth login flow.
 * Redirects user to Facebook's authorization page.
 */
export async function signInWithFacebook(): Promise<void> {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID || import.meta.env.VITE_FB_APP_ID;
  if (!appId) {
    throw new Error('Facebook Sign-In is not configured. Missing VITE_FACEBOOK_APP_ID in .env.local.');
  }

  const redirectUri = `${window.location.origin}/auth/callback?provider=facebook`;
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile&response_type=token`;

  window.location.href = authUrl;
}

/**
 * Exchange X (Twitter) authorization code for an access token using PKCE.
 * This runs on the frontend since the backend only accepts access tokens.
 */
async function exchangeXCodeForToken(code: string): Promise<string> {
  const clientId = import.meta.env.VITE_X_CLIENT_ID || import.meta.env.VITE_TWITTER_CLIENT_ID;
  const codeVerifier = sessionStorage.getItem('x_oauth_code_verifier');
  const redirectUri = `${window.location.origin}/auth/callback`;

  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier. Please try signing in again.');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const res = await fetch('/twitter-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    console.error('X token exchange failed:', data);
    throw new Error(data.error_description || data.error || 'Failed to exchange X authorization code.');
  }

  return data.access_token;
}

/**
 * Handle OAuth callback from redirect flow.
 * For X: exchanges auth code for access token via PKCE, then sends access token to backend.
 * For others: sends the token directly to backend.
 */
export async function handleOAuthCallback(code?: string, provider: string = 'google'): Promise<AuthResponse> {
  try {
    if (!code) {
      return unsupportedAuthResponse('No authorization code received.');
    }

    let token = code;
    const extras: Record<string, string> = {};

    // For X/Twitter: send the raw auth code + PKCE verifier so backend can exchange it
    if (provider === 'x') {
      const verifier = sessionStorage.getItem('x_oauth_code_verifier');
      if (verifier) {
        extras.code_verifier = verifier;
      }
      extras.redirect_uri = `${window.location.origin}/auth/callback`;
    }

    const response = await api.post<any>('/auth/social/login', { provider, token, ...extras }, { skipAuth: true });

    if (response?.access_token) {
      const expiresIn = response.expires_in ?? 86400;
      api.setSessionTokens(response.access_token, response.refresh_token || '', expiresIn);
    }

    const user = response?.user ? normalizeUserProfile(response.user) : await getCurrentUser();

    return {
      status: true,
      message: `${provider} login successful`,
      access_token: response?.access_token,
      refresh_token: response?.refresh_token,
      user: user || undefined,
      is_new_user: Boolean(response?.is_new_user),
      requires_profile_completion: Boolean(response?.requires_profile_completion),
      data: {
        access_token: response?.access_token,
        refresh_token: response?.refresh_token,
        user: user || undefined,
        is_new_user: response?.is_new_user,
        requires_profile_completion: response?.requires_profile_completion,
      },
    };
  } catch (err: any) {
    return unsupportedAuthResponse(err?.message || `${provider} authentication failed.`);
  }
}

export type VerifyOtpResponse = { success: boolean; message?: string };
export type ResendOtpResponse = { success: boolean; message?: string };

export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResponse> {
  try {
    const response = await $auth.verifyOtp(email, code);
    return { success: response.status, message: response.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function resendOtp(email: string): Promise<ResendOtpResponse> {
  try {
    const response = await $auth.resendOtp(email);
    return { success: response.status, message: response.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function isVerified(_email: string): Promise<{ verified: boolean }> {
  return { verified: false };
}

export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await $auth.checkAvailability({ email });
    return response.status === true;
  } catch {
    return false;
  }
}

export async function getNormalizedCurrentUserResponse(): Promise<UserResponse> {
  const response = await $users.getCurrent();
  return {
    status: true,
    status_code: 200,
    message: 'Success',
    data: normalizeUserProfile(response),
  };
}

export type User = UserProfile;
