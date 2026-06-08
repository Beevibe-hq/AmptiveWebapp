import { useState, useRef, useEffect, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { useLocation, useNavigate } from 'react-router-dom';
import { SIGNUP_KEYS } from '@/lib/constants';
import { register } from '@/lib/api/auth';
import { uploadImage } from '@/lib/api/storage';
import { toastError, toastSuccess } from '@/lib/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { checkUsernameAvailability } from '@/lib/api/profiles';

const AUTH_REDIRECT_KEY = 'amptive.auth.redirect';

export default function CompleteProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const params = new URLSearchParams(location.search);
  const email = params.get('email') || sessionStorage.getItem(SIGNUP_KEYS.email) || '';

  useEffect(() => {
    const handleLeave = () => {
      sessionStorage.removeItem(SIGNUP_KEYS.email);
    };
    window.addEventListener('beforeunload', handleLeave);
    return () => {
      window.removeEventListener('beforeunload', handleLeave);
    };
  }, []);

  const [step, setStep] = useState(0);
  const totalSteps = 6;

  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [fullNameFocused, setFullNameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [dobFocused, setDobFocused] = useState(false);

  // Detect native date input support (some iOS versions report support but UX is buggy)
  const dateSupported = useMemo(() => {
    if (typeof document === 'undefined') return true;
    const input = document.createElement('input');
    input.setAttribute('type', 'date');
    input.value = 'x';
    return input.value !== 'x';
  }, []);
  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  }, []);
  const useFallbackDob = !dateSupported || isIOS;

  // Fallback DOB selects state + refs for robust submit on mobile
  const [dobYear, setDobYear] = useState<string>('');
  const [dobMonth, setDobMonth] = useState<string>('');
  const [dobDay, setDobDay] = useState<string>('');
  const dobYearRef = useRef<HTMLSelectElement | null>(null);
  const dobMonthRef = useRef<HTMLSelectElement | null>(null);
  const dobDayRef = useRef<HTMLSelectElement | null>(null);

  // Build select options
  const years = useMemo(() => {
    const ys: number[] = [];
    const current = new Date().getFullYear();
    for (let y = current; y >= current - 100; y--) ys.push(y);
    return ys;
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const daysInMonth = useMemo(() => {
    const y = parseInt(dobYear || '2000', 10);
    const m = parseInt(dobMonth || '1', 10);
    const last = new Date(y, m, 0).getDate();
    return Array.from({ length: last }, (_, i) => i + 1);
  }, [dobYear, dobMonth]);

  // Compose dob ISO string when fallback selects change
  useEffect(() => {
    if (!dateSupported) {
      if (dobYear && dobMonth && dobDay) {
        const mm = String(dobMonth).padStart(2, '0');
        const dd = String(dobDay).padStart(2, '0');
        setDob(`${dobYear}-${mm}-${dd}`);
      } else {
        setDob('');
      }
    }
  }, [dobYear, dobMonth, dobDay, dateSupported]);

  // Emoji-based default avatar (deterministic by username/email)
  const emojiSet = useMemo(
    () => ['😀', '😎', '🤠', '🦄', '🐼', '🐸', '🐯', '🐵', '🐧', '🐰', '🐨', '🦊', '🐙', '🐳', '🐝', '🐢', '🐞', '🌸', '🌼', '🍀', '🍉', '🍓', '🍍', '⚡', '⭐', '🌙', '☀️', '🔥', '🎧', '🎨', '🎯', '🚀', '🧠', '💎', '💜', '💛', '💚', '💙', '🧸'],
    []
  );
  const bgSet = useMemo(
    () => ['#FDE68A', '#FFEDD5', '#E9D5FF', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#FFE4E6', '#F3E8FF', '#E0E7FF', '#D1FAE5'],
    []
  );
  const seedString = (username || email || 'guest').toLowerCase();
  const hash = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seedString.length; i++) {
      h = (h << 5) - h + seedString.charCodeAt(i);
      h |= 0; // to 32bit int
    }
    return Math.abs(h);
  }, [seedString]);
  const emoji = emojiSet[hash % emojiSet.length];
  const emojiBg = bgSet[hash % bgSet.length];

  // Track direction for step transition animation
  const [animDir, setAnimDir] = useState<1 | -1>(1);
  const prevStepRef = useRef(step);
  useEffect(() => {
    const prev = prevStepRef.current;
    setAnimDir(step > prev ? 1 : -1);
    prevStepRef.current = step;
  }, [step]);

  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const stepTitles = [
    'Pick your @username',
    'Enter your full name',
    'Create a password',
    'Confirm password',
    'Add an avatar',
    'Date of birth',
  ];
  const stepSubtitles = [
    'This will be your unique identifier on Amptive.',
    'Tell us how we should address you.',
    'Your password should be at least 8 characters.',
    'Please re-enter your password.',
    'Upload a photo or keep your emoji avatar.',
    'This helps personalize your experience.',
  ];

  const next = async () => {
    if (step === 0) {
      const un = username.trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,20}$/.test(un)) {
        toastError('Username must be 3-20 chars: letters, numbers, dot, dash, underscore.');
        return;
      }
      if (usernameAvailable === false) {
        toastError('Username is already taken');
        return;
      }
    }
    if (step === 1) {
      if (!fullName.trim()) {
        toastError('Please enter your full name.');
        return;
      }
    }
    if (step === 2) {
      if (!password || password.length < 8) {
        toastError('Your password should be at least 8 characters.');
        return;
      }
    }
    if (step === 3) {
      if (password !== confirmPassword) {
        toastError('Passwords do not match.');
        return;
      }
    }
    if (step === 5) {
      if (!dob) {
        toastError('Please select your date of birth.');
        return;
      }
    }
    setStep((s) => Math.min(totalSteps - 1, s + 1));
  };

  // Debounced live username availability check
  useEffect(() => {

    const un = username.trim().toLowerCase();
    setUsernameMsg(null);
    setUsernameAvailable(null);
    if (!un) return;
    if (!/^[a-z0-9_.-]{3,20}$/.test(un)) {
      setUsernameAvailable(false);
      setUsernameMsg('3-20 chars: letters, numbers, dot, dash, underscore');
      return;
    }
    let cancelled = false;
    setUsernameChecking(true);
    const t = setTimeout(async () => {
      const isAvailable = await checkUsernameAvailability(un);
      if (cancelled) return;
      setUsernameChecking(false);
      if (!isAvailable) {
        setUsernameAvailable(false);
        setUsernameMsg('Username is already taken');
      } else {
        setUsernameAvailable(true);
        setUsernameMsg('Username is available');
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username]);

  const back = () => setStep((s) => Math.max(0, s - 1));

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Open cropper with selected image
    const url = URL.createObjectURL(f);
    setCropImage(url);
    setCropOpen(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  async function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (err) => reject(err));
      image.crossOrigin = 'anonymous';
      image.src = url;
    });
  }

  async function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    const size = Math.max(pixelCrop.width, pixelCrop.height);
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      size,
      size
    );
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  const applyCrop = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    try {
      const dataUrl = await getCroppedImg(cropImage, croppedAreaPixels);
      setAvatarPreview(dataUrl);
    } catch (err) {
      console.error(err);
      toastError('Failed to crop image');
    } finally {
      if (cropImage) URL.revokeObjectURL(cropImage);
      setCropImage(null);
      setCropOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelCrop = () => {
    if (cropImage) URL.revokeObjectURL(cropImage);
    setCropImage(null);
    setCropOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    if (!email || !password) {
      toastError('Missing email or password. Please start signup again.');
      return;
    }
    if (!username.trim()) {
      toastError('Please enter a username.');
      return;
    }
    if (!fullName.trim()) {
      toastError('Please enter your full name.');
      return;
    }
    // Build effective DOB (compose from selects on iOS fallback)
    const effectiveDob = (() => {
      if (useFallbackDob) {
        const y = dobYear || dobYearRef.current?.value || '';
        const m = dobMonth || dobMonthRef.current?.value || '';
        const d = dobDay || dobDayRef.current?.value || '';
        if (y && m && d) {
          const mm = String(m).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          return `${y}-${mm}-${dd}`;
        }
        return '';
      }
      return dob;
    })();

    // Enforce minimum age of 13
    if (!effectiveDob) {
      toastError('Please select your date of birth.');
      return;
    }
    const today = new Date();
    const dobDate = new Date(effectiveDob);
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (isNaN(age)) {
      toastError('Invalid date of birth.');
      return;
    }
    if (age < 13) {
      toastError('You must be at least 13 years old to sign up for Amptive.');
      return;
    }
    setLoading(true);
    try {
      let profilePictureUrl: string | undefined;

      if (avatarPreview && !avatarPreview.startsWith('data:image/svg')) {
        const res = await fetch(avatarPreview);
        const blob = await res.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        profilePictureUrl = await uploadImage(file, 'profile-picture');
      }

      const { status, error } = await register(email, password, {
        username: username.trim().toLowerCase(),
        dob: effectiveDob,
        name: fullName.trim(),
        profile_picture: profilePictureUrl,
      });
      if (!status) {
        toastError(error || 'Failed to register. Please try again.');
        setLoading(false);
        return;
      }

      sessionStorage.removeItem(SIGNUP_KEYS.email);
      await refreshUser();
      toastSuccess('Account created! Welcome to Amptive.');
      const redirectTo = location.state?.from || '/';
      setTimeout(() => navigate(redirectTo), 500);
    } catch (e) {
      toastError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-auto">
      {/* Animated background keyframes (match Login page) */}
      <style>{`
        @keyframes float {
          0% { transform: scale(1.03) translateY(0) rotate(0.3deg); }
          33% { transform: scale(1.06) translateY(-5px) rotate(-0.2deg); }
          66% { transform: scale(1.04) translateY(3px) rotate(0.4deg); }
          100% { transform: scale(1.03) translateY(0) rotate(0.3deg); }
        }
        .floating-bg { animation: float 15s ease-in-out infinite; }
      `}</style>
      {/* Background with blur (no additional color overlay) */}
      <div
        className="fixed inset-0 z-0 floating-bg"
        style={{
          backgroundImage: 'url("/images/complete profile2 bg.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(2px)'
        }}
      />

      <div className="relative z-10 max-w-md w-full mx-auto">
        {/* Dynamic Title per step */}
        <div className="pt-4 pb-2">
          <h2 className="text-center text-[28px] font-bold text-gray-900">{stepTitles[step]}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{stepSubtitles[step]}</p>
        </div>

        {/* Progress indicator */}
        <div className="px-4" aria-label="Profile completion progress">
          {/* Inline keyframes for gradient and animated stripes */}
          <style>{`
            @keyframes progress-stripes {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            @keyframes progress-gradient {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes fade-slide-in {
              from { opacity: 0; transform: translateX(var(--startX, 24px)); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            {/* Base fill */}
            <div
              className="h-2 rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundImage: 'linear-gradient(90deg, #E8A5F1, #EFBC95, #7EC89A, #E2798C, #E8A5F1)',
                backgroundSize: '300% 100%',
                animation: 'progress-gradient 6s ease infinite'
              }}
            />
            {/* Animated stripe overlay within current width */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden rounded-full pointer-events-none"
              style={{ width: `${progress}%` }}
            >
              <div
                className="h-full w-[200%] opacity-15"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 10px, transparent 10px, transparent 20px)',
                  animation: 'progress-stripes 1s linear infinite'
                }}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-600">
            <span className={step >= 0 ? 'font-medium text-gray-900' : ''}>Username</span>
            <span className={step >= 1 ? 'font-medium text-gray-900' : ''}>Full name</span>
            <span className={step >= 2 ? 'font-medium text-gray-900' : ''}>Password</span>
            <span className={step >= 3 ? 'font-medium text-gray-900' : ''}>Confirm</span>
            <span className={step >= 4 ? 'font-medium text-gray-900' : ''}>Avatar</span>
            <span className={step >= 5 ? 'font-medium text-gray-900' : ''}>DOB</span>
          </div>
        </div>

        <div
          key={step}
          className="py-4 px-4 sm:rounded-lg sm:px-10 mt-4"
          style={{
            willChange: 'opacity, transform',
            animation: 'fade-slide-in 420ms cubic-bezier(.22,.61,.36,1) both',
            ['--startX' as any]: `${animDir * 24}px`,
          }}
        >
          {/* Step content with consistent input styling */}
          {step === 0 && (
            <div>
              <div
                style={{
                  display: 'flex', alignItems: 'center', width: '100%', fontSize: '15px', lineHeight: '26px', position: 'relative', borderRadius: '10px',
                  border: usernameFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)', background: 'transparent', cursor: 'text',
                  paddingTop: '4px', paddingBottom: '4px', paddingInline: '10px', marginTop: '4px', marginBottom: '12px', height: '40px', boxSizing: 'border-box'
                }}
              >
                <span aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)', marginRight: 6 }}>@</span>
                <input
                  type="text"
                  placeholder="e.g. janedoe"
                  aria-label="Username"
                  value={username}
                  onChange={(e) => setUsername((e.target.value || '').toLowerCase())}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  style={{ fontSize: 'inherit', lineHeight: 'inherit', border: 'none', background: 'none', width: '100%', display: 'block', resize: 'none', padding: 0, outline: 'none', textTransform: 'lowercase' as const }}
                />
                {username && (
                  <button
                    type="button"
                    aria-label="Clear username"
                    onClick={() => {
                      setUsername('');
                    }}
                    style={{ userSelect: 'none', transition: 'background 20ms ease-in', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 20, height: 24, width: 24, padding: 0, marginInlineEnd: -4 }}
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" style={{ width: 16, height: 16, display: 'block', fill: 'rgba(81, 73, 60, 0.32)', flexShrink: 0 }}>
                      <path d="M7.993 15.528a7.273 7.273 0 01-2.923-.593A7.633 7.633 0 012.653 13.3a7.797 7.797 0 01-1.633-2.417 7.273 7.273 0 01-.593-2.922c0-1.035.198-2.01.593-2.922A7.758 7.758 0 015.063.99 7.273 7.273 0 017.985.395a7.29 7.29 0 012.93.593 7.733 7.733 0 012.417 1.64 7.647 7.647 0 011.64 2.41c.396.914.594 1.888.594 2.923 0 1.035-.198 2.01-.593 2.922a7.735 7.735 0 01-4.058 4.05 7.272 7.272 0 01-2.922.594zM5.59 11.06c.2 0 .371-.066.513-.198L8 8.951l1.904 1.911a.675.675 0 00.498.198.667.667 0 00.491-.198.67.67 0 00.205-.49.64.64 0 00-.205-.491L8.981 7.969l1.92-1.911a.686.686 0 00.204-.491.646.646 0 00-.205-.484.646.646 0 00-.483-.205.67.67 0 00-.49.205L8 6.995 6.081 5.083a.696.696 0 00-.49-.19.682.682 0 00-.491.198.651.651 0 00-.198.49c0 .181.068.342.205.484l1.912 1.904-1.912 1.92a.646.646 0 00-.205.483c0 .19.066.354.198.49.136.132.3.198.49.198z"></path>
                    </svg>
                  </button>
                )}
              </div>
              <p className={`text-xs ${usernameAvailable === false ? 'text-red-600' : usernameAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                {usernameChecking ? 'Checking availability…' : (usernameMsg || '3-20 chars, lowercase letters, numbers, dot, dash, underscore')}
              </p>
            </div>
          )}
          {step === 1 && (
            <div>
              <div
                style={{
                  display: 'flex', alignItems: 'center', width: '100%', fontSize: '15px', lineHeight: '26px', position: 'relative', borderRadius: '10px',
                  border: fullNameFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)', background: 'transparent', cursor: 'text',
                  paddingTop: '4px', paddingBottom: '4px', paddingInline: '10px', marginTop: '4px', marginBottom: '12px', height: '40px', boxSizing: 'border-box'
                }}
              >
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  aria-label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  style={{ fontSize: 'inherit', lineHeight: 'inherit', border: 'none', background: 'none', width: '100%', display: 'block', resize: 'none', padding: 0, outline: 'none' }}
                />
                {fullName && (
                  <button
                    type="button"
                    aria-label="Clear full name"
                    onClick={() => setFullName('')}
                    style={{ userSelect: 'none', transition: 'background 20ms ease-in', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 20, height: 24, width: 24, padding: 0, marginInlineEnd: -4 }}
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" style={{ width: 16, height: 16, display: 'block', fill: 'rgba(81, 73, 60, 0.32)', flexShrink: 0 }}>
                      <path d="M7.993 15.528a7.273 7.273 0 01-2.923-.593A7.633 7.633 0 012.653 13.3a7.797 7.797 0 01-1.633-2.417 7.273 7.273 0 01-.593-2.922c0-1.035.198-2.01.593-2.922A7.758 7.758 0 015.063.99 7.273 7.273 0 017.985.395a7.29 7.29 0 012.93.593 7.733 7.733 0 012.417 1.64 7.647 7.647 0 011.64 2.41c.396.914.594 1.888.594 2.923 0 1.035-.198 2.01-.593 2.922a7.735 7.735 0 01-4.058 4.05 7.272 7.272 0 01-2.922.594zM5.59 11.06c.2 0 .371-.066.513-.198L8 8.951l1.904 1.911a.675.675 0 00.498.198.667.667 0 00.491-.198.67.67 0 00.205-.49.64.64 0 00-.205-.491L8.981 7.969l1.92-1.911a.686.686 0 00.204-.491.646.646 0 00-.205-.484.646.646 0 00-.483-.205.67.67 0 00-.49.205L8 6.995 6.081 5.083a.696.696 0 00-.49-.19.682.682 0 00-.491.198.651.651 0 00-.198.49c0 .181.068.342.205.484l1.912 1.904-1.912 1.92a.646.646 0 00-.205.483c0 .19.066.354.198.49.136.132.3.198.49.198z"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div
                style={{
                  display: 'flex', alignItems: 'center', width: '100%', fontSize: '15px', lineHeight: '26px', position: 'relative', borderRadius: '10px',
                  border: (password && password.length < 8) ? '1px solid #b91c1c' : (passwordFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)'), background: 'transparent', cursor: 'text',
                  paddingTop: '4px', paddingBottom: '4px', paddingInline: '10px', marginTop: '4px', marginBottom: '12px', height: '40px', boxSizing: 'border-box'
                }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password..."
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={{ fontSize: 'inherit', lineHeight: 'inherit', border: 'none', background: 'none', width: '100%', display: 'block', resize: 'none', padding: '0px 28px 0 0', outline: 'none' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'rgba(0,0,0,0.6)'
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.94 17.94C16.23 19.22 14.2 20 12 20 5.48 20 1 12.99 1 12.99S3.29 9.42 6.56 7.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.9 5.96C10.57 5.82 11.28 5.75 12 5.75c6.52 0 11 7 11 7s-1.18 1.83-3.24 3.43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14.12 9.88A3 3 0 0 1 12 15a3 3 0 0 1-3-3c0-.5.12-.98.33-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
              <p className={`text-xs ${password && password.length < 8 ? 'text-red-600' : 'text-gray-500'}`}>
                {password && password.length < 8 ? 'Password must be at least 8 characters' : 'At least 8 characters'}
              </p>
            </div>
          )}
          {step === 3 && (
            <div>
              <div
                style={{
                  display: 'flex', alignItems: 'center', width: '100%', fontSize: '15px', lineHeight: '26px', position: 'relative', borderRadius: '10px',
                  border: confirmPasswordFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)', background: 'transparent', cursor: 'text',
                  paddingTop: '4px', paddingBottom: '4px', paddingInline: '10px', marginTop: '4px', marginBottom: '12px', height: '40px', boxSizing: 'border-box'
                }}
              >
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password..."
                  aria-label="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  style={{ fontSize: 'inherit', lineHeight: 'inherit', border: 'none', background: 'none', width: '100%', display: 'block', resize: 'none', padding: '0px 28px 0 0', outline: 'none' }}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: 'rgba(0,0,0,0.6)'
                  }}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.94 17.94C16.23 19.22 14.2 20 12 20 5.48 20 1 12.99 1 12.99S3.29 9.42 6.56 7.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.9 5.96C10.57 5.82 11.28 5.75 12 5.75c6.52 0 11 7 11 7s-1.18 1.83-3.24 3.43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14.12 9.88A3 3 0 0 1 12 15a3 3 0 0 1-3-3c0-.5.12-.98.33-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
              <p className={`text-xs ${confirmPassword && confirmPassword !== password ? 'text-red-600' : 'text-gray-500'}`}>
                {confirmPassword && confirmPassword !== password ? 'Passwords do not match' : 'Re-enter your password'}
              </p>
            </div>
          )}
          {step === 4 && (
            <div>
              {/* Hidden file input used for picking image */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
                style={{ display: 'none' }}
              />

              {avatarPreview ? (
                <>
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-28 h-28 rounded-full object-cover border border-gray-300 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        aria-label="Remove avatar"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm"
                        title="Remove"
                      >
                        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
                          <path d="M4 4 L12 12 M12 4 L4 12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black/70 rounded-full group"
                    aria-label="Upload avatar"
                  >
                    <div
                      className="w-28 h-28 rounded-full border border-gray-300 shadow-sm overflow-hidden flex items-center justify-center"
                      style={{ background: emojiBg }}
                    >
                      <span className="text-5xl select-none" aria-hidden="true">{emoji}</span>
                    </div>
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-sm opacity-90 group-hover:opacity-100">
                      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
                        <path d="M8 3.2v9.6M3.2 8h9.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cropper Modal */}
          {cropOpen && cropImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white/90 backdrop-blur rounded-2xl w-full max-w-lg mx-4 shadow-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 pt-4 pb-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Adjust your avatar</h3>
                  <p className="text-xs text-gray-500 mt-1">Drag to position, use the slider to zoom. We’ll crop it to a perfect circle.</p>
                </div>
                <div className="relative bg-gray-50" style={{ height: 360 }}>
                  <Cropper
                    image={cropImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                  />
                </div>
                <div className="px-5 py-4 bg-white/80 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Zoom out"
                      className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50"
                      onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.1) * 10) / 10))}
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
                        <path d="M3.2 8h9.6" stroke="#111" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-black"
                      aria-label="Zoom"
                    />
                    <button
                      type="button"
                      aria-label="Zoom in"
                      className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-50"
                      onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10))}
                    >
                      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
                        <path d="M8 3.2v9.6M3.2 8h9.6" stroke="#111" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                    <span className="text-xs text-gray-500 tabular-nums w-14 text-right">{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 px-3 rounded-full border border-gray-300 text-sm hover:bg-gray-50"
                      >
                        Re-pick
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={cancelCrop} className="h-9 px-4 rounded-full border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
                      <button type="button" onClick={applyCrop} className="h-9 px-4 rounded-full bg-black text-white text-sm">Use photo</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 5 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of birth</label>
              {!useFallbackDob ? (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%', fontSize: '15px', lineHeight: '26px', position: 'relative', borderRadius: '10px',
                    border: dobFocused ? '1px solid #000' : '1px solid rgba(15, 15, 15, 0.1)', background: 'transparent', cursor: 'text',
                    paddingTop: '4px', paddingBottom: '4px', paddingInline: '10px', marginTop: '4px', marginBottom: '12px', height: '40px', boxSizing: 'border-box'
                  }}
                >
                  <input
                    type="date"
                    aria-label="Date of birth"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    onFocus={() => setDobFocused(true)}
                    onBlur={() => setDobFocused(false)}
                    style={{ fontSize: 'inherit', lineHeight: 'inherit', border: 'none', background: 'none', width: '100%', display: 'block', resize: 'none', padding: 0, outline: 'none' }}
                  />
                </div>
              ) : (
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <select
                    ref={dobMonthRef}
                    aria-label="Month"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                    required
                  >
                    <option value="" disabled>MM</option>
                    {months.map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    ref={dobDayRef}
                    aria-label="Day"
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                    required
                  >
                    <option value="" disabled>DD</option>
                    {daysInMonth.map((d) => (
                      <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    ref={dobYearRef}
                    aria-label="Year"
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                    required
                  >
                    <option value="" disabled>YYYY</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="text-sm font-medium text-black hover:underline disabled:opacity-50"
            >
              Back
            </button>
            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={step === 0 && (usernameChecking || usernameAvailable === false)}
                className={`h-10 px-6 rounded-full text-white text-sm font-medium ${step === 0 && (usernameChecking || usernameAvailable === false) ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'}`}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="h-10 px-6 rounded-full bg-black text-white text-sm font-medium disabled:opacity-70"
              >
                {loading ? 'Saving...' : 'Finish'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
