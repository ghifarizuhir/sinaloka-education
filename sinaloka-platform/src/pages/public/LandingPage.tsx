import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { institutionPublicService } from '@/src/services/institutionPublic.service';
import { Skeleton } from '@/src/components/UI';
import { getTemplateConfig } from './templates/template-config';
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  const template = getTemplateConfig(data.landing_template);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingHero data={data} template={template} />
      <LandingStats stats={data.stats} brandColor={data.brand_color} template={template} />
      <LandingFeatures features={data.landing_features} brandColor={data.brand_color} template={template} />
      <LandingSubjects subjects={data.subjects} brandColor={data.brand_color} template={template} />
      <LandingAbout text={data.landing_about} brandColor={data.brand_color} template={template} />
      <LandingGallery images={data.gallery_images} template={template} />
      <LandingContact data={data} template={template} />
      <LandingFooterCTA data={data} template={template} />
      <WhatsAppFAB number={data.whatsapp_number} />
    </div>
  );
}
