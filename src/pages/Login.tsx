import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { handleOAuthCallback } from '@/lib/api/auth';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleOAuthCallback(code)
        .then(() => {
          navigate(searchParams.get('redirect') || '/');
        })
        .catch(console.error);
    }
  }, [searchParams, navigate]);

  const handleLoginSuccess = () => {
    const redirectTo = searchParams.get('redirect') || '/';
    navigate(redirectTo);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes float {
          0% { transform: scale(1.03) translateY(0) rotate(0.3deg); }
          33% { transform: scale(1.06) translateY(-5px) rotate(-0.2deg); }
          66% { transform: scale(1.04) translateY(3px) rotate(0.4deg); }
          100% { transform: scale(1.03) translateY(0) rotate(0.3deg); }
        }
        .floating-bg {
          animation: float 15s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="relative min-h-screen flex items-center md:items-start justify-center md:justify-start pt-0 md:pt-24 pb-8 px-4 sm:px-6 lg:px-8 overflow-auto">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url("/images/login bg.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(2px)',
          transform: 'scale(1.05)'
        }}
      />
      <div className="fixed inset-0 bg-white bg-opacity-30 z-1"></div>

      <div className="relative z-10 max-w-md w-full mx-auto">
        <div>
          <h2 className="text-center text-[28px] font-bold text-gray-900">
            Hey, welcome back!
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600">
            First time here?{' '}
            <Link
              to={searchParams.get('redirect') ? `/signup?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : "/signup"}
              className="font-medium text-black hover:underline"
            >
              Sign up for free
            </Link>
          </p>
        </div>
        <div className="mt-4 py-4 px-4 sm:rounded-lg sm:px-10">
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  );
}