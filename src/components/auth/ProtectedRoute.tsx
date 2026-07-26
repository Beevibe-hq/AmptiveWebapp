import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AmptiveSplash } from '@/components/AmptiveSpinner';

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
      <AmptiveSplash />
    );
  }

  return <>{children}</>;
}
