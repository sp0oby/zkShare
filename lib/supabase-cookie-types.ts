import type { CookieOptions } from "@supabase/ssr";

/** Shape passed to `cookies.setAll` by `@supabase/ssr` `createServerClient`. */
export type SupabaseCookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};
