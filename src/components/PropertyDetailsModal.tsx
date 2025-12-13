import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createMatch } from '@/integrations/apiClient';
import { useToast } from '@/hooks/use-toast';


import type { Database } from '@/integrations/supabase/types';
type Property = Database['public']['Tables']['properties']['Row'];

interface PropertyDetailsModalProps {
  open: boolean;
  onClose: () => void;
  property: Property | null;
}

export const PropertyDetailsModal = ({ open, onClose, property }: PropertyDetailsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);
  const [rentInput, setRentInput] = useState<string>('');
  const [messageInput, setMessageInput] = useState<string>('');
  if (!property) return null;

  // Robust amenities handling
  const amenitiesRaw = property.amenities;
  let amenities: string[] = [];
  if (Array.isArray(amenitiesRaw)) {
    amenities = amenitiesRaw;
  } else if (typeof amenitiesRaw === 'string') {
    try {
      const parsed = JSON.parse(amenitiesRaw);
      if (Array.isArray(parsed)) {
        amenities = parsed;
      } else if (parsed) {
        amenities = [parsed];
      }
    } catch {
      amenities = [amenitiesRaw];
    }
  } else if (typeof amenitiesRaw === 'object' && amenitiesRaw !== null) {
    amenities = Object.values(amenitiesRaw).map(String);
  }

  // Robust image handling for both array and stringified array
  let imagesArr: string[] = [];
  if (Array.isArray(property.images)) {
    imagesArr = property.images;
  } else if (typeof property.images === 'string') {
    try {
      const parsed = JSON.parse(property.images);
      if (Array.isArray(parsed)) imagesArr = parsed;
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{property.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4" />
            {property.address}
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          {imagesArr.length > 0 && (
            <img
              src={imagesArr[0]}
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
          {amenities.length > 0 && (
            <div className="mb-2">
              <span className="font-semibold">Amenities:</span> {amenities.join(', ')}
            </div>
          )}
        </div>
        <DialogClose asChild>
          <Button variant="outline" className="w-full mt-2">Close</Button>
        </DialogClose>
        {/* If user is logged in and property is available, show request form */}
        {user && property.is_available && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Request to Rent</h3>
            <div className="grid gap-2">
              <input
                type="number"
                placeholder="Monthly rent (optional)"
                value={rentInput}
                onChange={(e) => setRentInput(e.target.value)}
                className="border rounded p-2"
              />
              <textarea
                placeholder="Message to host (optional)"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="border rounded p-2"
                rows={3}
              />
              <Button
                onClick={async () => {
                  if (!user) return toast({ title: 'You must be logged in to request', variant: 'destructive' });
                  setRequesting(true);
                  try {
                    const payload = {
                      property_id: property.id,
                      tenant_id: user.id,
                      monthly_rent: rentInput ? Number(rentInput) : undefined,
                      message: messageInput || undefined,
                    };
                    await createMatch(payload);
                    toast({ title: 'Request sent' });
                    setRentInput('');
                    setMessageInput('');
                    onClose();
                  } catch (err) {
                    console.error('Error creating match', err);
                    toast({ title: 'Error sending request', variant: 'destructive' });
                  } finally {
                    setRequesting(false);
                  }
                }}
                disabled={requesting}
              >
                {requesting ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
