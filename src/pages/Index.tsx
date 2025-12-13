import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useContent } from '@/hooks/useContent';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PropertyDetailsModal } from '@/components/PropertyDetailsModal';
import type { Database } from '@/integrations/supabase/types';

type Property = Database['public']['Tables']['properties']['Row'];
import { Search, MapPin, Users, Key, Heart } from 'lucide-react';
import heroImage from '@/assets/hero-home.jpeg';
import apartmentImage from '@/assets/featured-apartment.jpg';

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { getPublicProperties } = useContent();
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoadingProperties(true);
      setPropertiesError(null);
      const result = await getPublicProperties();
      if (Array.isArray(result)) {
        setFeaturedProperties(result);
      } else if (result?.error) {
        setPropertiesError((result.error && typeof (result.error as any).message === 'string') ? (result.error as any).message : 'Failed to load properties');
      }
      setLoadingProperties(false);
    };
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const steps = [
    {
      icon: Search,
      title: t('searchStep'),
      description: "Browse through thousands of verified rental properties",
    },
    {
      icon: Heart,
      title: t('matchStep'),
      description: "Connect with property owners and express interest",
    },
    {
      icon: Key,
      title: t('moveStep'),
      description: "Finalize agreements and start your rental journey",
    },
  ];

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

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">{t('heroTitle')}</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">{t('heroSubtitle')}</p>

          <form className="flex max-w-md mx-auto bg-white rounded-full p-2" onSubmit={handleSearchSubmit}>
            <div className="flex-1 flex items-center pl-4">
              <MapPin className="h-5 w-5 text-muted-foreground mr-2" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="border-0 focus-visible:ring-0 text-foreground"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <Button size="lg" className="rounded-full px-8" type="submit">
              <Search className="h-5 w-5" />
            </Button>
          </form>

          {!user && (
            <div className="mt-8 space-x-4">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                <Link to="/auth">{t('login')}</Link>
              </Button>
              <Button size="lg" asChild>
                <Link to="/auth?mode=signup">{t('signup')}</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('featuredProperties')}</h2>
            <p className="text-muted-foreground text-lg">Discover handpicked properties in prime locations</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingProperties ? (
              <div className="col-span-full text-center py-8">Loading properties...</div>
            ) : propertiesError ? (
              <div className="col-span-full text-center text-red-500 py-8">{propertiesError}</div>
            ) : featuredProperties.length === 0 ? (
              <div className="col-span-full text-center py-8">No properties found.</div>
            ) : (
              featuredProperties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : apartmentImage}
                      alt={property.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-4 left-4 bg-white/90 text-foreground">{property.property_type}</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{property.title}</CardTitle>
                    <CardDescription className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{property.bedrooms} {t('bedrooms')}</span>
                        <span>{property.bathrooms} {t('bathrooms')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{property.currency} {property.price_per_month}</div>
                        <div className="text-sm text-muted-foreground">{t('perMonth')}</div>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline" onClick={() => handleViewDetails(property)}>
                      {t('viewDetails')}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <PropertyDetailsModal open={modalOpen} onClose={handleCloseModal} property={selectedProperty} />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('howItWorks')}</h2>
            <p className="text-muted-foreground text-lg">Simple steps to find your perfect rental home</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <step.icon className="h-10 w-10 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Dream Home?</h2>
          <p className="text-lg mb-8 opacity-90">Join thousands of satisfied renters who found their perfect match</p>
          {user ? (
            <Button size="lg" variant="secondary" asChild>
              <Link to="/dashboard">{t('dashboard')}</Link>
            </Button>
          ) : (
            <Button size="lg" variant="secondary" asChild>
              <Link to="/auth?mode=signup">Get Started Today</Link>
            </Button>
          )}
        </div>
      </section>
    </>
  );
};

export default Index;
