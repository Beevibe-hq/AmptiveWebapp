import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/lib/api/auth';
import { isProfileComplete } from '@/lib/api/profiles';
import { useAuth } from '@/contexts/AuthContext';

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

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSocialTooltip, setShowSocialTooltip] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Step 1: advance from email to password
    if (step === 'email') {
      const normalizedEmail = email.trim().toLowerCase();
      // Basic email validation
      const emailOk = /.+@.+\..+/.test(normalizedEmail);
      if (!emailOk) {
        setError('Please enter a valid email address.');
        return;
      }
      setStep('password');
      return;
    }

    // Step 2: perform actual sign-in
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!password) {
        setError('Please enter your password.');
        return;
      }
      // Sign in first to avoid extra round trips slowing login
      const { data, status, message, user: loggedInUser } = await login(normalizedEmail, password);
      if (!status) {
        const msg = (message || '').toLowerCase();
        if (msg.includes('invalid login credentials')) {
          setError('Incorrect email or password.');
        } else if (msg.includes('email not confirmed') || msg.includes('email not verified')) {
          setError('Please verify your email before logging in.');
        } else if (msg.includes('rate') || msg.includes('too many')) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else {
          setError('Login failed. Please try again.');
        }
        return;
      }

      // Use user from login response instead of fetching again
      const u = loggedInUser || data?.user;
      const needsCompletion = !isProfileComplete(u);


      if (needsCompletion) {
        navigate(`/complete-profile?email=${encodeURIComponent(normalizedEmail)}`, { replace: true });
      } else {
        // Refresh AuthContext user state before navigating
        await refreshUser();
        onSuccess?.();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const em = (err?.message || '').toLowerCase();
      if (em.includes('failed to fetch') || em.includes('network')) {
        setError('Network issue. Check your connection and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Social providers - temporarily disabled */}
      <div style={{ marginBottom: '24px' }}>
        {showSocialTooltip && (
          <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Social login coming soon. Use email sign-in below.
            <button type="button" onClick={() => setShowSocialTooltip(false)} className="ml-2 underline font-medium">Got it</button>
          </div>
        )}
        <div style={{ marginBottom: '10px' }}>
          <button
            type="button"
            style={{ ...socialButtonStyle, opacity: 0.5, cursor: 'not-allowed' }}
            disabled
            onClick={() => setShowSocialTooltip(true)}
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
            style={{ ...socialButtonStyle, opacity: 0.5, cursor: 'not-allowed' }}
            disabled
            onClick={() => setShowSocialTooltip(true)}
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
            style={{ ...socialButtonStyle, opacity: 0.5, cursor: 'not-allowed' }}
            disabled
            onClick={() => setShowSocialTooltip(true)}
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
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="0 0 16 16"
                  className="clearInput"
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'block',
                    fill: 'rgba(81, 73, 60, 0.32)',
                    flexShrink: 0
                  }}
                >
                  <path d="M7.993 15.528a7.273 7.273 0 01-2.923-.593A7.633 7.633 0 012.653 13.3a7.797 7.797 0 01-1.633-2.417 7.273 7.273 0 01-.593-2.922c0-1.035.198-2.01.593-2.922A7.758 7.758 0 015.063.99 7.273 7.273 0 017.985.395a7.29 7.29 0 012.93.593 7.733 7.733 0 012.417 1.64 7.647 7.647 0 011.64 2.41c.396.914.594 1.888.594 2.923 0 1.035-.198 2.01-.593 2.922a7.735 7.735 0 01-4.058 4.05 7.272 7.272 0 01-2.922.594zM5.59 11.06c.2 0 .371-.066.513-.198L8 8.951l1.904 1.911a.675.675 0 00.498.198.667.667 0 00.491-.198.67.67 0 00.205-.49.64.64 0 00-.205-.491L8.981 7.969l1.92-1.911a.686.686 0 00.204-.491.646.646 0 00-.205-.484.646.646 0 00-.483-.205.67.67 0 00-.49.205L8 6.995 6.081 5.083a.696.696 0 00-.49-.19.682.682 0 00-.491.198.651.651 0 00-.198.49c0 .181.068.342.205.484l1.912 1.904-1.912 1.92a.646.646 0 00-.205.483c0 .19.066.354.198.49.136.132.3.198.49.198z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
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
          border: passwordFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)',
          background: 'transparent',
          cursor: 'text',
          paddingTop: '4px',
          paddingBottom: '4px',
          paddingInline: '10px',
          marginTop: '4px',
          marginBottom: step === 'password' ? '12px' : '0px',
          height: '40px',
          boxSizing: 'border-box'
        }}>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password..."
            aria-label="Enter your password..."
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
            onFocus={() => { setPasswordFocused(true); setError(null); }}
            onBlur={() => setPasswordFocused(false)}
            required={step === 'password'}
          />
          {password && (
            <div style={{ display: 'contents' }}>
              <div
                role="button"
                tabIndex={0}
                aria-label="Clear Input"
                onClick={() => setPassword('')}
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
                <svg
                  aria-hidden="true"
                  role="graphics-symbol"
                  viewBox="0 0 16 16"
                  className="clearInput"
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'block',
                    fill: 'rgba(81, 73, 60, 0.32)',
                    flexShrink: 0
                  }}
                >
                  <path d="M7.993 15.528a7.273 7.273 0 01-2.923-.593A7.633 7.633 0 012.653 13.3a7.797 7.797 0 01-1.633-2.417 7.273 7.273 0 01-.593-2.922c0-1.035.198-2.01.593-2.922A7.758 7.758 0 015.063.99 7.273 7.273 0 017.985.395a7.29 7.29 0 012.93.593 7.733 7.733 0 012.417 1.64 7.647 7.647 0 011.64 2.41c.396.914.594 1.888.594 2.923 0 1.035-.198 2.01-.593 2.922a7.735 7.735 0 01-4.058 4.05 7.272 7.272 0 01-2.922.594zM5.59 11.06c.2 0 .371-.066.513-.198L8 8.951l1.904 1.911a.675.675 0 00.498.198.667.667 0 00.491-.198.67.67 0 00.205-.49.64.64 0 00-.205-.491L8.981 7.969l1.92-1.911a.686.686 0 00.204-.491.646.646 0 00-.205-.484.646.646 0 00-.483-.205.67.67 0 00-.49.205L8 6.995 6.081 5.083a.696.696 0 00-.49-.19.682.682 0 00-.491.198.651.651 0 00-.198.49c0 .181.068.342.205.484l1.912 1.904-1.912 1.92a.646.646 0 00-.205.483c0 .19.066.354.198.49.136.132.3.198.49.198z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
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
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            opacity: loading ? 0.7 : 1,
            pointerEvents: loading ? 'none' : 'auto'
          }}
        >
          {step === 'email' ? (loading ? 'Continue...' : 'Continue') : (loading ? 'Signing in...' : 'Sign in')}
        </button>
        <div style={{
          width: '100%',
          marginTop: '16px',
          marginBottom: '0px',
          fontSize: '12px',
          lineHeight: '16px',
          color: 'rgb(116, 113, 108)',
          textAlign: 'center',
          textWrap: 'balance'
        }}>
          <p style={{ marginBottom: '0px' }}>
            By continuing, you acknowledge that you understand and agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline',
                color: 'rgb(168, 164, 156)',
                textDecoration: 'underline',
                userSelect: 'auto',
                cursor: 'pointer'
              }}
            >
              Terms & Conditions
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline',
                color: 'rgb(168, 164, 156)',
                textDecoration: 'underline',
                userSelect: 'auto',
                cursor: 'pointer'
              }}
            >
              Privacy Policy
            </a>
          </p>
        </div>
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
      {step === 'password' && error === 'Incorrect email or password.' && (
        <div className="mt-2 text-xs text-gray-700">
          Don't have an account?{' '}
          <a
            href={`/signup?email=${encodeURIComponent(email.trim().toLowerCase())}`}
            className="font-medium text-black hover:underline"
          >
            Create one
          </a>
          .
        </div>
      )}
    </form>
  );
}
