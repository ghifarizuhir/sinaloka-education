import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { institutionPublicService } from '@/src/services/institutionPublic.service';
import { Skeleton } from '@/src/components/UI';
import { LandingHero } from './components/LandingHero';
import { LandingStats } from './components/LandingStats';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingSubjects } from './components/LandingSubjects';
import { LandingAbout } from './components/LandingAbout';
import { LandingGallery } from './components/LandingGallery';
import { LandingContact } from './components/LandingContact';
import { LandingFooterCTA } from './components/LandingFooterCTA';
import { WhatsAppFAB } from './components/WhatsAppFAB';

export function LandingPage() {
  const { institution, slug } = useInstitution();

  const { data, isLoading } = useQuery({
    queryKey: ['landing', slug],
    queryFn: () => institutionPublicService.getLanding(slug!),
    enabled: !!slug && !!institution?.landing_enabled,
  });

  if (!institution?.landing_enabled) return <Navigate to="/login" replace />;

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingHero data={data} />
      <LandingStats stats={data.stats} brandColor={data.brand_color} />
      <LandingFeatures features={data.landing_features} brandColor={data.brand_color} />
      <LandingSubjects subjects={data.subjects} />
      <LandingAbout text={data.landing_about} />
      <LandingGallery images={data.gallery_images} />
      <LandingContact data={data} />
      <LandingFooterCTA data={data} />
      <WhatsAppFAB number={data.whatsapp_number} />
    </div>
  );
}
