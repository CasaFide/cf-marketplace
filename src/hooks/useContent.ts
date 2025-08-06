
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useContent = () => {

  // Fetch public properties (no auth required, e.g. is_available = true)
  const getPublicProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_available', true);
      if (error) throw error;
      return data;
    } catch (error) {
      return { error };
    }
  }, []);

  // Fetch private properties (e.g. properties for the current user/host)
  const getPrivateProperties = useCallback(async () => {
    try {
      // Assumes RLS is set up so only the user's own properties are returned
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', supabase.auth.getUser()?.data?.user?.id || '');
      if (error) throw error;
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
