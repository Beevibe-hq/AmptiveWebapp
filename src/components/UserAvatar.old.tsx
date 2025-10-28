'use client';

import { useMemo, useState } from 'react';
import { signOut } from '@/lib/supabase/auth';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';
import { getInitials } from '@/lib/utils/string';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUserWithRefresh } from '@/lib/supabase/user';

type SupaUser = {
  email?: string;
  user_metadata?: Record<string, any>;
};

export default function UserAvatar({ user }: { user: SupaUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    window.location.reload();
  };

  // Get the avatar URL from user metadata, with fallback to auth user data
  const avatarUrl = user?.user_metadata?.avatar_url || 
                   user?.user_metadata?.avatar_data_url ||
                   user?.user_metadata?.picture ||
                   '';

  // Get the user's name from metadata or email
  const name = user?.user_metadata?.full_name || 
              user?.user_metadata?.name || 
              user?.email?.split('@')[0] || 
              'User';

  const { user: initialUser, isLoading } = useUser();
  const [currentUser, setCurrentUser] = useState(initialUser);

  // Ensure we have the latest user data
  useEffect(() => {
    const updateUserData = async () => {
      if (initialUser) {
        const currentUser = await getCurrentUserWithRefresh();
        if (currentUser) {
          setCurrentUser(currentUser);
        }
      }
    };
    
    updateUserData();
  }, [initialUser]);

  // Deterministic emoji avatar fallback
  const seed = (currentUser?.user_metadata?.username || currentUser?.email || 'guest').toLowerCase();
  const emojiSet = useMemo(
    () => ['😀','😎','🤠','🦄','🐼','🐸','🐯','🐵','🐧','🐰','🐨','🦊','🐙','🐳','🐝','🐢','🐞','🌸','🌼','🍀','🍉','🍓','🍍','⚡','⭐','🌙','☀️','🔥','🎧','🎨','🎯','🚀','🧠','💎','💜','💛','💚','💙','🧸'],
    []
  );
  const bgSet = useMemo(
    () => ['#FDE68A','#FFEDD5','#E9D5FF','#DBEAFE','#DCFCE7','#FCE7F3','#FFE4E6','#F3E8FF','#E0E7FF','#D1FAE5'],
    []
  );
  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }, [seed]);
  const emoji = emojiSet[hash % emojiSet.length];
  const emojiBg = bgSet[hash % bgSet.length];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-black/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black overflow-hidden"
        aria-label="Account menu"
      >
        {uploadedAvatar && !imgError ? (
          <img
            src={uploadedAvatar}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-base select-none" aria-hidden="true" style={{ background: 'transparent', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: emojiBg }}>
            {emoji}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
              <div className="font-medium">{displayName}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
