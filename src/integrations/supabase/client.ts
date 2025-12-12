// Supabase client removed. Use the REST API client instead.
// If any file still imports `supabase`, this shim will throw a helpful error at runtime.

const shim = new Proxy({}, {
  get() {
    throw new Error('Supabase client has been removed. Use `@/integrations/apiClient` and your REST endpoints instead.');
  }
});

export const supabase: any = shim;