
import { useCallback } from 'react';
import { apiFetch } from '@/integrations/apiClient';


export const useContent = () => {

  // Fetch public properties (no auth required, e.g. is_available = true)
  const getPublicProperties = useCallback(async () => {
    try {
      const data = await apiFetch('/properties?available=true');
      return data;
    } catch (error) {
      return { error };
    }
  }, []);

  // Fetch private properties (e.g. properties for the current user/host)
  const getPrivateProperties = useCallback(async () => {
    try {
      // Backend should use auth token to return only properties for current host
      const data = await apiFetch('/properties?mine=true');
      return data;
    } catch (error) {
      return { error };
    }
  }, []);

  return {
    getPublicProperties,
    getPrivateProperties,
  };
};
