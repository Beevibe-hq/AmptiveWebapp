export { login, register, logout as signOut, getCurrentUser, signInWithGoogle, handleOAuthCallback, verifyOtp, resendOtp, isVerified, checkEmailExists, stashSignup, consumeSignup } from '@/lib/api/auth';
export { signInWithEmail, signUpWithEmail, signOutSilent } from '@/lib/api/auth';
export type { User, AuthResponse } from '@/lib/api/auth';