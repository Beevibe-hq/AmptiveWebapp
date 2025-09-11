import { useNavigate, useLocation } from 'react-router-dom';
import SignupForm from '@/components/auth/SignupForm';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialEmail = params.get('email') || undefined;

  const handleSignupSuccess = () => {
    // Redirect to home on successful signup (or to a verify page if you add one)
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center md:items-start justify-center md:justify-start pt-0 md:pt-24 pb-8 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-md w-full mx-auto">
        <div className="sticky top-16 bg-white pt-4 pb-2 z-10">
          <h2 className="text-center text-[28px] font-bold text-gray-900">
            Welcome to Amptive
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-black hover:underline">
              Sign in
            </a>
          </p>
        </div>
        <div className="bg-white py-4 px-4 sm:rounded-lg sm:px-10">
          <SignupForm onSuccess={handleSignupSuccess} initialEmail={initialEmail} />
        </div>
      </div>
    </div>
  );
}
