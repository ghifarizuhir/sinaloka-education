import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getInstitutionSlug } from '@/src/lib/subdomain';
import { institutionPublicService } from '@/src/services/institutionPublic.service';
import type { InstitutionPublicData } from '@/src/types/institution-public';

interface InstitutionContextType {
  institution: InstitutionPublicData | null;
  isLoading: boolean;
  error: 'not_found' | 'network_error' | null;
  slug: string | null;
  isSuperAdminMode: boolean;
}

const InstitutionContext = createContext<InstitutionContextType>({
  institution: null,
  isLoading: true,
  error: null,
  slug: null,
  isSuperAdminMode: false,
});

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [institution, setInstitution] = useState<InstitutionPublicData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<'not_found' | 'network_error' | null>(null);

  const slug = getInstitutionSlug();
  // No slug means we're on a non-institution hostname (platform.sinaloka.com, localhost, or IP).
  // This is NOT a security check — all auth is server-side via JWT roles.
  // Used only for routing decisions (show generic login vs institution-specific landing page).
  const isSuperAdminMode = slug === null;

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    institutionPublicService
      .getBySlug(slug)
      .then((data) => {
        setInstitution(data);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setError('not_found');
        } else {
          setError('network_error');
        }
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  return (
    <InstitutionContext.Provider
      value={{ institution, isLoading, error, slug, isSuperAdminMode }}
    >
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  return useContext(InstitutionContext);
}
