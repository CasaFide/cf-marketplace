# cf-marketplace

This repository is a frontend for a rental marketplace that currently uses Supabase for authentication, database, and storage. The purpose of this document is to capture the database schema and all API interactions performed by the frontend so you can implement an equivalent backend using Python + FastAPI.

The README below describes:

- Database schema (tables, columns, constraints, triggers)
- Storage buckets and file handling
- Frontend-used operations (auth, queries, inserts, updates, uploads)
- A suggested FastAPI endpoint surface with request/response shapes
- Pydantic model examples and implementation notes (auth, permissions, storage uploads)

Use this as a checklist when building your FastAPI backend.

## Contents

- Database schema
- Frontend API usage summary
- FastAPI API specification (endpoints, methods)
- Example Pydantic models
- Auth and permissions
- Storage and file uploads
- Migration notes and tips

## Database schema

Tables used by the frontend (extracted from `supabase/migrations` and generated `types.ts`):

1) profiles
- id: UUID (PK, default gen_random_uuid())
- user_id: UUID (unique) — maps to auth users id
- full_name: TEXT
- bio: TEXT
- phone: TEXT
- location: TEXT
- avatar_url: TEXT
- preferred_language: TEXT DEFAULT 'en'
- is_host: BOOLEAN DEFAULT false
- is_tenant: BOOLEAN DEFAULT true
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

Relations / constraints:
- `user_id` references auth.users(id) (Supabase auth)

2) properties
- id: UUID (PK, default gen_random_uuid())
- host_id: UUID REFERENCES public.profiles(user_id)
- title: TEXT NOT NULL
- description: TEXT
- property_type: TEXT CHECK IN ('house','apartment','studio','room')
- bedrooms: INTEGER DEFAULT 1
- bathrooms: INTEGER DEFAULT 1
- max_guests: INTEGER DEFAULT 1
- price_per_month: DECIMAL(10,2) NOT NULL
- currency: TEXT DEFAULT 'USD'
- address: TEXT NOT NULL
- city: TEXT NOT NULL
- country: TEXT NOT NULL
- latitude: DECIMAL(10,8)
- longitude: DECIMAL(11,8)
- amenities: TEXT[]
- images: TEXT[] (stored as public URLs)
- is_available: BOOLEAN DEFAULT true
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

Indexes / constraints:
- host_id foreign key to profiles.user_id

3) matches
- id: UUID (PK, default gen_random_uuid())
- property_id: UUID REFERENCES public.properties(id)
- tenant_id: UUID REFERENCES public.profiles(user_id)
- host_id: UUID REFERENCES public.profiles(user_id)
- status: TEXT DEFAULT 'pending' CHECK IN ('pending','accepted','rejected','active','completed')
- start_date: DATE
- end_date: DATE
- monthly_rent: DECIMAL(10,2)
- message: TEXT
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()
- UNIQUE(property_id, tenant_id)

Triggers / helper functions:
- `update_updated_at_column()` trigger function sets `updated_at = now()` on update for profiles, properties, matches.
- `handle_new_user()` trigger creates an empty profile when a new auth user is created (Supabase-specific `auth.users` trigger).

Storage buckets (Supabase storage used by frontend):
- `avatars` — public bucket for user avatars (public URLs stored in `profiles.avatar_url`)
- `property-images` — public bucket for property images (public URLs stored in `properties.images`)

Row-Level Security (RLS) policies (Supabase) used in the project — these will need to be reproduced as application-level permissions in FastAPI or via database policies if desired:

- profiles: SELECT allowed for everyone; INSERT/UPDATE allowed only when auth.uid() = user_id
- properties: SELECT allowed for everyone; INSERT/UPDATE/DELETE allowed only when auth.uid() = host_id
- matches: SELECT allowed for tenant or host (auth.uid() = tenant_id OR host_id); INSERT allowed only when auth.uid() = tenant_id; UPDATE allowed when auth.uid() = tenant_id or host_id

## Frontend API usage summary

The frontend uses the Supabase client in these ways (found in `src/hooks` and `src/pages`/`src/components`):

- Authentication (Supabase Auth client) — signUp, signInWithPassword, signInWithOAuth, signOut, onAuthStateChange, getSession. Frontend expects persisted sessions and uses access token stored in localStorage.
- Profiles: GET profile by user_id (single), implicitly created via signup trigger on Supabase.
- Properties:
  - GET public properties: `SELECT * FROM properties WHERE is_available = true`
  - GET host properties: `SELECT * FROM properties WHERE host_id = <current_user_id> ORDER BY created_at DESC`
  - INSERT property: frontend calls `.insert([property])` — required fields per `properties.Insert`
  - UPDATE property: `.update(property).eq('id', selectedProperty.id)`
  - Ordering and filtering are simple client-side or query params included in select calls
- Matches:
  - GET matches for current user with joins: the frontend calls `from('matches').select('*, property:properties(...), host_profile:profiles!matches_host_id_fkey(...), tenant_profile:profiles!matches_tenant_id_fkey(...)').order('created_at', { ascending: false })` — this returns matches where auth.uid() = tenant_id OR host_id
  - INSERT and UPDATE matches are possible in UI (create match requests from tenant, update from host/tenant)
- Storage uploads (property images and avatars): components call `supabase.storage.from('property-images').upload(path, file)` then `getPublicUrl(path)` to get a public URL which is saved into `images` array on a property or `avatar_url` on profile.

From these usages we can derive the API surface your FastAPI backend must provide.

## Suggested FastAPI API specification


Profiles
- GET /profiles/me
  - auth required
  - response: Profile object
- GET /profiles/{user_id}
  - public
  - response: Profile object
- PUT /profiles/me
  - auth required
  - body: Partial profile fields (full_name, bio, phone, location, preferred_language, avatar_url)
  - response: updated Profile

Properties
- GET /properties
  - query params: available (boolean), city, country, q (search), limit, offset
  - response: list[Property]
  - example: frontend uses GET public properties filtering by is_available = true
- GET /properties/{id}
  - response: Property
- POST /properties
  - auth required (must be host)
  - body: PropertyCreate (see models below)
  - response: created Property
- PUT /properties/{id}
  - auth required (must be host of property)
  - body: PropertyUpdate
  - response: updated Property
- DELETE /properties/{id}
  - auth required (must be host)

Matches
- GET /matches
  - auth required
  - returns matches where current user is tenant or host; include nested property and profile info
  - query params: status
- POST /matches
  - auth required (must be tenant)
  - body: { property_id, monthly_rent?, start_date?, end_date?, message? }
  - response: created Match
- PUT /matches/{id}
  - auth required (tenant or host)
  - body: fields to update (status, start_date, end_date, monthly_rent, message)
  - response: updated Match

Storage / Uploads

You have two choices for handling file uploads in FastAPI:

1) Backend proxy upload: accept multipart/form-data on the backend, stream file to cloud storage (e.g., S3), store resulting public URL in DB.
   - POST /uploads/property-images (multipart) -> returns public URL(s)
   - POST /uploads/avatars (multipart) -> returns public URL

2) Presigned uploads (recommended for scalability): backend issues pre-signed upload URL(s); frontend uploads directly to S3-compatible storage; frontend then POSTs the public URL or the backend can store it.
   - POST /uploads/presign
     - body: { filename, content_type, folder } -> response: { upload_url, public_url, fields? }

Frontend expects to receive a public URL after upload. If you use presigned uploads, return the `public_url` so the frontend can append it into `images` or `avatar_url` and send to /properties or /profiles/me.

## Request/Response models (Pydantic examples)

Below are minimal example Pydantic models to get you started. Adapt and extend as needed.

```python
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date

class Profile(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str]
    bio: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    avatar_url: Optional[str]
    preferred_language: Optional[str]
    is_host: Optional[bool] = False
    is_tenant: Optional[bool] = True
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class PropertyBase(BaseModel):
    title: str
    description: Optional[str]
    property_type: str
    bedrooms: Optional[int] = 1
    bathrooms: Optional[int] = 1
    max_guests: Optional[int] = 1
    price_per_month: float
    currency: Optional[str] = 'USD'
    address: str
    city: str
    country: str
    latitude: Optional[float]
    longitude: Optional[float]
    amenities: Optional[List[str]] = []
    images: Optional[List[str]] = []
    is_available: Optional[bool] = True

class PropertyCreate(PropertyBase):
    pass

class Property(PropertyBase):
    id: str
    host_id: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class MatchCreate(BaseModel):
    property_id: str
    monthly_rent: Optional[float]
    start_date: Optional[date]
    end_date: Optional[date]
    message: Optional[str]

class Match(BaseModel):
    id: str
    property_id: str
    tenant_id: str
    host_id: str
    status: str
    start_date: Optional[date]
    end_date: Optional[date]
    monthly_rent: Optional[float]
    message: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
```

## Auth and permissions

- The frontend expects a persistent login session with an access token available in localStorage. Implement JWT-based auth where the frontend stores an access token (short lived) and optionally a refresh token.
- Server-side, enforce permissions on endpoints similar to RLS policies:
  - Profiles: only allow PUT /profiles/me to update the calling user's profile.
  - Properties: only the host (owner) may POST/PUT/DELETE their own properties.
  - Matches: tenants may create matches for themselves; tenants and hosts may update matches where they are a participant; GET /matches returns matches related to the current user.

Implement these checks as dependency functions in FastAPI that compare current_user.id with resource owner ids before performing modifications.

## Storage guidance

- The frontend uploads images and expects a public URL in return. When migrating to FastAPI you can:
  1) Use a cloud storage service (AWS S3, DigitalOcean Spaces, MinIO) and implement presigned URLs. FastAPI route returns the presigned URL & public URL. Frontend uploads directly to S3.
  2) Have the FastAPI backend accept multipart file uploads and stream them to the storage provider (simpler but less scalable).

Presigned upload flow (recommended):
1. Frontend requests presigned URL from POST /uploads/presign with desired filename and content-type.
2. Backend returns S3 presigned PUT URL and the final public URL.
3. Frontend PUTs file to the presigned URL, then submits the public URL in the property create/update payload.

Note: Supabase storage `getPublicUrl` returns a publicly accessible URL. If you use private buckets, you'll need a read-proxy endpoint or signed GET URLs for images.

## Implementation tips

- Database: keep using Postgres. Recreate the tables and triggers from the SQL migrations. The `handle_new_user()` function depends on a Supabase auth trigger — you should instead create the profile row in your signup flow in FastAPI (when creating a new user).
- Triggers: `update_updated_at_column` is useful; you can keep triggers or set timestamps in the application layer.
- RLS policies: translate them into explicit permission checks in the FastAPI routes if you're not enabling RLS on your own Postgres instance.
- Search & filtering: the frontend currently does simple equality filtering (is_available) and client-side searching. Implement basic query filters on /properties to match.
- Joins: the frontend queries `matches` with nested selects to include property and profile data. Create endpoints that return nested objects (e.g., GET /matches returns property and tenant/host profile snippets).

## Example endpoint usage matching frontend

- Fetch public properties (frontend: getPublicProperties)
  - GET /properties?available=true

- Fetch host properties (frontend: getPrivateProperties / Dashboard -> fetchUserProperties)
  - GET /properties?host_id=<current_user_id>

- Create property (frontend: CreatePropertyDetailsModal -> onCreate)
  - POST /properties
  - Body: PropertyCreate; server must set host_id = current_user.id

- Update property (frontend: UpdatePropertyDetailsModal -> onUpdate)
  - PUT /properties/{id}
  - Body: PropertyUpdate; server verifies current_user.id === property.host_id

- Upload property images (frontend uses supabase.storage.upload + getPublicUrl)
  - Recommend: POST /uploads/presign -> returns presigned url + public_url
  - Frontend does PUT to S3 then attaches public_url to property.images

- Create match (tenant request)
  - POST /matches
  - Body: MatchCreate; server enforces tenant_id = current_user.id

- Get matches (dashboard fetchMatches)
  - GET /matches (auth required)
  - Server returns matches where current_user is tenant or host, include nested property and brief profile info

## Next steps and checklist

- Create a new FastAPI project and add these routes and Pydantic models.
- Recreate the Postgres schema (use the SQL from `supabase/migrations` with minor edits to remove Supabase-specific parts like `auth.users` trigger — instead create the profile on signup within FastAPI).
- Implement user signup/login with hashed passwords (bcrypt) and JWT tokens (use `python-jose` or `fastapi-users`).
- Implement storage (S3 + presigned URLs recommended).
- Implement permission checks as described above.

If you want, I can scaffold a minimal FastAPI project (routes, models, auth) that implements the above endpoints and includes example tests. Tell me which parts you'd like scaffolded first (auth, properties, matches, or uploads) and I will generate code + tests.
