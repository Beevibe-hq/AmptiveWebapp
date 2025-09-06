'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const [testResult, setTestResult] = useState<string>('');

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-24 text-center text-3xl font-extrabold text-gray-900">
            Hey, welcome back!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            First time here?{' '}
            <a href="/signup" className="font-medium text-black hover:underline">
              Sign up for free
            </a>
          </p>
        </div>
        <div className="mt-8 bg-white py-4 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm />
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Connection Test</h3>
            <button
              onClick={testConnection}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Test Supabase Connection
            </button>
            {testResult && (
              <p className="mt-2 text-sm text-center">
                {testResult}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
