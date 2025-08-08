import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContent } from '@/hooks/useContent';
import { Input } from '@/components/ui/input';
// MapLibre GL JS (React-friendly)
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
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
  const [view, setView] = useState<'list' | 'map'>('list');
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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

  // Map: Only show properties with valid lat/lon
  const filteredWithCoords = filtered.filter(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
  );

  // MapLibre setup
  useEffect(() => {
    if (view !== 'map' || !mapContainer.current) return;
    if (mapRef.current) return; // Only init once
    if (filteredWithCoords.length === 0) return;

    // Center on first property or fallback
    const first = filteredWithCoords[0];
    const center: [number, number] = [
      typeof first?.longitude === 'number' ? first.longitude : 0,
      typeof first?.latitude === 'number' ? first.latitude : 0,
    ];
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'carto-positron': {
            type: 'raster',
            tiles: [
              'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO'
          }
        },
        layers: [
          {
            id: 'carto-positron',
            type: 'raster',
            source: 'carto-positron',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center,
      zoom: 11,
    });

    // --- CLUSTERING IMPLEMENTATION ---
    // Convert properties to GeoJSON FeatureCollection
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: filteredWithCoords.map((property) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [property.longitude!, property.latitude!] as [number, number],
        },
        properties: {
          ...property,
          _id: property.id,
        },
      })),
    };

    mapRef.current.on('load', () => {
      // Add source with clustering
      mapRef.current!.addSource('properties', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      mapRef.current!.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#2563eb',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18, 10, 22, 30, 28
          ],
          'circle-opacity': 0.85,
        },
      });
      // Cluster count labels
      mapRef.current!.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 14,
        },
        paint: {
          'text-color': '#fff',
        },
      });
      // Unclustered points (invisible, we use HTML markers)
      mapRef.current!.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 0.1,
          'circle-opacity': 0,
        },
      });

      // Dynamically add HTML markers only for visible, unclustered points
      let htmlMarkers: maplibregl.Marker[] = [];
      function updateHtmlMarkers() {
        // Remove old markers
        htmlMarkers.forEach(m => m.remove());
        htmlMarkers = [];
        if (!mapRef.current) return;
        // Get visible unclustered features
        const features = mapRef.current.querySourceFeatures('properties', {
          sourceLayer: undefined,
          filter: ['!', ['has', 'point_count']],
        });
        features.forEach((feature) => {
          const property = feature.properties as any;
          const coords = (feature.geometry as any).coordinates as [number, number];
          const el = document.createElement('div');
          el.className = 'marker';
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.background = 'rgba(0,123,255,0.9)';
          el.style.borderRadius = '50%';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.cursor = 'pointer';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          el.innerHTML = '🏠';

          // Popup content with improved styling
          const popupContent = document.createElement('div');
          popupContent.style.minWidth = '220px';
          popupContent.style.maxWidth = '260px';
          popupContent.style.padding = '0';
          popupContent.style.background = 'white';
          popupContent.style.borderRadius = '8px';
          popupContent.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)';
          popupContent.style.overflow = 'hidden';
          let imagesArr: string[] = [];
          if (Array.isArray(property.images)) {
            imagesArr = property.images;
          } else if (typeof property.images === 'string') {
            try {
              const parsed = JSON.parse(property.images);
              if (Array.isArray(parsed)) imagesArr = parsed;
            } catch { }
          }
          const imageUrl = imagesArr.length > 0 ? imagesArr[0] : '';
          popupContent.innerHTML = `
            ${imageUrl ? `<img src="${imageUrl}" alt="${property.title}" style="width:100%;height:110px;object-fit:cover;display:block;" />` : ''}
            <div style="padding:12px 14px 10px 14px;">
              <div style="font-weight:600;font-size:1.08rem;line-height:1.3;margin-bottom:2px;color:#1e293b;">${property.title}</div>
              <div style="color:#64748b;font-size:0.97rem;margin-bottom:6px;">${property.city}, ${property.country}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:1.1rem;font-weight:500;color:#2563eb;">${property.currency} ${property.price_per_month}</span>
                <span style="font-size:0.95rem;color:#64748b;">/month</span>
              </div>
              <div style="display:flex;gap:10px;margin-bottom:10px;">
                <span style="font-size:0.93rem;color:#475569;">🛏️ ${property.bedrooms} bd</span>
                <span style="font-size:0.93rem;color:#475569;">🛁 ${property.bathrooms} ba</span>
              </div>
              <button id="popup-btn-${property._id}" style="width:100%;background:#2563eb;color:white;padding:7px 0 7px 0;border:none;border-radius:5px;font-weight:500;font-size:1rem;cursor:pointer;transition:background 0.15s;">View Details</button>
            </div>
          `;
          const popup = new maplibregl.Popup({ offset: 18 }).setDOMContent(popupContent);

          const marker = new maplibregl.Marker(el)
            .setLngLat(coords)
            .setPopup(popup)
            .addTo(mapRef.current!);
          htmlMarkers.push(marker);

          marker.getElement().addEventListener('click', () => {
            setTimeout(() => {
              const btn = document.getElementById(`popup-btn-${property._id}`);
              if (btn) {
                btn.onclick = () => {
                  handleViewDetails(property);
                };
              }
            }, 0);
          });
        });
      }

      // Initial marker render
      updateHtmlMarkers();
      // Update markers on map move/zoom
      mapRef.current!.on('move', updateHtmlMarkers);
      mapRef.current!.on('zoom', updateHtmlMarkers);
      // Clean up markers on map remove
      mapRef.current!.on('remove', () => {
        htmlMarkers.forEach(m => m.remove());
        htmlMarkers = [];
      });

      // Cluster click: zoom in
      mapRef.current!.on('click', 'clusters', (e: any) => {
        const features = mapRef.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        (mapRef.current!.getSource('properties') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          const coords = (features[0].geometry as any).coordinates as [number, number];
          // Add a zoom offset for a more obvious "explode" effect
          mapRef.current!.easeTo({ center: coords, zoom: zoom + 1 });
        });
      });
    });

    // Clean up on unmount or view change
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filteredWithCoords.length]);

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Search Properties</h1>
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-3xl mx-auto">
          <Input
            placeholder="Search by title, city, or country..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2 mt-2 md:mt-0">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              onClick={() => setView('list')}
            >
              List
            </Button>
            <Button
              variant={view === 'map' ? 'default' : 'outline'}
              onClick={() => setView('map')}
              disabled={filteredWithCoords.length === 0}
            >
              Map
            </Button>
          </div>
        </div>
        {view === 'list' ? (
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
        ) : (
          <div className="w-full h-[60vh] rounded-lg overflow-hidden border relative">
            {filteredWithCoords.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No properties with location data.</div>
            ) : (
              <div ref={mapContainer} className="w-full h-full" />
            )}
          </div>
        )}
        <PropertyDetailsModal open={modalOpen} onClose={handleCloseModal} property={selectedProperty} />
      </div>
    </>
  );
};

export default SearchPage;
