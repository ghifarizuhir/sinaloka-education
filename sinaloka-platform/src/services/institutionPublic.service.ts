import api from '@/src/lib/api';
import type { InstitutionPublicData } from '@/src/types/institution-public';

export const institutionPublicService = {
  getBySlug: (slug: string) =>
    api
      .get<InstitutionPublicData>(`/api/institutions/public/${slug}`)
      .then((r) => r.data),
};
