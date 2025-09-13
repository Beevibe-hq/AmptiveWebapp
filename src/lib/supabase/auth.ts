import { createClient } from './client';

export const signInWithEmail = async (email: string, password: string) => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
    }
    
    return { data, error };
  } catch (error) {
    console.error('Unexpected error during login:', error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { otp_verified: false }
      }
    });
    
    if (error) {
      console.error('Signup error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
    }
    
    return { data, error };
  } catch (error) {
    console.error('Unexpected error during signup:', error);
    throw error;
  }
};

export const checkEmailExists = async (email: string) => {
  const supabase = createClient();
  try {
    // Try to sign in with a dummy password
    // This will fail if the user doesn't exist, but with a specific error
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy-password-123!@#'
    });

    if (error) {
      // If the error indicates the user doesn't exist
      if (error.message.includes('user not found') || 
          error.status === 400) {
        return { exists: false, error: null };
      }
      // If we get 'Invalid login credentials', the user exists but password is wrong
      if (error.message.includes('Invalid login credentials')) {
        return { exists: true, error: null };
      }
      console.error('Error checking email:', error);
      return { exists: false, error };
    }
    
    // If no error, user exists
    return { exists: true, error: null };
  } catch (error) {
    console.error('Unexpected error checking email:', error);
    return { exists: false, error };
  }
};

export const signOut = async () => {
  try {
    const supabase = createClient();
    
    // Clear all auth-related data from localStorage
    const authKeys = [
      'amptive.auth',
      'sb-gjkvrllwtjktcarnikus-auth-token',
      'sb-gjkvrllwtjktcarnikus-auth-token-1',
      'sb-gjkvrllwtjktcarnikus-auth-event',
    ];
    
    // Remove all auth-related items from localStorage
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    // Force a hard refresh to ensure all state is cleared
    window.location.href = '/';
    
    return { error };
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};

// Silent sign out: clears session and tokens WITHOUT redirecting or reloading the page
export const signOutSilent = async () => {
  try {
    const supabase = createClient();
    // Remove auth-related localStorage entries
    const possibleKeys = [
      'amptive.auth',
      'sb-gjkvrllwtjktcarnikus-auth-token',
      'sb-gjkvrllwtjktcarnikus-auth-token-1',
      'sb-gjkvrllwtjktcarnikus-auth-event',
    ];
    possibleKeys.forEach((k) => localStorage.removeItem(k));

    // Clear Supabase auth cookies (if any)
    document.cookie.split(';').forEach((cookie) => {
      const [name] = cookie.trim().split('=');
      if (name.toLowerCase().startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });

    // Invalidate session with Supabase
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (e) {
    console.warn('Silent sign out error (ignored):', (e as any)?.message || e);
    return { error: e as any };
  }
};

export const getCurrentUser = async () => {
  const supabase = createClient();
  try {
    // Prefer local session (no network) to avoid CORS issues when just reading user for UI
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user ?? null;
    if (sessionUser) return sessionUser;

    // Fallback to network call
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('[auth] getUser() failed, returning null user:', error?.message || error);
      return null;
    }
    return data?.user ?? null;
  } catch (e) {
    console.warn('[auth] getCurrentUser error, returning null user:', (e as any)?.message || e);
    return null;
  }
};
