'use client';

import { useMemo, useState } from 'react';
import { signOut } from '@/lib/supabase/auth';
import { useNavigate } from 'react-router-dom';

type SupaUser = {
  email?: string;
  user_metadata?: Record<string, any>;
};

export default function UserAvatar({ user }: { user: SupaUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    window.location.reload();
  };

  // Prefer storage URL if present; fallback to legacy base64 data URL
  const uploadedAvatar: string | undefined =
    user?.user_metadata?.avatar_url || user?.user_metadata?.avatar_data_url;

  // Deterministic emoji avatar fallback
  const seed = (user?.user_metadata?.username || user?.email || 'guest').toLowerCase();
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
              {user?.email}
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
