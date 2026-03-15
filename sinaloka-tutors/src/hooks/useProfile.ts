import { useAuth } from './useAuth';

export function useProfile() {
  const { profile, isLoading, refreshProfile } = useAuth();
  return { data: profile, isLoading, refetch: refreshProfile };
}
