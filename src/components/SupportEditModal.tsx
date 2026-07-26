import React, { useState, useRef, useEffect } from 'react';
import {  X, Camera, Upload, Trash2, Wand2, Minus, Plus, RotateCw, Share2, Twitter, Youtube , Loader2 } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/api/storage';
import { updateSupportProfile, SupportProfile } from '@/lib/api/support';
import { updateProfile } from '@/lib/api/profiles';
import { AmptiveSpinner } from '@/components/AmptiveSpinner';

interface SupportEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SupportProfile;
  onSave: (updatedProfile: SupportProfile) => void;
}

export default function SupportEditModal({ isOpen, onClose, profile, onSave }: SupportEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    support_tagline: profile.support_tagline || '',
    support_avatar_url: profile.support_avatar_url || profile.avatar_url || '',
    support_banner_url: profile.support_banner_url || '',
    support_socials: {
      x: profile.support_socials?.x || '',
      instagram: profile.support_socials?.instagram || '',
      youtube: profile.support_socials?.youtube || '',
      website: profile.support_socials?.website || '',
    },
  });

  const [previews, setPreviews] = useState({
    avatar: formData.support_avatar_url,
    banner: formData.support_banner_url,
  });

  // Cropper State
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<'avatar' | 'banner'>('avatar');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        full_name: profile.full_name || '',
        support_tagline: profile.support_tagline || '',
        support_avatar_url: profile.support_avatar_url || profile.avatar_url || '',
        support_banner_url: profile.support_banner_url || '',
        support_socials: {
          x: profile.support_socials?.x || '',
          instagram: profile.support_socials?.instagram || '',
          youtube: profile.support_socials?.youtube || '',
          website: profile.support_socials?.website || '',
        },
      });
      setPreviews({
        avatar: profile.support_avatar_url || profile.avatar_url || '',
        banner: profile.support_banner_url || '',
      });
    }
  }, [isOpen, profile]);

  // Helper: Create Image from URL
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (err) => reject(err));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  // Helper: Get Cropped Image Data URL
  async function getCroppedImg(imageSrc: string, pixelCrop: any, rotation = 0): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const rotRad = (rotation * Math.PI) / 180;
    // calculate bounding box of the rotated image
    const { width: bWidth, height: bHeight } = {
      width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
      height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
    };

    canvas.width = bWidth;
    canvas.height = bHeight;

    ctx.translate(bWidth / 2, bHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  // Helper: DataURL to Blob
  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (dataUrl: string, type: 'avatar' | 'banner') => {
    setLoading(true);
    setIsUploading(true);
    setUploadProgress(0);
    try {
      if (!profile.user_id) {
        throw new Error('User ID is missing from profile. Cannot upload image.');
      }

      const blob = dataURLtoBlob(dataUrl);
      const fileExt = 'jpg';
      const fileName = `${profile.user_id}/${type}-${Date.now()}.${fileExt}`;
      const file = new File([blob], fileName, { type: `image/${fileExt}` });

      const purpose = type === 'avatar' ? 'profile-picture' : 'community-image';
      const publicUrl = await uploadImage(file, purpose);

      setFormData(prev => ({
        ...prev,
        [type === 'avatar' ? 'support_avatar_url' : 'support_banner_url']: publicUrl
      }));
      setPreviews(prev => ({
        ...prev,
        [type]: publicUrl
      }));
      toast.success(`${type} updated`);
    } catch (error: any) {
      console.error(`Upload error details:`, error);
      toast.error(`Error uploading ${type}: ` + error.message);
    } finally {
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File is too large (max 5MB)');
        return;
      }
      const url = URL.createObjectURL(file);
      setCropImage(url);
      setCropMode(type);
      setCropOpen(true);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      // Reset input value so same file can be picked again
      e.target.value = '';
    }
  };

  const applyCrop = async () => {
    if (!cropImage || !croppedAreaPixels || isUploading) return;
    try {
      const dataUrl = await getCroppedImg(cropImage, croppedAreaPixels, rotation);
      await handleImageUpload(dataUrl, cropMode);
    } catch (err) {
      toast.error('Failed to crop image');
    } finally {
      setCropOpen(false);
      setCropImage(null);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log('Saving profile...');
      const updates = {
        full_name: formData.full_name,
        support_tagline: formData.support_tagline,
        support_message: formData.support_tagline,
        support_avatar_url: formData.support_avatar_url,
        support_banner_url: formData.support_banner_url,
        support_socials: formData.support_socials,
      };

      // Name and avatar now persist on the support profile itself (PATCH /support/),
      // so no /users/me sync is needed — and no first-and-last-name rule applies.
      const { ok, error } = await updateSupportProfile(updates);
      if (!ok) {
        console.error('updateSupportProfile error:', error);
        throw new Error(error);
      }

      // Banners aren't part of the support schema; keep them on the user's cover photo.
      if (formData.support_banner_url) {
        const profileResult = await updateProfile({ cover_photo: formData.support_banner_url });
        if (!profileResult.ok) {
          throw new Error(profileResult.error || 'Could not save your banner. Please try again.');
        }
      }

      onSave({ ...profile, ...updates });
      toast.success('Profile saved');
      onClose();
    } catch (error: any) {
      console.error('handleSave error:', error);
      toast.error('Error saving profile: ' + String(error?.message || ''));
    } finally {
      setLoading(false);
    }
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
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-900" />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Edit Page</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-1.5 bg-black text-white rounded-full font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Save
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Images Selection */}
            <div className="relative">
              {/* Banner */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {previews.banner ? (
                  <img src={previews.banner} className="w-full h-full object-cover brightness-90" alt="Banner" />
                ) : (
                  <div className="w-full h-full bg-blue-600/10" />
                )}

                {/* Progress Overlay for Banner */}
                {isUploading && uploadProgress < 100 && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/20" />
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * Math.max(1, uploadProgress)) / 100} className="text-white transition-all duration-300" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">{uploadProgress}%</span>
                    </div>
                    <p className="text-white text-[10px] font-bold uppercase mt-2 tracking-widest">Uploading banner</p>
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center gap-4">
                  <button 
                    disabled={loading}
                    onClick={() => bannerInputRef.current?.click()}
                    className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all disabled:opacity-50"
                  >
                    <Camera size={20} />
                  </button>
                  {previews.banner && !loading && (
                    <button 
                      onClick={() => {
                        setFormData(prev => ({ ...prev, support_banner_url: '' }));
                        setPreviews(prev => ({ ...prev, banner: '' }));
                      }}
                      className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={bannerInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'banner')}
                />
              </div>

              {/* Avatar */}
              <div className="absolute -bottom-16 left-6">
                <div className="relative w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md group">
                  {previews.avatar ? (
                    <img src={previews.avatar} className="w-full h-full object-cover brightness-90" alt="Avatar" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Upload size={32} className="text-gray-400" />
                    </div>
                  )}

                  {/* Progress Overlay for Avatar */}
                  {isUploading && uploadProgress < 100 && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <div className="relative w-12 h-12">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/20" />
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * Math.max(1, uploadProgress)) / 100} className="text-white transition-all duration-300" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">{uploadProgress}%</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <button 
                      disabled={loading}
                      onClick={() => avatarInputRef.current?.click()}
                      className="p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all disabled:opacity-50"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'avatar')}
                  />
                </div>
              </div>
            </div>

            {/* Spacer for overlapping avatar */}
            <div className="h-20" />


            {/* Input Fields */}
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-medium text-gray-500">
                    Name
                  </label>
                  <span className={`text-[10px] font-bold ${formData.full_name.length >= 50 ? 'text-red-500' : 'text-gray-400'}`}>
                    {formData.full_name.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.full_name}
                  maxLength={50}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-gray-900 font-medium"
                  placeholder="Enter your display name"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-medium text-gray-500">
                    {profile.profile_type === 'creator' ? 'Tell us about what you do' : 
                     profile.profile_type === 'business' ? 'Tell us about your business' : 
                     'Bio / Tagline'}
                  </label>
                  <span className={`text-[10px] font-bold ${formData.support_tagline.length >= 60 ? 'text-red-500' : 'text-gray-400'}`}>
                    {formData.support_tagline.length}/60
                  </span>
                </div>
                <textarea 
                  value={formData.support_tagline}
                  maxLength={60}
                  onChange={(e) => setFormData(prev => ({ ...prev, support_tagline: e.target.value }))}
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-gray-900 font-medium min-h-[100px] resize-none"
                  placeholder={
                    profile.profile_type === 'creator' ? "I am a creator who..." :
                    profile.profile_type === 'business' ? "We are a business that..." :
                    "Tell your supporters about yourself..."
                  }
                />
              </div>
            </div>

            {/* Social Links Section */}
            <div className="p-6 pt-0 space-y-6">
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  Social Presence
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* X / Twitter */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">X (Twitter)</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.487h2.039L6.486 3.24H4.298l13.311 17.4z" />
                        </svg>
                      </div>
                      <input 
                        type="text"
                        value={formData.support_socials.x}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          support_socials: { ...prev.support_socials, x: e.target.value } 
                        }))}
                        placeholder="twitter.com/..."
                        className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Instagram</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                      </div>
                      <input 
                        type="text"
                        value={formData.support_socials.instagram}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          support_socials: { ...prev.support_socials, instagram: e.target.value } 
                        }))}
                        placeholder="instagram.com/..."
                        className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* YouTube */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">YouTube</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400"><Youtube size={14} /></div>
                      <input 
                        type="text"
                        value={formData.support_socials.youtube}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          support_socials: { ...prev.support_socials, youtube: e.target.value } 
                        }))}
                        placeholder="youtube.com/..."
                        className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Website</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                      </div>
                      <input 
                        type="text"
                        value={formData.support_socials.website}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          support_socials: { ...prev.support_socials, website: e.target.value } 
                        }))}
                        placeholder="yourwebsite.com"
                        className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Alert */}
              <div className="p-4 bg-blue-900 text-white rounded-2xl space-y-2">
                <p className="text-xs font-medium leading-relaxed opacity-90">
                  Your support profile is independent of your main Amptive profile. 
                  Changes here only affect what your supporters see on this page.
                </p>
                <button className="text-xs font-bold underline hover:opacity-80 transition-opacity">
                  Learn more
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Cropper Overlay */}
        <AnimatePresence>
          {cropOpen && cropImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
            >
              <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <button onClick={() => setCropOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} className="text-gray-900" />
                  </button>
                  <h3 className="font-bold text-gray-900">Crop your {cropMode}</h3>
                  <button 
                    onClick={applyCrop}
                    disabled={isUploading}
                    className="px-6 py-1.5 bg-black text-white rounded-full font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Apply'}
                  </button>
                </div>
                
                <div className="relative flex-1 bg-gray-50 overflow-hidden">
                  <Cropper
                    image={cropImage}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={cropMode === 'avatar' ? 1 : 3}
                    cropShape={cropMode === 'avatar' ? 'round' : 'rect'}
                    showGrid={false}
                    onCropChange={setCrop}
                    onRotationChange={setRotation}
                    onZoomChange={setZoom}
                    onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                  />
                </div>

                <div className="p-6 bg-white space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 flex-1">
                      <Minus size={20} className="text-gray-400" />
                      <input 
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-black h-1.5 bg-gray-100 rounded-full appearance-none"
                      />
                      <Plus size={20} className="text-gray-400" />
                    </div>
                    
                    <button 
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-700 transition-all flex items-center gap-2 border border-gray-100"
                      title="Rotate"
                    >
                      <RotateCw size={20} />
                      <span className="text-xs font-bold">Rotate</span>
                    </button>
                  </div>
                  <p className="text-center text-xs text-gray-400">
                    {cropMode === 'avatar' ? 'Drag to position, use the slider to zoom. We’ll crop it to a perfect circle.' : 'Position your banner to look its best.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
    </AnimatePresence>
  );
}
