/**
 * Supabase clients — split for Next.js tree-shaking & `server-only` safety.
 *
 * - **Client Components:** `createSupabaseBrowserClient` from this file (re-exported below).
 * - **Server Components / Actions / Route handlers (user session):** import from `@/lib/supabase-server`.
 * - **Service role (API routes, webhooks):** `createSupabaseServiceRoleClient` from `@/lib/supabase-server`.
 */
export { createSupabaseBrowserClient } from "./supabase-browser";
