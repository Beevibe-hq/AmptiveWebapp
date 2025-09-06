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
  return await supabase.auth.signUp({
    email,
    password,
  });
};

export const signOut = async () => {
  const supabase = createClient();
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
