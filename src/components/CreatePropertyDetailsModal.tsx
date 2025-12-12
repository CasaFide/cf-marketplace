import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect } from "react";
import { presignUpload, uploadToUrl } from '@/integrations/apiClient';
import type { Database } from "@/integrations/supabase/types";

// Type for Nominatim location result
type LocationResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    [key: string]: string | undefined;
  };
};

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (property: PropertyInsert) => void;
};

export function CreatePropertyDetailsModal({ open, onClose, onCreate }: Props) {
  // Generate a property UUID when modal opens
  const [propertyId, setPropertyId] = useState<string>("");

  // Simple UUID v4 generator
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  useEffect(() => {
    if (open) {
      setPropertyId(generateUUID());
    }
  }, [open]);
  // For image uploads
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [form, setForm] = useState<PropertyInsert>({
    id: "",
    title: "",
    description: "",
    property_type: "",
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 1,
    price_per_month: 0,
    currency: "USD",
    address: "",
    city: "",
    country: "",
    latitude: undefined,
    longitude: undefined,
    amenities: [],
    images: [],
    is_available: true,
    host_id: "",
  });

  // Sync propertyId to form.id
  useEffect(() => {
    if (propertyId && form.id !== propertyId) {
      setForm((f) => ({ ...f, id: propertyId }));
    }
  }, [propertyId]);

  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationTimeout = useRef<NodeJS.Timeout | null>(null);

  // Search Nominatim for location
  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationQuery(e.target.value);
    if (locationTimeout.current) clearTimeout(locationTimeout.current);
    locationTimeout.current = setTimeout(async () => {
      if (!e.target.value) {
        setLocationResults([]);
        return;
      }
      setLocationLoading(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        e.target.value
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      setLocationResults(data);
      setLocationLoading(false);
    }, 400);
  };

  // When user selects a location result
  const handleSelectLocation = (result: LocationResult) => {
    setForm({
      ...form,
      address: result.display_name,
      city:
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        "",
      country: result.address?.country || "",
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    });
    setLocationQuery(result.display_name);
    setLocationResults([]);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setForm({ ...form, [name]: value === "" ? undefined : Number(value) });
    } else if (type === "checkbox") {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Dedicated handler for select
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // For amenities: add one at a time
  const [amenityInput, setAmenityInput] = useState("");
  const handleAddAmenity = () => {
    if (amenityInput.trim()) {
      setForm({
        ...form,
        amenities: [...(form.amenities || []), amenityInput.trim()],
      });
      setAmenityInput("");
    }
  };
  const handleRemoveAmenity = (idx: number) => {
    setForm({
      ...form,
      amenities: (form.amenities || []).filter((_, i) => i !== idx),
    });
  };

  // For images: add one at a time or via upload
  const [imageInput, setImageInput] = useState("");
  const handleAddImage = () => {
    if (imageInput.trim()) {
      setForm({ ...form, images: [...(form.images || []), imageInput.trim()] });
      setImageInput("");
    }
  };
  const handleRemoveImage = (idx: number) => {
    setForm({
      ...form,
      images: (form.images || []).filter((_, i) => i !== idx),
    });
  };

  // Handle file uploads using presigned URLs from backend
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setUploadError("Only .jpg and .png files are allowed.");
        continue;
      }
      try {
        const ext = file.name.split('.').pop() || '';
        const filename = `${Date.now()}-${propertyId}-${Math.random().toString(36).slice(2)}.${ext}`;
        // Ask backend for presigned URL
        const presign = await presignUpload(filename, file.type, 'property-images');
        // presign should return { upload_url, public_url }
        if (presign?.upload_url) {
          await uploadToUrl(presign.upload_url, file, file.type);
          if (presign.public_url) uploadedUrls.push(presign.public_url);
        } else if (presign?.public_url) {
          // Backend may accept multipart and return public_url directly
          uploadedUrls.push(presign.public_url);
        } else {
          setUploadError('Could not get presigned upload URL');
        }
      } catch (err: any) {
        setUploadError(err?.message || 'Upload failed');
        continue;
      }
    }
    if (uploadedUrls.length > 0) {
      setForm((f) => ({
        ...f,
        images: [...(f.images || []), ...uploadedUrls],
      }));
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              placeholder="Description"
              value={form.description || ""}
              onChange={handleChange}
              className="w-full border rounded p-2"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property_type">Property Type</Label>
            <select
              id="property_type"
              name="property_type"
              value={form.property_type}
              onChange={handleSelectChange}
              required
              className="w-full border rounded p-2"
            >
              <option value="" disabled>
                Select property type
              </option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="studio">Studio</option>
              <option value="room">Room</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input
              id="bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              placeholder="Bedrooms"
              value={form.bedrooms ?? ""}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input
              id="bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              placeholder="Bathrooms"
              value={form.bathrooms ?? ""}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_guests">Max Guests</Label>
            <Input
              id="max_guests"
              name="max_guests"
              type="number"
              min={0}
              placeholder="Max Guests"
              value={form.max_guests ?? ""}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price_per_month">Price per Month</Label>
            <Input
              id="price_per_month"
              name="price_per_month"
              type="number"
              min={0}
              placeholder="Price per Month"
              value={form.price_per_month ?? ""}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              name="currency"
              value={form.currency || ""}
              onChange={handleSelectChange}
              required
              className="w-full border rounded p-2"
            >
              <option value="" disabled>
                Select currency
              </option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="Search for address, city, or place..."
              value={locationQuery}
              onChange={handleLocationInput}
              autoComplete="off"
            />
            {locationLoading && (
              <div className="text-xs text-muted-foreground">Searching...</div>
            )}
            {locationResults.length > 0 && (
              <div className="border rounded bg-background max-h-48 overflow-y-auto mt-1 z-50 relative">
                {locationResults.map((result, idx) => (
                  <button
                    type="button"
                    key={result.place_id}
                    className="block w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => handleSelectLocation(result)}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
            {/* Show selected address/city/country/lat/lon as read-only fields */}
            {form.address && (
              <div className="mt-2 text-xs text-muted-foreground">
                <div>
                  <b>Address:</b> {form.address}
                </div>
                {form.city && (
                  <div>
                    <b>City:</b> {form.city}
                  </div>
                )}
                {form.country && (
                  <div>
                    <b>Country:</b> {form.country}
                  </div>
                )}
                {form.latitude !== undefined && (
                  <div>
                    <b>Latitude:</b> {form.latitude}
                  </div>
                )}
                {form.longitude !== undefined && (
                  <div>
                    <b>Longitude:</b> {form.longitude}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amenities">Amenities</Label>
            <div className="flex gap-2">
              <Input
                id="amenities"
                name="amenities"
                placeholder="Add amenity and click +"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
              />
              <Button
                type="button"
                onClick={handleAddAmenity}
                disabled={!amenityInput.trim()}
              >
                +
              </Button>
            </div>
            {Array.isArray(form.amenities) && form.amenities.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.amenities.map((am, idx) => (
                  <li
                    key={am + idx}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="truncate max-w-xs">{am}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleRemoveAmenity(idx)}
                      aria-label="Remove amenity"
                    >
                      &times;
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="images">Images</Label>
            {/* File upload input */}
            <div className="flex flex-col gap-2">
              <input
                id="image-upload"
                type="file"
                accept=".jpg,.jpeg,.png"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="block"
              />
              {uploading && (
                <div className="text-xs text-muted-foreground">
                  Uploading...
                </div>
              )}
              {uploadError && (
                <div className="text-xs text-red-500">{uploadError}</div>
              )}
              <div className="flex gap-2 mt-2">
                <Input
                  id="images"
                  name="images"
                  placeholder="Paste image URL and click +"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  onClick={handleAddImage}
                  disabled={!imageInput.trim() || uploading}
                >
                  +
                </Button>
              </div>
            </div>
            {Array.isArray(form.images) && form.images.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.images.map((img, idx) => (
                  <li
                    key={img + idx}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="truncate max-w-xs">{img}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label="Remove image"
                    >
                      &times;
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="is_available"
              type="checkbox"
              name="is_available"
              checked={!!form.is_available}
              onChange={handleChange}
            />
            <Label htmlFor="is_available">Available</Label>
          </div>
          {/* host_id is required, but should be set by the app logic, not user input */}
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
