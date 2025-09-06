import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const [testResult, setTestResult] = useState<string>('');
  const navigate = useNavigate();

  const testConnection = async () => {
    try {
      const supabase = createClient();
      // Using _data to indicate it's intentionally unused
      const { data: _data, error } = await supabase.from('test').select('*').limit(1);
      
      if (error) throw error;
      setTestResult('✅ Connection successful!');
    } catch (error: any) {
      setTestResult(`❌ Connection failed: ${error.message}`);
    }
  };

  const handleLoginSuccess = () => {
    // Redirect to home on successful login
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-24 text-center text-[28px] font-bold text-gray-900">
            Hey, welcome back!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            First time here?{' '}
            <a href="/signup" className="font-medium text-black hover:underline">
              Sign up for free
            </a>
          </p>
        </div>
        <div className="mt-8 bg-white py-4 px-4 sm:rounded-lg sm:px-10">
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  );
}
