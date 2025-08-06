-- Migration: Insert example user, profile, and properties with images in Supabase storage
-- Project ref: suydomgvamwjwcrlznom

-- 1. Insert example user into auth.users
-- NOTE: You may need to manually set the password hash if not using Supabase Auth UI/API. This is a placeholder for demonstration.

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, is_sso_user, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000000',
       'authenticated',
       'authenticated',
       'user@example.com',
       crypt('string', gen_salt('bf')),
       now(),
       '{"full_name": "Example Host"}',
       false,
       now(),
       now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'
);

-- 2. Insert corresponding host profile

INSERT INTO public.profiles (user_id, full_name, bio, is_host, is_tenant, location, avatar_url, preferred_language)
SELECT '00000000-0000-0000-0000-000000000001',
       'Example Host',
       'I am a sample host for demo properties.',
       true,
       false,
       'London, UK',
       'https://suydomgvamwjwcrlznom.supabase.co/storage/v1/object/public/avatars/example-host.jpg',
       'en'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

-- 3. Insert example properties for the host


INSERT INTO public.properties (
  host_id, title, description, property_type, bedrooms, bathrooms, max_guests, price_per_month, currency, address, city, country, latitude, longitude, amenities, images, is_available
)
SELECT * FROM (
  SELECT
    '00000000-0000-0000-0000-000000000001' AS host_id,
    'Modern Apartment in City Center' AS title,
    'A stylish apartment in the heart of the city, close to all amenities.' AS description,
    'apartment' AS property_type,
    2 AS bedrooms,
    1 AS bathrooms,
    3 AS max_guests,
    2200.00 AS price_per_month,
    'USD' AS currency,
    '123 Main St' AS address,
    'London' AS city,
    'UK' AS country,
    51.5074 AS latitude,
    -0.1278 AS longitude,
    ARRAY['WiFi', 'Kitchen', 'Washer'] AS amenities,
    ARRAY['https://suydomgvamwjwcrlznom.supabase.co/storage/v1/object/public/property-images/featured-apartment.jpg',
          'https://suydomgvamwjwcrlznom.supabase.co/storage/v1/object/public/property-images/featured-house.jpg'] AS images,
    true AS is_available
  UNION ALL
  SELECT
    '00000000-0000-0000-0000-000000000001',
    'Cozy Studio Near Park',
    'A compact and cozy studio, perfect for singles or couples.',
    'studio',
    1, 1, 2, 1400.00, 'USD',
    '456 Park Ave', 'London', 'UK', 51.5099, -0.1337,
    ARRAY['WiFi', 'Heating'],
    ARRAY['https://suydomgvamwjwcrlznom.supabase.co/storage/v1/object/public/property-images/featured-studio.jpg'],
    true
  UNION ALL
  SELECT
    '00000000-0000-0000-0000-000000000001',
    'Spacious Family House',
    'A large house with a garden, ideal for families.',
    'house',
    4, 2, 6, 3500.00, 'USD',
    '789 Family Rd', 'London', 'UK', 51.5100, -0.1200,
    ARRAY['WiFi', 'Garden', 'Parking'],
    ARRAY['https://suydomgvamwjwcrlznom.supabase.co/storage/v1/object/public/property-images/featured-house.jpg'],
    true
) AS example_properties
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties WHERE title = example_properties.title AND host_id = example_properties.host_id
);
