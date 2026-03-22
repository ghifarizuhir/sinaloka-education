import React, { useRef, useState } from 'react';
import { Star, CheckCircle2, LogOut, ChevronRight, Pencil } from 'lucide-react';
import type { TutorProfile } from '../types';
import { CropModal } from '../components/CropModal';
import api from '../api/client';

interface ProfilePageProps {
  profile: TutorProfile | null;
  onLogout: () => void;
  onEditProfile: () => void;
  onAvatarUpdate?: () => void;
}

export function ProfilePage({ profile, onLogout, onEditProfile, onAvatarUpdate }: ProfilePageProps) {
  const tutorName = profile?.name ?? 'Tutor';
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col items-center text-center pt-8">
        <div className="mb-6">
          <div className="cursor-pointer relative" onClick={() => avatarInputRef.current?.click()}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url.startsWith('http') ? profile.avatar_url : `${import.meta.env.VITE_API_URL}/api/uploads/${profile.avatar_url}`}
                alt="Avatar"
                className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white dark:border-zinc-800 object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-4xl font-bold text-zinc-500">
                {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-zinc-900 dark:bg-white rounded-full flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white dark:text-zinc-900">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setCropSrc(reader.result as string);
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
          />

          {cropSrc && (
            <CropModal
              imageSrc={cropSrc}
              onClose={() => setCropSrc(null)}
              onCrop={async (blob) => {
                setCropSrc(null);
                const formData = new FormData();
                formData.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
                await api.post('/api/tutor/profile/avatar', formData);
                onAvatarUpdate?.();
              }}
            />
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">{tutorName}</h1>
        <p className="text-brand text-xs font-bold uppercase tracking-wider mb-4">{profile?.tutor_subjects?.map(ts => ts.subject.name).join(', ') ?? ''} Tutor</p>
        <div className="flex gap-4">
          <div className="bg-surface-muted px-4 py-2 rounded-full border border-surface-border flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold">{profile?.rating?.toFixed(1) ?? '0.0'}</span>
          </div>
          <div className="bg-surface-muted px-4 py-2 rounded-full border border-surface-border flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand" />
            <span className="text-sm font-bold">Verified</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={onEditProfile}
          className="w-full flex items-center justify-between p-5 rounded-xl bg-surface-muted border border-surface-border hover:bg-surface-elevated transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center text-subtle group-hover:text-brand">
              <Pencil className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">Edit Profil</span>
          </div>
          <ChevronRight className="w-5 h-5 text-subtle" />
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between p-5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-red-400">Keluar Platform</span>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400/50" />
        </button>
      </div>
    </div>
  );
}
