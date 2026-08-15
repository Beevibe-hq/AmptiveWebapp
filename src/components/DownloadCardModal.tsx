import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, Smartphone, Square, LayoutTemplate } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import SupportCard from '@/components/SupportCard';
import { SupportProfile } from '@/lib/api/support';

interface DownloadCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SupportProfile;
  displayName: string;
}

export type BackgroundType = 'transparent' | 'solid' | 'gradient';

interface BackgroundOption {
  id: string;
  name: string;
  type: BackgroundType;
  value: string;
  preview: string;
}

const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'none',
    name: 'No BG',
    type: 'transparent',
    value: 'transparent',
    preview: 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:6px_6px] bg-white',
  },
  {
    id: 'white',
    name: 'White',
    type: 'solid',
    value: '#FFFFFF',
    preview: 'bg-white border border-gray-200',
  },
  {
    id: 'offwhite',
    name: 'Off White',
    type: 'solid',
    value: '#F8FAFC',
    preview: 'bg-slate-50 border border-gray-200',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    type: 'gradient',
    value: 'linear-gradient(180deg, #94AAD3 0%, #F2C4BA 100%)',
    preview: 'bg-gradient-to-b from-[#94AAD3] to-[#F2C4BA]',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    type: 'gradient',
    value: 'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
    preview: 'bg-gradient-to-br from-[#4E65FF] to-[#92EFFD]',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    type: 'gradient',
    value: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
    preview: 'bg-gradient-to-br from-[#FA709A] to-[#FEE140]',
  },
];

type FramingFormat = 'fitted' | 'square' | 'story';

export default function DownloadCardModal({
  isOpen,
  onClose,
  profile,
  displayName,
}: DownloadCardModalProps) {
  const [selectedBg, setSelectedBg] = useState<BackgroundOption>(BACKGROUND_OPTIONS[0]);
  const [framing, setFraming] = useState<FramingFormat>('fitted');
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);

    try {
      const pixelRatio = framing === 'story' ? 2.5 : framing === 'square' ? 3 : 4;

      const dataUrl = await toPng(captureRef.current, {
        pixelRatio,
        cacheBust: true,
        backgroundColor: selectedBg.type === 'transparent' ? undefined : undefined,
        style: {
          transform: 'none',
        },
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${profile.username || 'tip'}-card-${selectedBg.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClose();
    } catch (err) {
      console.error('Download card high-res error, trying blob fallback:', err);
      try {
        const blob = await toBlob(captureRef.current, { pixelRatio: 2, cacheBust: true });
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${profile.username || 'tip'}-card-${selectedBg.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          onClose();
        }
      } catch (fallbackErr) {
        console.error('Download card fallback error:', fallbackErr);
        alert('Could not generate download. Please try again or take a screenshot.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getCanvasBackgroundStyle = (): React.CSSProperties => {
    if (selectedBg.type === 'transparent') {
      return { background: 'transparent' };
    }
    if (selectedBg.type === 'gradient') {
      return { background: selectedBg.value };
    }
    return { backgroundColor: selectedBg.value };
  };

  const getCardScaleClass = (): string => {
    if (framing === 'story') return 'transform scale-[0.80] sm:scale-[0.84] origin-center';
    if (framing === 'square') return 'transform scale-[0.80] sm:scale-[0.84] origin-center';
    return '';
  };

  const getFramingStyles = (): string => {
    if (framing === 'story') {
      return 'aspect-[9/16] w-full max-w-[400px] p-6 sm:p-8 flex items-center justify-center';
    }
    if (framing === 'square') {
      return 'aspect-square w-full max-w-[420px] p-6 sm:p-8 flex items-center justify-center';
    }
    return 'p-0 w-full max-w-[352px] flex items-center justify-center';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-gray-900" />
                </button>
                <h2 className="text-lg font-bold text-gray-900">Download Tip Card</h2>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="px-6 py-1.5 bg-black text-white rounded-full font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                {isExporting && <Loader2 size={16} className="animate-spin" />}
                <span>{isExporting ? 'Exporting...' : 'Download'}</span>
              </button>
            </div>

            {/* Form Content / Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Canvas Preview Area */}
              <div className="p-4 sm:p-6 bg-gray-50/80 rounded-2xl sm:rounded-3xl border border-gray-100 flex items-center justify-center min-h-[400px] overflow-hidden">
                <div
                  ref={captureRef}
                  style={getCanvasBackgroundStyle()}
                  className={`rounded-2xl transition-all duration-300 ${getFramingStyles()}`}
                >
                  <div className={`pointer-events-none w-full max-w-[352px] ${getCardScaleClass()}`}>
                    <SupportCard
                      name={displayName}
                      username={profile.username}
                      avatarUrl={profile.support_avatar_url || profile.avatar_url}
                      message={profile.support_message || profile.support_tagline || 'Level up your journey with me.'}
                      isDisplayOnly={true}
                      variant={profile.support_card_variant || 0}
                      profileType={profile.profile_type}
                    />
                  </div>
                </div>
              </div>

              {/* Card Framing Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  Card Framing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFraming('fitted')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                      framing === 'fitted'
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <LayoutTemplate size={16} />
                    <span>Card Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFraming('square')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                      framing === 'square'
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Square size={16} />
                    <span>Square (1:1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFraming('story')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                      framing === 'story'
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Smartphone size={16} />
                    <span>Story (9:16)</span>
                  </button>
                </div>
              </div>

              {/* Background Style Palette */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  Background Style
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {BACKGROUND_OPTIONS.map((opt) => {
                    const isSelected = selectedBg.id === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedBg(opt)}
                        className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900/10'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${opt.preview} shadow-xs flex items-center justify-center`}>
                          {isSelected && (
                            <Check
                              size={14}
                              className={
                                opt.id === 'white' || opt.id === 'offwhite' || opt.id === 'none' || opt.id === 'pastel'
                                ? 'text-gray-900'
                                : 'text-white'
                              }
                            />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 truncate w-full text-center">
                          {opt.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
