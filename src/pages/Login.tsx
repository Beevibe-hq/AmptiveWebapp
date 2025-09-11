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

  // Add animation styles to head
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

  return (
    <div className="relative min-h-screen flex items-center md:items-start justify-center md:justify-start pt-0 md:pt-24 pb-8 px-4 sm:px-6 lg:px-8 overflow-auto">
      {/* Background with blur overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(\"/images/login bg.svg\")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(2px)',
          transform: 'scale(1.05)'
        }}
      />
      <div className="fixed inset-0 bg-white bg-opacity-30 z-1"></div>
      
      {/* Content */}
      <div className="relative z-10 max-w-md w-full mx-auto">
        <div>
          <h2 className="text-center text-[28px] font-bold text-gray-900">
            Hey, welcome back!
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600">
            First time here?{' '}
            <a href="/signup" className="font-medium text-black hover:underline">
              Sign up for free
            </a>
          </p>
        </div>
        <div className="mt-4 py-4 px-4 sm:rounded-lg sm:px-10">
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  );
}
