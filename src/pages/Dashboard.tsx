import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { CreatePropertyDetailsModal } from '@/components/CreatePropertyDetailsModal';
import type { Database } from '@/integrations/supabase/types';
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];

interface Match {
  id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | null;
  message: string | null;
  property: {
    title: string;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    price_per_month: number;
    currency: string;
    city: string;
    country: string;
  };
  host_profile: {
    full_name: string;
    avatar_url: string | null;
  };
  tenant_profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // Create property handler
  const handleCreateProperty = async (property: PropertyInsert) => {
    // Set host_id to current user
    if (!user) return;
    const propertyWithHost = { ...property, host_id: user.id };
    const { error } = await supabase.from('properties').insert([propertyWithHost]);
    if (!error) {
      // Optionally, refetch properties or show a toast
      toast({ title: 'Property created!' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          property:properties(
            title,
            property_type,
            bedrooms,
            bathrooms,
            price_per_month,
            currency,
            city,
            country
          ),
          host_profile:profiles!matches_host_id_fkey(
            full_name,
            avatar_url
          ),
          tenant_profile:profiles!matches_tenant_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'accepted': return 'default';
      case 'active': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredMatches = (status: string) => {
    return matches.filter(match => match.status === status);
  };

  const activeMatches = matches.filter(match => match.status === 'active');
  const pendingMatches = matches.filter(match => match.status === 'pending');

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
              <p className="text-muted-foreground">
                Manage your rental connections and active leases
              </p>
            </div>
            <button
              className="bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90 transition"
              onClick={() => setCreateModalOpen(true)}
            >
              + Create New Property
            </button>
          </div>
      <CreatePropertyDetailsModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateProperty}
      />

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">{t('myMatches')}</TabsTrigger>
              <TabsTrigger value="active">{t('activeRentals')} ({activeMatches.length})</TabsTrigger>
              <TabsTrigger value="pending">{t('pendingRequests')} ({pendingMatches.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {matches.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">{t('noMatches')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {matches.map((match) => (
                    <Card key={match.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{match.property.title}</CardTitle>
                            <CardDescription>
                              {match.property.city}, {match.property.country} • 
                              {match.property.bedrooms} {t('bedrooms')} • 
                              {match.property.bathrooms} {t('bathrooms')}
                            </CardDescription>
                          </div>
                          <Badge variant={getStatusColor(match.status)}>
                            {t(match.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Host</p>
                            <p className="text-muted-foreground">
                              {match.host_profile?.full_name || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">Tenant</p>
                            <p className="text-muted-foreground">
                              {match.tenant_profile?.full_name || 'Unknown'}
                            </p>
                          </div>
                          {match.monthly_rent && (
                            <div>
                              <p className="font-medium">Monthly Rent</p>
                              <p className="text-muted-foreground">
                                {match.property.currency} {match.monthly_rent}
                              </p>
                            </div>
                          )}
                          {match.start_date && (
                            <div>
                              <p className="font-medium">Start Date</p>
                              <p className="text-muted-foreground">
                                {new Date(match.start_date).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                        {match.message && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">{match.message}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              <div className="grid gap-4">
                {activeMatches.map((match) => (
                  <Card key={match.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{match.property.title}</CardTitle>
                      <CardDescription>
                        Active rental • {match.property.city}, {match.property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Monthly Rent</p>
                          <p className="text-lg font-bold text-primary">
                            {match.property.currency} {match.monthly_rent || match.property.price_per_month}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Lease Period</p>
                          <p className="text-muted-foreground">
                            {match.start_date && match.end_date
                              ? `${new Date(match.start_date).toLocaleDateString()} - ${new Date(match.end_date).toLocaleDateString()}`
                              : 'Ongoing'
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {activeMatches.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No active rentals</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <div className="grid gap-4">
                {pendingMatches.map((match) => (
                  <Card key={match.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{match.property.title}</CardTitle>
                      <CardDescription>
                        Pending approval • {match.property.city}, {match.property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Requested rent:</span>{' '}
                          {match.property.currency} {match.monthly_rent || match.property.price_per_month} {t('perMonth')}
                        </p>
                        {match.message && (
                          <p className="text-sm">
                            <span className="font-medium">Message:</span> {match.message}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingMatches.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">No pending requests</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Dashboard;