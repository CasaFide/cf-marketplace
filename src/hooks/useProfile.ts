import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { apiFetch } from '@/integrations/apiClient';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch('/profiles/me')
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        setError(err?.message || JSON.stringify(err));
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return { profile, loading, error };
}
