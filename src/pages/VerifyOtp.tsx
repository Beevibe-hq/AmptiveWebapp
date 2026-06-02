import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp } from '@/lib/api/otp';
import { toastSuccess, toastInfo, toastError } from '@/lib/ui/toast';

const AUTH_REDIRECT_KEY = 'amptive.auth.redirect';

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const redirectTo =
    params.get('redirect') ||
    (typeof window !== 'undefined' ? window.sessionStorage.getItem(AUTH_REDIRECT_KEY) : '') ||
    '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  // All errors are now shown as toasts

  useEffect(() => {
    if (!email) {
      toastError('Missing email. Please start signup again.');
    }
  }, [email]);

  // Auto-send OTP on mount (guarded to avoid duplicate sends under React Strict Mode)
  const sentOnceRef = useRef(false);
  useEffect(() => {
    if (sentOnceRef.current) return;
    sentOnceRef.current = true;
    const run = async () => {
      if (!email) return;
      try {
        setLoading(true);
        const res = await resendOtp(email);
        if (res.success) {
          toastInfo('Verification code resent.');
        } else {
          toastError(res.message || 'Failed to resend verification code.');
        }
      } catch (e) {
        toastError('Failed to send verification code.');
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    if (!code || code.trim().length === 0) {
      toastError('Please enter the verification code.');
      return;
    }
    setLoading(true);
    const res = await verifyOtp(email, code.trim());
    setLoading(false);
    if (res.success) {
      toastSuccess('Verification successful! Signing you in...');
      // Move to profile completion stage; pass along email and token
      const qp = new URLSearchParams();
      qp.set('email', email);
      if (token) qp.set('token', token);
      if (redirectTo) qp.set('redirect', redirectTo);
      setTimeout(() => navigate(`/complete-profile?${qp.toString()}`), 400);
    } else {
      toastError(res.message || 'Verification failed. Please try again.');
    }
  };

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    const res = await resendOtp(email);
    setLoading(false);
    if (res.success) {
      toastInfo('Verification code resent.');
    } else {
      toastError(res.message || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-md w-full mx-auto">
        <div className="pt-4 pb-2">
          <h2 className="text-center text-[28px] font-bold text-gray-900">Verify your email</h2>
          {email && (
            <>
              <p className="text-gray-600 text-center mb-6">We sent a 6-digit code to {email}</p>
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-black hover:underline"
                  aria-label="Go back to previous page"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Back to previous page
                </button>
              </div>
            </>
          )}
        </div>

        <form onSubmit={submit} className="bg-white py-4 px-4 sm:rounded-lg sm:px-10">
          <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
            Verification code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter the code"
            className="block w-full rounded-md border border-gray-300 focus:border-black focus:ring-black px-3 py-2 text-base"
          />

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={resend}
              disabled={loading || !email}
              className="text-sm font-medium text-black hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length === 0}
            className="mt-4 w-full h-10 rounded-full bg-black text-white text-sm font-medium disabled:opacity-70"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}
