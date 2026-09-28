# Next.js Starter Template (Clerk + shadcn/ui)

Production-ready Next.js App Router template with:

- Clerk authentication (route protection + server auth helpers)
- Tailwind CSS v4 + shadcn/ui components
- Theme management (system/light/dark)
- A minimal user state layer wired to a protected API route

Use this repository as a clean base for authenticated SaaS or internal apps.

## Stack

- Next.js 16 (App Router, Turbopack in dev)
- React 19 + TypeScript (strict mode)
- Clerk for auth
- Tailwind CSS 4
- shadcn/ui + Radix primitives
- ESLint + Prettier

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file at the project root:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4000
```

Notes:

- `NEXT_PUBLIC_BACKEND_API_URL` is used by the protected route at `/api/dee593b110504cd6b99541539649944b`.
- Clerk keys are required by `ClerkProvider`, middleware auth protection, and server-side token retrieval.

### 3) Run development server

```bash
npm run dev
```

The app starts on [http://localhost:3001](http://localhost:3001).

## Scripts

- `npm run dev`: start Next.js dev server on port `3001` with Turbopack
- `npm run build`: production build
- `npm run start`: start production server
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript checks
- `npm run format`: format `ts`/`tsx` files with Prettier

## Project Structure

```text
app/
  layout.tsx                         # Root layout (Clerk + theme + header auth UI)
  (private)/
    layout.tsx                       # Private section providers (theme + user state)
    page.tsx                         # Example private page, prints current user payload
  api/
    dee593b110504cd6b99541539649944b/
      route.ts                       # Protected proxy route to backend /api/users/me

components/
  theme-provider.tsx                 # App theme provider + "D" keyboard toggle
  ui/
    button.tsx                       # shadcn/ui button

lib/
  require-auth.ts                    # Server helper: validate Clerk session + token
  create-auth-headers.ts             # Helper for Authorization headers
  user/
    api.ts                           # Client fetcher for the protected user endpoint
    context.tsx                      # User context + useUser hook
    reducer.tsx                      # User state reducer
    provider.tsx                     # User provider and fetch lifecycle
    types.ts                         # User and state typings
  theme/
    theme-provider.tsx               # Alternative minimal theme provider wrapper
```

## Authentication and Access Control

### Global route protection

`proxy.ts` uses `clerkMiddleware` and `auth.protect()` to protect non-public routes.

### Server-side auth utility

`lib/require-auth.ts`:

- checks if a user is authenticated
- reads a Clerk token with `getToken()`
- returns a ready-to-use error response (`401`) when auth is missing

### Protected API route pattern

`app/api/dee593b110504cd6b99541539649944b/route.ts`:

1. validates auth via `requireAuth()`
2. forwards request to `${NEXT_PUBLIC_BACKEND_API_URL}/api/users/me`
3. sends `Authorization: Bearer <clerk_token>`
4. returns backend payload (or proper error status)

This route acts as a secure server-side proxy between the frontend and your backend API.

## User State Flow

The private area uses a `UserProvider`:

1. client calls `GET /api/dee593b110504cd6b99541539649944b`
2. reducer updates `isLoading`, `user`, and `error`
3. page-level components consume state via `useUser()`

Current demo in `app/(private)/page.tsx` renders the user JSON payload.

## UI and Theme

- Theme is handled with `next-themes`.
- `components/theme-provider.tsx` adds a keyboard shortcut:
  - press `D` to toggle dark/light mode (ignored while typing in form fields).
- Root header in `app/layout.tsx` shows Clerk auth controls:
  - signed out: Sign In / Sign Up
  - signed in: User button / Sign Out

## shadcn/ui Usage

### Add a component

```bash
npx shadcn@latest add button
```

### Import a component

```tsx
import { Button } from "@/components/ui/button"
```
