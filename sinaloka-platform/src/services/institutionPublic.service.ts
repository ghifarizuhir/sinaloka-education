import api from '@/src/lib/api';
import type { InstitutionPublicData } from '@/src/types/institution-public';
import type { LandingPageData } from '@/src/types/landing';

export const institutionPublicService = {
  getBySlug: (slug: string) =>
    api
      .get<InstitutionPublicData>(`/api/institutions/public/${slug}`)
      .then((r) => r.data),
  getLanding: (slug: string) =>
    api.get<LandingPageData>(`/api/institutions/public/${slug}/landing`).then((r) => r.data),
};
