import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { isProfileComplete, upsertProfile } from '@/lib/api/profiles';
import { getCurrentUser, handleOAuthCallback as processOAuthCallback } from '@/lib/api/auth';

const AUTH_REDIRECT_KEY = 'amptive.auth.redirect';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing login...');
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const handleOAuth = async () => {
      try {
        setStatus('Checking authentication...');

        const error = searchParams.get('error');
        if (error) {
          throw new Error(`Authentication error: ${error}`);
        }

        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const token = searchParams.get('code') || searchParams.get('access_token') || hashParams.get('access_token') || undefined;

        // If no token is present (e.g. user landed here directly), redirect to login
        if (!token) {
          setStatus('No authentication data found. Redirecting...');
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }

        const isX = Boolean(sessionStorage.getItem('x_oauth_code_verifier'));
        const provider = searchParams.get('provider') || (isX ? 'x' : 'google');

        setStatus('Verifying your session...');

        const authRes = await processOAuthCallback(token, provider);
        if (!authRes.status || !authRes.user) {
          throw new Error(authRes.message || authRes.error || 'Authentication failed');
        }

        // Clean up X OAuth PKCE state
        if (isX) {
          sessionStorage.removeItem('x_oauth_code_verifier');
          sessionStorage.removeItem('x_oauth_state');
        }

        const user = authRes.user;

        setStatus('Loading your profile...');

        let profile = await getCurrentUser();

        const reqComp = Boolean(authRes.requires_profile_completion || authRes.data?.requires_profile_completion);
        const isNew = Boolean(authRes.is_new_user || authRes.data?.is_new_user);
        const needsCompletion = reqComp || isNew || !isProfileComplete(profile || user);

        if (needsCompletion) {
          setStatus('Redirecting to complete your profile...');
          navigate(`/complete-profile?email=${encodeURIComponent(user.email || '')}&isSocial=true`, {
            state: { from: location.state?.from || '/', isSocial: true },
            replace: true
          });
        } else {
          setStatus('Login successful! Redirecting...');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 800);
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setStatus(`Error: ${errorMessage}. Redirecting to login...`);

        setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent('Failed to sign in. ' + errorMessage)}`, {
            replace: true
          });
        }, 2000);
      }
    };

    handleOAuth();
  }, [navigate, searchParams]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 mb-6 flex items-center justify-center">
          <div className="relative w-full h-full">
            <svg
              className="w-full h-full text-black"
              width="105"
              height="84"
              viewBox="0 0 105 84"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M96.9489 58.3115C96.7382 63.182 96.0281 67.7666 92.1577 68.4573C91.8456 68.5049 91.5725 68.5347 91.276 68.5347C86.7111 68.5347 82.7783 62.3186 78.6114 55.7691C75.8569 51.4524 72.5951 46.3081 69.7158 44.5397C69.0603 44.1348 68.1083 44.1825 67.5465 44.6647C65.1665 46.7249 63.4186 52.4884 61.9828 57.3172C59.7199 64.8551 57.5662 72 52.5175 72C47.4688 72 45.3152 64.861 43.0522 57.3053C41.6164 52.4706 39.8763 46.6832 37.4964 44.6409C36.9423 44.1646 36.0059 44.111 35.3427 44.504C32.4477 46.2247 29.1625 51.4107 26.3846 55.7751C22.2177 62.3246 18.2849 68.5407 13.72 68.5407C13.4235 68.5407 13.1582 68.5109 12.8383 68.4633C8.97567 67.7666 8.26558 63.182 8.05489 58.3115C7.46965 44.6528 11.5741 31.1668 19.8845 19.3003C22.6469 15.3349 26.0179 11.3933 29.8492 12.078C34.773 12.9413 34.7496 20.2589 34.7262 28.0052C34.7262 32.1611 34.7106 37.0078 35.725 39.8777C36.0996 40.9315 37.9646 41.0804 38.6278 40.1099C40.4226 37.4662 41.8193 32.828 43.0132 28.8388C45.2761 21.283 47.4298 14.1441 52.4785 14.1441C57.5272 14.1441 59.6808 21.283 61.9438 28.8566C63.1455 32.8697 64.55 37.5496 66.3604 40.1813C67.0237 41.1459 68.8808 40.997 69.2554 39.9491C70.2854 37.0852 70.2776 32.1969 70.2776 28.0052C70.2542 20.2589 70.2386 12.9413 75.1546 12.078C79.0094 11.3933 82.3569 15.3349 85.1193 19.3003C93.4297 31.1668 97.5107 44.6528 96.9489 58.3115Z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <p className="text-sm text-gray-600 font-medium mb-4">{status}</p>

        <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{
              width: '100%',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}