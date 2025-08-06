import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContent } from '@/hooks/useContent';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { PropertyDetailsModal } from '@/components/PropertyDetailsModal';
import type { Database } from '@/integrations/supabase/types';

type Property = Database['public']['Tables']['properties']['Row'];

const SearchPage = () => {
  const { getPublicProperties } = useContent();
  const [properties, setProperties] = useState<Property[]>([]);
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProperty(null);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      const result = await getPublicProperties();
      if (Array.isArray(result)) {
        setProperties(result);
      } else if (result?.error) {
        setError(result.error.message || 'Failed to load properties');
      }
      setLoading(false);
    };
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofill input if query param changes
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Simple client-side filter for demo
  const filtered = properties.filter((p) =>
    p.title?.toLowerCase().includes(query.toLowerCase()) ||
    p.city?.toLowerCase().includes(query.toLowerCase()) ||
    p.country?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Search Properties</h1>
      <div className="mb-8 max-w-md mx-auto">
        <Input
          placeholder="Search by title, city, or country..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading properties...</div>
        ) : error ? (
          <div className="col-span-full text-center text-red-500 py-8">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-8">No properties found.</div>
        ) : (
          filtered.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : ''}
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
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{property.bedrooms} bedrooms</span>
                    <span>{property.bathrooms} bathrooms</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {property.currency} {property.price_per_month}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      per month
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" onClick={() => handleViewDetails(property)}>
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <PropertyDetailsModal open={modalOpen} onClose={handleCloseModal} property={selectedProperty} />
      </div>
    </>
  );
};

export default SearchPage;
