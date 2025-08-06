import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { Database } from '@/integrations/supabase/types';

type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

type Props = {
  open: boolean;
  onClose: () => void;
  property: PropertyUpdate;
  onUpdate: (property: PropertyUpdate) => void;
};

export function UpdatePropertyDetailsModal({ open, onClose, property, onUpdate }: Props) {
  const [form, setForm] = useState<PropertyUpdate>(property);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="title" placeholder="Title" value={form.title || ''} onChange={handleChange} required />
          <Input name="address" placeholder="Address" value={form.address || ''} onChange={handleChange} required />
          <Input name="city" placeholder="City" value={form.city || ''} onChange={handleChange} required />
          <Input name="country" placeholder="Country" value={form.country || ''} onChange={handleChange} required />
          <Input name="property_type" placeholder="Property Type" value={form.property_type || ''} onChange={handleChange} required />
          <Input name="price_per_month" type="number" placeholder="Price per Month" value={form.price_per_month || 0} onChange={handleChange} required />
          {/* Add more fields as needed */}
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Update</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
