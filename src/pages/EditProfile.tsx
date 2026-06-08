import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkUsernameAvailability, updateProfile } from '@/lib/api/profiles';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { Camera, Loader2, Save } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/lib/api/storage';
import { UserProfile } from '@/lib/api/services';

export default function EditProfile() {
    const navigate = useNavigate();
    const {user} =  useAuth()
    const [saving, setSaving] = useState(false);
    const [initialLoading, _setInitialLoading] = useState(true);

    // Form State
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [dob, setDob] = useState('');
    const [avatarUrl, _setAvatarUrl] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Username Availability State
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Store initial username to compare against
    const initialUsernameRef = useRef<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check Username Availability Effect
    useEffect(() => {
        let aborted = false;

        const checkAvailability = async () => {
            // If already aborted, don't run
            if (aborted) return;

            // Basic validation
            if (!username || username.length < 3) {
                if (!aborted) {
                    setUsernameStatus('idle');
                    setCheckingUsername(false);
                }
                return;
            }

            // Don't check if it matches their initial username
            if (initialUsernameRef.current && username === initialUsernameRef.current) {
                if (!aborted) {
                    setUsernameStatus('idle');
                    setCheckingUsername(false);
                }
                return;
            }

            // Prevent checking if we don't have a user ID yet
            if (!user?.user_id) return;

            if (!aborted) {
                setCheckingUsername(true);
                setUsernameStatus('checking');
            }

            try {
                const isAvailable = await checkUsernameAvailability(username, user.user_id);

                if (aborted) return;

                if (username === initialUsernameRef.current) {
                    setUsernameStatus('idle');
                } else {
                    setUsernameStatus(isAvailable ? 'available' : 'taken');
                }
            } catch (error) {
                if (aborted) return;
                console.error('Failed to check username', error);
                setUsernameStatus('idle');
            } finally {
                if (!aborted) {
                    setCheckingUsername(false);
                }
            }
        };

        // Debounce the check
        const timer = setTimeout(checkAvailability, 500);

        // Cleanup: Clear timer to prevent execution if input changes again
        return () => {
            clearTimeout(timer);
            aborted = true;
            // Immediate reset to avoid stuck spinners
            setCheckingUsername(false);
        };
    }, [username, user]);


    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            const objectUrl = URL.createObjectURL(file);
            setAvatarPreview(objectUrl);
        }
    };

    const uploadAvatar = async (): Promise<string | null> => {
        if (!avatarFile) return null;

        try {
            const publicUrl = await uploadImage(avatarFile, 'profile-picture');
            return publicUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            // 1. Upload new avatar if selected
            let finalAvatarUrl = avatarUrl;
            if (avatarFile) {
                const newUrl = await uploadAvatar();
                if (newUrl) finalAvatarUrl = newUrl;
            }

            // 2. Prepare update data
            const updates: Partial<UserProfile> = {
                user_id: user.user_id,
                name: fullName,
                username: username,
                dob: dob,
                avatar_url: finalAvatarUrl,
                updated_at: new Date().toISOString(),
            };

            // 3. Save to DB
            const { ok, error } = await updateProfile(updates);
            if (!ok) throw new Error(error || 'Failed to update profile');

            toastSuccess('Profile updated successfully!');
            navigate(`/profile/${user.user_id}`);
        } catch (error: any) {
            console.error('Error saving profile:', error);
            toastError(error.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    // Colors for default avatar
    const seed = (user?.username || user?.email || 'guest').toLowerCase();
    const emojiSet = ['😀', '😎', '🤠', '🦄', '🐼', '🐸', '🐯', '🐵', '🐧', '🐰', '🐨', '🦊', '🐙', '🐳', '🐝', '🐢', '🐞', '🌸', '🌼', '🍀', '🍉', '🍓', '🍍', '⚡', '⭐', '🌙', '☀️', '🔥', '🎧', '🎨', '🎯', '🚀', '🧠', '💎', '💜', '💛', '💚', '💙', '🧸'];
    const bgSet = ['#FDE68A', '#FFEDD5', '#E9D5FF', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#FFE4E6', '#F3E8FF', '#E0E7FF', '#D1FAE5'];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (h << 5) - h + seed.charCodeAt(i);
        h |= 0;
    }
    const hash = Math.abs(h);
    const emoji = emojiSet[hash % emojiSet.length];
    const emojiBg = bgSet[hash % bgSet.length];

    return (
        <div className="min-h-screen bg-white">

            {/* Blur Background */}
            <div
                className="fixed inset-0 -z-10"
                style={{
                    backdropFilter: 'blur(140px)',
                    backgroundImage: 'url("/mkimage/image/thumb/Features125/v4/d5/bb/ad/d5bbad45-cb3e-6334-ac5d-72442a0e822c/pr_source.png/800x800vb.webp")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />
            {/* Top tint overlay */}
            <div className="fixed top-0 left-0 right-0 h-80 md:h-96 lg:h-[28rem] z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(255,255,255,0) 100%)' }} />

            <div className="container mx-auto px-4 py-8 pt-24">


                <div className="flex flex-col-reverse lg:flex-row-reverse gap-6 lg:gap-16 items-start justify-center">

                    {/* Main Content (Visually Right, HTML First) */}
                    <main className="flex-1 max-w-xl w-full animate-in slide-in-from-bottom-4 duration-700 fade-in">
                        <div className="space-y-6">
                            <div className="space-y-6">
                                <section className="group">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 mb-4">
                                            <span className="text-xs flex items-baseline gap-1 font-medium text-gray-600">
                                                Since {user?.created_at ? new Date(user.created_at).getFullYear() : '...'}
                                            </span>
                                        </div>
                                        <h1 className="text-3xl md:text-[40px] font-bold text-black tracking-tight leading-[1.1] mb-2">
                                            Edit Profile
                                        </h1>
                                        <p className="text-gray-500">Update your personal information visible to others.</p>
                                    </div>
                                </section>

                                <section className="pt-8 border-t border-gray-100">
                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        {/* Full Name */}
                                            <div className="flex justify-between items-center">
                                                <label htmlFor="fullname" className="block text-sm font-bold text-gray-700">
                                                    Full Name
                                                </label>
                                                <span className={`text-[10px] font-bold ${fullName.length >= 50 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {fullName.length}/50
                                                </span>
                                            </div>
                                            <input
                                                id="fullname"
                                                type="text"
                                                value={fullName}
                                                maxLength={50}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="e.g. John Doe"
                                                className="block w-full rounded-2xl px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                            />

                                        {/* Username */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="username" className="block text-sm font-bold text-gray-700">
                                                Username
                                            </label>
                                            <div className="relative group">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-medium transition-colors group-focus-within:text-gray-600">
                                                    @
                                                </span>
                                                <input
                                                    id="username"
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                    placeholder="username"
                                                    className={`block w-full rounded-2xl pl-10 pr-12 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 transition-all duration-200 shadow-sm bg-black/5 ${usernameStatus === 'available'
                                                        ? 'focus:ring-green-500/10 border-green-500/20'
                                                        : usernameStatus === 'taken'
                                                            ? 'focus:ring-red-500/10 border-red-500/20'
                                                            : 'focus:ring-blue-500/10'
                                                        }`}
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                                                    {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                                                    {!checkingUsername && username && usernameStatus === 'available' && (
                                                        <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">Available</span>
                                                    )}
                                                    {!checkingUsername && username && usernameStatus === 'taken' && (
                                                        <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full">Taken</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[11px] font-medium text-gray-400 ml-1">Visible on your public profile URL</p>
                                        </div>

                                        {/* Date of Birth */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="dob" className="block text-sm font-bold text-gray-700">
                                                Date of Birth
                                            </label>
                                            <input
                                                id="dob"
                                                type="date"
                                                value={dob}
                                                onChange={(e) => setDob(e.target.value)}
                                                className="block w-full rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm bg-black/5"
                                            />
                                        </div>

                                        <div className="pt-8 flex items-center justify-end gap-3 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => navigate(-1)}
                                                className="rounded-full px-6 py-3 text-sm font-bold text-gray-500 transition hover:text-gray-900 hover:bg-gray-100"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving || usernameStatus === 'taken' || checkingUsername}
                                                className="inline-flex items-center gap-2 rounded-full bg-black px-8 py-3 text-sm font-bold text-white transition-all hover:bg-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                            >
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </section>
                            </div>
                        </div>
                    </main>

                    {/* Sidebar / Avatar (Visually Left, HTML Second) */}
                    <div className="w-full lg:w-[380px] space-y-8 animate-in slide-in-from-right-8 duration-1000 delay-200 fade-in fill-mode-backwards lg:sticky lg:top-24">
                        <div
                            className="relative w-full aspect-square rounded-full overflow-hidden bg-gray-100 cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {avatarPreview || avatarUrl ? (
                                <img
                                    src={avatarPreview || avatarUrl || ''}
                                    alt="Profile"
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div
                                    className="flex h-full w-full items-center justify-center text-9xl shadow-inner"
                                    style={{ backgroundColor: emojiBg }}
                                >
                                    {emoji}
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/90 backdrop-blur-md rounded-full p-4 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <Camera className="h-6 w-6 text-black" />
                                </div>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <div className="hidden lg:block space-y-4">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full rounded-2xl py-4 text-center font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] bg-black text-white block"
                            >
                                Change Photo
                            </button>
                            <p className="mt-3 text-center text-xs font-medium text-black">Recommended: Square JPG, PNG. Max 5MB.</p>
                        </div>

                        {/* Mobile Bottom Bar for Photo Change (optional, maybe just let them tap the image) */}
                        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/80 backdrop-blur-xl p-4 lg:hidden safe-area-pb transition-transform duration-300 translate-y-full hover:translate-y-0 peer-checked:translate-y-0">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full rounded-xl py-3 text-center font-bold shadow-lg active:scale-[0.98] bg-black text-white block"
                            >
                                Change Photo
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
