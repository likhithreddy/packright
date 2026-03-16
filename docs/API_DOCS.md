# PackRight API Documentation

This document provides comprehensive documentation for all PackRight API endpoints, authentication, real-time subscriptions, and security considerations. For database architecture details, see [Architecture Documentation](./ARCHITECTURE.md#database-architecture).

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [API Endpoints](#api-endpoints)
3. [Realtime Subscriptions](#realtime-subscriptions)
4. [Security Considerations](#security-considerations)

---

## Authentication & Authorization

### Session Management

PackRight uses Supabase Auth for user authentication and session management. Sessions are created and maintained through the Supabase client library.

**Session Creation Flow:**

1. User submits credentials (email/password) via the authentication UI
2. Supabase Auth validates credentials against the `auth.users` table
3. On successful validation, a session is created with:
   - Access token (JWT) - short-lived (1 hour default)
   - Refresh token - long-lived (30 days default)
   - User ID and profile information

4. Tokens are stored securely in browser localStorage/httpOnly cookies
5. The Supabase client automatically refreshes access tokens using the refresh token

**Session Validation Patterns:**

```typescript
// Client-side session check
const {
  data: { session },
} = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
}

// Server-side session validation (API Routes)
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabase = createRouteHandlerClient({ cookies });
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Protected Route Patterns:**

Next.js middleware protects routes at the edge:

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}
```

### Row-Level Security (RLS)

All database tables are protected by Row-Level Security policies. Users can only access data associated with trips where they are registered members.

**Key RLS Functions:**

- `is_member_of(trip_id)` - Returns true if the current user is a member of the trip
- `is_admin_of(trip_id)` - Returns true if the current user is an admin of the trip

**RLS Policy Examples:**

```sql
-- Items table: Users can only see items for trips they're members of
CREATE POLICY "items_select" ON public.items
  FOR SELECT TO public
  USING (is_member_of(trip_id));

-- Trip members: Only admins can insert new members
CREATE POLICY "trip_members_insert" ON public.trip_members
  FOR INSERT TO public
  WITH CHECK (is_admin_of(trip_id));
```

---

## API Endpoints

### 1. Generate Packing List

Generates an AI-powered packing list based on trip description using GroqAPI.

#### OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: PackRight API
  version: 1.0.0
  description: API for collaborative trip packing application

paths:
  /api/generate-list:
    post:
      summary: Generate AI-powered packing list
      description: |
        Generates a structured packing list based on trip metadata using GroqAPI's
        llama-3.3-70b-versatile model. The response is validated and can be
        directly persisted to the database.
      operationId: generatePackingList
      tags:
        - AI Generation
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - description
              properties:
                description:
                  type: string
                  description: Natural language description of the trip
                  example: '7 days hiking in Yosemite in October. Expect cold nights and rain.'
                  minLength: 20
                  maxLength: 1000
                destination:
                  type: string
                  description: Optional trip destination
                  example: 'Yosemite National Park'
                startDate:
                  type: string
                  format: date
                  description: Optional trip start date (ISO 8601 format)
                  example: '2024-10-15'
                endDate:
                  type: string
                  format: date
                  description: Optional trip end date (ISO 8601 format)
                  example: '2024-10-22'
              additionalProperties: false
            examples:
              hikingTrip:
                summary: Hiking trip in Yosemite
                value:
                  description: '7 days hiking in Yosemite in October. Expect cold nights and rain.'
                  destination: 'Yosemite National Park'
                  startDate: '2024-10-15'
                  endDate: '2024-10-22'
              beachVacation:
                summary: Beach vacation in Hawaii
                value:
                  description: '5 days at the beach in Hawaii. Swimming, snorkeling, and hiking.'
                  destination: 'Honolulu, Hawaii'
                  startDate: '2024-11-01'
                  endDate: '2024-11-06'
      responses:
        '200':
          description: Successfully generated packing list
          content:
            application/json:
              schema:
                type: object
                required:
                  - items
                properties:
                  items:
                    type: array
                    description: Array of packing items with categories and quantities
                    items:
                      type: object
                      required:
                        - name
                        - category
                        - quantity
                        - is_shared
                      properties:
                        name:
                          type: string
                          description: Name of the item
                          example: 'Hiking Boots'
                        category:
                          type: string
                          description: Category the item belongs to
                          example: 'Footwear'
                          enum:
                            - Clothing
                            - Footwear
                            - Toiletries
                            - Gear
                            - Documents
                            - Electronics
                            - Miscellaneous
                        quantity:
                          type: integer
                          description: Required quantity of this item
                          minimum: 1
                          example: 1
                        is_shared:
                          type: boolean
                          description: Whether the item can be shared among group members
                          example: false
              examples:
                hikingTrip:
                  summary: Hiking trip packing list
                  value:
                    items:
                      - name: 'Hiking Boots'
                        category: 'Footwear'
                        quantity: 1
                        is_shared: false
                      - name: 'Rain Jacket'
                        category: 'Clothing'
                        quantity: 1
                        is_shared: false
                      - name: 'Sunscreen'
                        category: 'Toiletries'
                        quantity: 1
                        is_shared: true
        '400':
          description: Bad Request - Invalid input parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              examples:
                missingDescription:
                  summary: Missing description
                  value:
                    error: 'Trip description is required'
                descriptionTooShort:
                  summary: Description too short
                  value:
                    error: 'Trip description must be at least 20 characters long.'
        '401':
          description: Unauthorized - Invalid or missing authentication
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: 'Authentication required. Please log in.'
        '429':
          description: Too Many Requests - Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: 'Rate limit exceeded. Please try again later.'
                retryAfter: 60
        '500':
          description: Internal Server Error - AI service failure
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: 'Failed to generate packing list. Please try again.'
      callbacks:
        # No callbacks defined for this endpoint
      x-rateLimit:
        requests: 10
        period: 1 minute
      x-codeSamples:
        - lang: JavaScript
          label: Fetch API
          source: |
            const response = await fetch('/api/generate-list', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                description: '7 days hiking in Yosemite in October',
                destination: 'Yosemite National Park',
                startDate: '2024-10-15',
                endDate: '2024-10-22'
              })
            })
            const data = await response.json()
        - lang: TypeScript
          label: TypeScript with Supabase
          source: |
            import { createClient } from '@supabase/supabase-js'

            const supabase = createClient(url, key)
            const { data, error } = await supabase.functions.invoke('generate-list', {
              body: {
                description: '7 days hiking in Yosemite in October',
                destination: 'Yosemite National Park',
                startDate: '2024-10-15',
                endDate: '2024-10-22'
              }
            })

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Supabase Auth JWT token from session

  schemas:
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
          description: Human-readable error message
        code:
          type: string
          description: Machine-readable error code
          example: 'VALIDATION_ERROR'
        details:
          type: object
          description: Additional error details
          additionalProperties: true
```

#### Rate Limiting

The generate-list endpoint implements rate limiting to prevent abuse and manage API costs:

- **Limit:** 10 requests per minute per user
- **Window:** Rolling 1-minute window
- **Response:** Returns `429 Too Many Requests` when limit exceeded
- **Retry After:** Response includes `retryAfter` header with seconds to wait

#### Request Validation

All requests are validated against the following rules:

| Field       | Type   | Required | Constraints            |
| ----------- | ------ | -------- | ---------------------- |
| description | string | Yes      | 20-1000 characters     |
| destination | string | No       | Maximum 200 characters |
| startDate   | date   | No       | ISO 8601 date format   |
| endDate     | date   | No       | ISO 8601 date format   |

#### AI Response Validation

AI responses are validated against a Zod schema before being returned:

```typescript
const PackingItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum([
    'Clothing',
    'Footwear',
    'Toiletries',
    'Gear',
    'Documents',
    'Electronics',
    'Miscellaneous',
  ]),
  quantity: z.number().int().min(1).max(100),
  is_shared: z.boolean(),
});

const PackingListResponseSchema = z.object({
  items: z.array(PackingItemSchema).min(1).max(100),
});
```

---

### 2. Auto-Assign Items

Automatically assigns unassigned items to trip members using a fair distribution algorithm. Admin-only endpoint.

#### Endpoint

```http
POST /api/trips/{id}/auto-assign
```

#### Description

This endpoint implements a fair distribution algorithm that assigns unclaimed items to trip members. The algorithm:

- Sorts members by current item count (ascending)
- Sorts items by required quantity (descending)
- Distributes items round-robin style to ensure fairness
- Only admins can trigger this operation

#### Request

**Path Parameters:**

- `id` (string, UUID): The trip ID

**Authentication:** Required (Bearer token via Supabase Auth)

**Authorization:** Trip admin access required

#### Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Items assigned successfully (15 items)",
  "count": 15
}
```

**Error Responses:**

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User is not a trip admin
- `400 Bad Request`: No members found to assign items to
- `500 Internal Server Error`: Database operation failed

#### Example

```bash
curl -X POST https://your-domain.vercel.app/api/trips/550e8400-e29b-41d4-a716-446655440000/auto-assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. OpenAPI Specification

Returns the OpenAPI 3.0 specification for the PackRight API.

#### Endpoint

```http
GET /api/openapi/spec
```

#### Description

Returns the complete OpenAPI 3.0 specification in YAML format. This endpoint serves the static OpenAPI specification file for use with API documentation tools like Swagger UI, Redoc, or other OpenAPI-compatible tools.

#### Request

**Authentication:** None required

**Response:**

**Success Response (200 OK):**

- **Content-Type:** `application/yaml`
- **Cache-Control:** `public, max-age=3600` (cached for 1 hour)

Returns the complete OpenAPI 3.0 specification as YAML.

#### Example

```bash
curl https://your-domain.vercel.app/api/openapi/spec
```

---

## Database Architecture

For complete database schema, entity relationships, table structures, RLS policies, and migration history, see [Architecture Documentation](./ARCHITECTURE.md#database-architecture).

---

## Realtime Subscriptions

PackRight uses Supabase Realtime to broadcast changes instantly to all connected clients. This enables multi-user collaboration without page refreshes.

### Channel Patterns

We filter all realtime subscriptions by `trip_id` to ensure clients only receive relevant updates.

```typescript
// Subscribe to changes for a specific trip
const channel = supabase
  .channel(`trip:${tripId}`)
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'item_claims',
      filter: `trip_id=eq.${tripId}`,
    },
    (payload) => {
      console.log('Claim changed:', payload);
      // Update Zustand store
      useBoardStore.getState().handleRealtimeUpdate(payload);
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'items',
      filter: `trip_id=eq.${tripId}`,
    },
    (payload) => {
      console.log('Item changed:', payload);
      // Update Zustand store
      useBoardStore.getState().handleRealtimeUpdate(payload);
    }
  )
  .subscribe();
```

### Payload Structure

Each realtime event includes:

```typescript
{
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  schema: string,
  old: Record<string, any> | null, // For UPDATE/DELETE
  new: Record<string, any> | null  // For INSERT/UPDATE
}
```

### Best Practices

1. **Always Filter by trip_id:** Never subscribe to all changes in a table
2. **Clean Up Subscriptions:** Always unsubscribe when component unmounts

   ```typescript
   useEffect(() => {
     const channel = subscribeToTrip(tripId);
     return () => {
       supabase.removeChannel(channel);
     };
   }, [tripId]);
   ```

3. **Use Optimistic Updates:** Update local state immediately, then sync with realtime
4. **Handle Conflicts:** Treat database as source of truth; resolve conflicts server-side

### Realtime Flow Diagram

```
User A Action          Client A State          Database          Client B State
     │                     │                      │                    │
     │  Drag item to       │                      │                    │
     │  "Packed" column    │                      │                    │
     ├────────────────────►│                      │                    │
     │                     │  Optimistic update   │                    │
     │                     ├─────────────────────►│                    │
     │                     │                      │  Broadcast change  │
     │                     │                      ├───────────────────►│
     │                     │                      │                    │  Realtime update
     │                     │                      │                    ├─────────► UI
     │                     │                      │                    │
     │  Confirmation       │                      │                    │
     │◄────────────────────┴──────────────────────┴────────────────────┘
```

---

## Security Considerations

### API Security

1. **Server-Side API Key Protection:**
   - GroqAPI keys are stored in environment variables
   - Never exposed to client-side code
   - Only accessible in Next.js API routes (server-side)

2. **Session Validation:**
   - All API routes validate user session via Supabase auth
   - Protected routes return 401 Unauthorized for unauthenticated requests

3. **Input Validation:**
   - All inputs validated against Zod schemas
   - SQL injection prevented via parameterized queries
   - XSS prevented by React's built-in escaping

4. **Rate Limiting:**
   - AI generation endpoint limited to 10 requests/minute
   - Prevents abuse and manages API costs

### Data Protection

1. **Row-Level Security (RLS):**
   - All tables protected by RLS policies
   - Users can only access data for trips they're members of
   - Database-level security (not just application-level)

2. **Secure Session Management:**
   - JWT tokens with short expiry (1 hour)
   - Refresh tokens stored securely
   - Automatic token refresh handled by Supabase client

3. **Over-Claim Protection:**
   - Database trigger prevents claiming more items than required
   - Ensures data integrity at database level

4. **HTTPS Only:**
   - All communications over HTTPS in production
   - Cookies marked with Secure flag

### Security Headers

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

### Environment Variables

```bash
# Required environment variables (never commit these)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key # Server-side only
GROQ_API_KEY=your-groq-api-key # Server-side only
```

---

## Testing the API

### Manual Testing with cURL

```bash
# Generate packing list
curl -X POST https://your-domain.vercel.app/api/generate-list \
  -H "Content-Type: application/json" \
  -d '{
    "description": "7 days hiking in Yosemite in October",
    "destination": "Yosemite National Park",
    "startDate": "2024-10-15",
    "endDate": "2024-10-22"
  }'
```

### Using Swagger UI

The OpenAPI specification included in this document can be imported into Swagger UI or other OpenAPI tools for interactive API exploration.

---

## API Versioning

Current API Version: **1.0.0**

Versioning follows semantic versioning:

- **Major** - Breaking changes
- **Minor** - New features, backward compatible
- **Patch** - Bug fixes, backward compatible

---

## Support & Resources

- **GitHub Repository:** [https://github.com/likhithreddy/packright](https://github.com/likhithreddy/packright)
- **Issue Tracker:** [GitHub Issues](https://github.com/likhithreddy/packright/issues)
- **Supabase Documentation:** [https://supabase.com/docs](https://supabase.com/docs)
- **GroqAPI Documentation:** [https://groq.com/docs](https://groq.com/docs)

### Related Documentation

- [Sprint Documentation](./SPRINTS.md)
- [Architecture](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [CI/CD Pipeline](./CI_CD.md)
- [Evaluation Dashboard](./EVALUATION_DASHBOARD.md)
- [AI Mastery](./AI_MASTERY.md)
