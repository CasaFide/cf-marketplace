import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';


import type { Database } from '@/integrations/supabase/types';
type Property = Database['public']['Tables']['properties']['Row'];

interface PropertyDetailsModalProps {
  open: boolean;
  onClose: () => void;
  property: Property | null;
}

export const PropertyDetailsModal = ({ open, onClose, property }: PropertyDetailsModalProps) => {
  if (!property) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{property.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4" />
            {property.address}, {property.city}, {property.country}
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          {Array.isArray(property.images) && property.images.length > 0 && (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
          )}
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge>{property.property_type}</Badge>
            <Badge>{property.bedrooms} bedrooms</Badge>
            <Badge>{property.bathrooms} bathrooms</Badge>
            <Badge>{property.max_guests} guests</Badge>
            <Badge>{property.currency} {property.price_per_month} / month</Badge>
            {property.is_available ? <Badge variant="default">Available</Badge> : <Badge variant="destructive">Unavailable</Badge>}
          </div>
          <div className="mb-2 text-muted-foreground">{property.description}</div>
          {property.amenities && property.amenities.length > 0 && (
            <div className="mb-2">
              <span className="font-semibold">Amenities:</span> {property.amenities.join(', ')}
            </div>
          )}
        </div>
        <DialogClose asChild>
          <Button variant="outline" className="w-full mt-2">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
