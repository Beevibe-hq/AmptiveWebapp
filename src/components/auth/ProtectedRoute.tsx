import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [user, loading, navigate, location]);

  if (loading || !user) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white">
        <div className="flex h-24 w-24 items-center justify-center">
          <AmptiveSpinner className="h-full w-full text-black" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
