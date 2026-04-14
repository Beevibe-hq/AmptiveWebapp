import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpWithEmail, signInWithGoogle } from '@/lib/api/auth';
import { stashSignup } from '@/lib/api/otp';
import { toast } from 'sonner';
import { checkEmailExists } from '@/lib/api/checkEmail';

const socialButtonContainer: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingLeft: '36px',
  boxSizing: 'border-box'
};

const socialButtonStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  borderRadius: '9999px',
  color: 'rgb(50, 48, 44)',
  backgroundColor: 'white',
  border: '1px solid rgba(84, 72, 49, 0.15)',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: '10px',
  transition: 'background-color 0.2s ease-in'
};

const socialIconStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

interface SignupFormProps {
  onSuccess?: () => void;
  initialEmail?: string;
}

export default function SignupForm({ onSuccess, initialEmail }: SignupFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 'email') {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Validate email format
      const emailOk = /.+@.+\..+/.test(normalizedEmail);
      if (!emailOk) {
        setError('Please enter a valid email address.');
        return;
      }
      
      // Check if email exists
      setLoading(true);
      try {
        const { exists } = await checkEmailExists(normalizedEmail);
        
        if (exists) {
          setError('This email is already registered. Please sign in instead.');
          return;
        }
        
        // If we get here, email is valid and not registered
        setError(null);
        setStep('password');
      } catch (err) {
        console.error('Email check failed:', err);
        setError('Failed to check email. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Don't submit if already loading
    if (loading) return;
    
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!password || password.length < 8) {
        setError('Your password should be at least 8 characters.');
        setLoading(false);
        return;
      }
      
      console.log('Attempting to sign up with:', { email: normalizedEmail });
      const { data, error } = await signUpWithEmail(normalizedEmail, password);
      
      if (error) {
        console.error('Signup error:', error);
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('already registered') || msg.includes('already in use')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else if (msg.includes('password')) {
          setError('Password is not strong enough. Please choose a stronger password.');
        } else {
          setError('Sign up failed. Please try again.');
        }
        setLoading(false);
        return;
      }
      
      console.log('Signup response:', data);

      // If no error from Supabase, consider this a successful signup.
      // In projects requiring email confirmation, Supabase may return no session
      // and sometimes even no user object. We'll treat this as success and
      // let the app redirect/show a success state via onSuccess.
      console.log('Signup successful (no Supabase error). Proceeding to success handler.');
      // Securely stash credentials server-side and pass one-time token to verify page
      let tokenParam = '';
      try {
        const stash = await stashSignup(normalizedEmail, password);
        if (stash.ok && stash.token) {
          tokenParam = `&token=${encodeURIComponent(stash.token)}`;
        } else {
          toast.warning('Could not prepare auto sign-in. You can still complete verification.');
        }
      } catch (e) {
        toast.warning('Network issue preparing secure sign-in. You can still complete verification.');
      }

      // Navigate to OTP verification page with email (and token if available) as query param.
      // The Verify page will handle sending the OTP once it mounts.
      try {
        navigate(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}${tokenParam}`);
      } catch {}
      return;
    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Social providers */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '10px' }}>
          <button
            type="button"
            style={socialButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}
            onClick={async () => {
              if (loading) return;
              setLoading(true);
              try {
                await signInWithGoogle();
              } catch (e) {
                console.error('Google sign-up failed', e);
                setLoading(false);
              }
            }}
          >
            <div style={socialButtonContainer}>
              <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 24 24" style={socialIconStyle}>
                <g>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </g>
              </svg>
              <span>Continue with Google</span>
            </div>
          </button>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <button
            type="button"
            style={socialButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}
          >
            <div style={socialButtonContainer}>
              <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 24 24" style={socialIconStyle}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000000" />
              </svg>
              <span>Continue with X (Twitter)</span>
            </div>
          </button>
        </div>

        <div>
          <button
            type="button"
            style={socialButtonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}
          >
            <div style={socialButtonContainer}>
              <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 24 24" style={socialIconStyle}>
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Continue with Facebook</span>
            </div>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
        <div style={{ margin: '0 12px', fontSize: '14px', color: 'rgba(0,0,0,0.5)' }}>OR</div>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
      </div>

      {/* Email step */}
      <div style={{
        opacity: step === 'email' ? 1 : 0,
        maxHeight: step === 'email' ? 140 : 0,
        overflow: 'hidden',
        transform: step === 'email' ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'opacity 150ms ease-in-out, max-height 150ms ease-in-out, transform 150ms ease-in-out'
      }}>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          fontSize: '15px',
          lineHeight: '26px',
          position: 'relative',
          borderRadius: '10px',
          border: emailFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)',
          background: 'transparent',
          cursor: 'text',
          paddingTop: '4px',
          paddingBottom: '4px',
          paddingInline: '10px',
          marginTop: '4px',
          marginBottom: step === 'email' ? '12px' : '0px',
          height: '40px',
          boxSizing: 'border-box'
        }}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address..."
            autoComplete="username"
            aria-label="Enter your email address..."
            style={{
              fontSize: 'inherit',
              lineHeight: 'inherit',
              border: 'none',
              background: 'none',
              width: '100%',
              display: 'block',
              resize: 'none',
              padding: '0px',
              outline: 'none'
            }}
            onFocus={() => { setEmailFocused(true); setError(null); }}
            onBlur={() => setEmailFocused(false)}
            required={step === 'email'}
            autoFocus={step === 'email'}
          />
          {email && (
            <div style={{ display: 'contents' }}>
              <div
                role="button"
                tabIndex={0}
                aria-label="Clear Input"
                onClick={() => setEmail('')}
                style={{
                  userSelect: 'none',
                  transition: 'background 20ms ease-in',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  borderRadius: '20px',
                  height: '24px',
                  width: '24px',
                  padding: '0px',
                  flexGrow: 0,
                  marginInlineEnd: '-4px'
                }}
              >
                <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="clearInput" style={{ width: '16px', height: '16px', display: 'block', fill: 'rgba(81, 73, 60, 0.32)', flexShrink: 0 }}>
                  <path d="M7.993 15.528a7.273 7.273 0 01-2.923-.593A7.633 7.633 0 012.653 13.3a7.797 7.797 0 01-1.633-2.417 7.273 7.273 0 01-.593-2.922c0-1.035.198-2.01.593-2.922A7.758 7.758 0 015.063.99 7.273 7.273 0 017.985.395a7.29 7.29 0 012.93.593 7.733 7.733 0 012.417 1.64 7.647 7.647 0 011.64 2.41c.396.914.594 1.888.594 2.923 0 1.035-.198 2.01-.593 2.922a7.735 7.735 0 01-4.058 4.05 7.272 7.272 0 01-2.922.594zM5.59 11.06c.2 0 .371-.066.513-.198L8 8.951l1.904 1.911a.675.675 0 00.498.198.667.667 0 00.491-.198.67.67 0 00.205-.49.64.64 0 00-.205-.491L8.981 7.969l1.92-1.911a.686.686 0 00.204-.491.646.646 0 00-.205-.484.646.646 0 00-.483-.205.67.67 0 00-.49.205L8 6.995 6.081 5.083a.696.696 0 00-.49-.19.682.682 0 00-.491.198.651.651 0 00-.198.49c0 .181.068.342.205.484l1.912 1.904-1.912 1.92a.646.646 0 00-.205.483c0 .19.066.354.198.49.136.132.3.198.49.198z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password step */}
      <div style={{
        opacity: step === 'password' ? 1 : 0,
        maxHeight: step === 'password' ? 140 : 0,
        overflow: 'hidden',
        transform: step === 'password' ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 150ms ease-in-out, max-height 150ms ease-in-out, transform 150ms ease-in-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setStep('email')}
            aria-label="Go back to email"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)',
              maxWidth: '100%',
              cursor: 'pointer'
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" style={{ display: 'block', fill: 'currentColor', color: 'rgba(0,0,0,0.7)' }}>
              <path d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" />
            </svg>
            <span style={{
              fontSize: '12px',
              color: 'rgba(0,0,0,0.75)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '200px'
            }}>{email}</span>
          </button>
        </div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          fontSize: '15px',
          lineHeight: '26px',
          position: 'relative',
          borderRadius: '10px',
          border: (password && password.length < 8) ? '1px solid #b91c1c' : (passwordFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)'),
          background: 'transparent',
          cursor: 'text',
          paddingTop: '4px',
          paddingBottom: '4px',
          paddingInline: '10px',
          marginTop: '4px',
          marginBottom: step === 'password' ? '2px' : '0px',
          height: '40px',
          boxSizing: 'border-box'
        }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password..."
            aria-label="Create a password..."
            aria-describedby="password-help"
            aria-invalid={password.length > 0 && password.length < 8}
            minLength={8}
            style={{
              fontSize: 'inherit',
              lineHeight: 'inherit',
              border: 'none',
              background: 'none',
              width: '100%',
              display: 'block',
              resize: 'none',
              padding: '0px 28px 0 0',
              outline: 'none'
            }}
            onFocus={() => { setPasswordFocused(true); setError(null); }}
            onBlur={() => setPasswordFocused(false)}
            required={step === 'password'}
            autoFocus={step === 'password'}
          />
          {/* Toggle password visibility */}
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(v => !v)}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              color: 'rgba(0,0,0,0.6)'
            }}
          >
            {showPassword ? (
              // Eye-off icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.94 17.94C16.23 19.22 14.2 20 12 20 5.48 20 1 12.99 1 12.99S3.29 9.42 6.56 7.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.9 5.96C10.57 5.82 11.28 5.75 12 5.75c6.52 0 11 7 11 7s-1.18 1.83-3.24 3.43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.12 9.88A3 3 0 0 1 12 15a3 3 0 0 1-3-3c0-.5.12-.98.33-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              // Eye icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>
        <div style={{ marginTop: '0px' }}>
          <span
            id="password-help"
            style={{
              fontSize: '12px',
              color: password && password.length > 0 && password.length < 8 ? '#b91c1c' : 'rgba(0,0,0,0.6)',
              paddingBottom: '12px',
              display: 'block'
            }}
          >
            Your password should be at least 8 characters.
          </span>
        </div>
      </div>

      {/* Submit */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: '40px',
            borderRadius: '9999px',
            backgroundColor: '#000000',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s ease, background-color 0.2s ease',
            opacity: loading ? 0.7 : 1
          }}
          onClick={(e) => {
            if (loading) {
              e.preventDefault();
              return;
            }
          }}
        >
          {step === 'email' ? (loading ? 'Continue...' : 'Continue') : (loading ? 'Creating account...' : 'Create account')}
        </button>
      </div>
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded"
          role="alert"
          aria-live="polite"
        >
          <span className="block text-xs sm:text-sm">{error}</span>
        </div>
      )}

    </form>
  );
}
