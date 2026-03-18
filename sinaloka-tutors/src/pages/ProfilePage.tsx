import React from 'react';
import { Star, CheckCircle2, LogOut, ChevronRight, Pencil } from 'lucide-react';
import type { TutorProfile } from '../types';

interface ProfilePageProps {
  profile: TutorProfile | null;
  onLogout: () => void;
  onEditProfile: () => void;
}

export function ProfilePage({ profile, onLogout, onEditProfile }: ProfilePageProps) {
  const tutorName = profile?.name ?? 'Tutor';

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col items-center text-center pt-8">
        <div className="mb-6">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-lime-400 shadow-[0_0_40px_rgba(163,230,53,0.3)]">
            <img src={profile?.avatar ?? ''} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">{tutorName}</h1>
        <p className="text-lime-400 text-xs font-bold uppercase tracking-wider mb-4">{profile?.tutor_subjects?.map(ts => ts.subject.name).join(', ') ?? ''} Tutor</p>
        <div className="flex gap-4">
          <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold">{profile?.rating?.toFixed(1) ?? '0.0'}</span>
          </div>
          <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-400" />
            <span className="text-sm font-bold">Verified</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={onEditProfile}
          className="w-full flex items-center justify-between p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-lime-400">
              <Pencil className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">Edit Profil</span>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
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
