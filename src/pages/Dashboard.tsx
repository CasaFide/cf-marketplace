import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { CreatePropertyDetailsModal } from '@/components/CreatePropertyDetailsModal';
import { PropertyDetailsModal } from '@/components/PropertyDetailsModal';
import { UpdatePropertyDetailsModal } from '@/components/UpdatePropertyDetailsModal';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

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
    bedrooms: number | null;
    bathrooms: number | null;
    price_per_month: number;
    currency: string | null;
    city: string;
    country: string;
  };
  host_profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
  tenant_profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userProperties, setUserProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  // Create property handler
  const handleCreateProperty = async (property: PropertyInsert) => {
    // Set host_id to current user
    if (!user) return;
    const propertyWithHost = { ...property, host_id: user.id };
    const { error } = await supabase.from('properties').insert([propertyWithHost]);
    if (!error) {
      // Refetch properties to show the new one
      fetchUserProperties();
      toast({ title: 'Property created!' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchMatches();
      fetchUserProperties();
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

  const handleViewPropertyDetails = (property: any) => {
    setSelectedProperty(property);
    setPropertyModalOpen(true);
  };

  const handleClosePropertyModal = () => {
    setPropertyModalOpen(false);
    setSelectedProperty(null);
  };

  const handleUpdateProperty = (property: any) => {
    setSelectedProperty(property);
    setUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setUpdateModalOpen(false);
    setSelectedProperty(null);
  };

  const handlePropertyUpdate = async (property: PropertyUpdate) => {
    if (!selectedProperty) return;
    
    const { error } = await supabase
      .from('properties')
      .update(property)
      .eq('id', selectedProperty.id);
      
    if (!error) {
      // Refetch properties to show the updated one
      fetchUserProperties();
      toast({ title: 'Property updated successfully!' });
      setUpdateModalOpen(false);
      setSelectedProperty(null);
    } else {
      toast({ title: 'Error updating property', variant: 'destructive' });
    }
  };

  const fetchUserProperties = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserProperties(data || []);
    } catch (error) {
      console.error('Error fetching user properties:', error);
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
      <PropertyDetailsModal 
        open={propertyModalOpen} 
        onClose={handleClosePropertyModal} 
        property={selectedProperty} 
      />
      {selectedProperty && (
        <UpdatePropertyDetailsModal
          open={updateModalOpen}
          onClose={handleCloseUpdateModal}
          property={selectedProperty}
          onUpdate={handlePropertyUpdate}
        />
      )}

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">{t('myMatches')}</TabsTrigger>
              <TabsTrigger value="active">{t('activeRentals')} ({activeMatches.length})</TabsTrigger>
              <TabsTrigger value="pending">{t('pendingRequests')} ({pendingMatches.length})</TabsTrigger>
              <TabsTrigger value="properties">My Properties ({userProperties.length})</TabsTrigger>
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
                              {match.property.bedrooms || 0} {t('bedrooms')} • 
                              {match.property.bathrooms || 0} {t('bathrooms')}
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
                                {match.property.currency || 'EUR'} {match.monthly_rent}
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
                            {match.property.currency || 'EUR'} {match.monthly_rent || match.property.price_per_month}
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
                          {match.property.currency || 'EUR'} {match.monthly_rent || match.property.price_per_month} {t('perMonth')}
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

            <TabsContent value="properties" className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : '/placeholder.svg'}
                        alt={property.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-4 left-4 bg-white/90 text-foreground">
                        {property.property_type}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl">{property.title}</CardTitle>
                      <CardDescription className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{property.bedrooms || 0} bedrooms</span>
                          <span>{property.bathrooms || 0} bathrooms</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {property.currency || 'EUR'} {property.price_per_month}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            per month
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          variant="outline" 
                          onClick={() => handleViewPropertyDetails(property)}
                        >
                          View Details
                        </Button>
                        <Button 
                          className="flex-1" 
                          variant="default" 
                          onClick={() => handleUpdateProperty(property)}
                        >
                          Update Property
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {userProperties.length === 0 && (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">You haven't created any properties yet</p>
                        <Button
                          onClick={() => setCreateModalOpen(true)}
                        >
                          Create Your First Property
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
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