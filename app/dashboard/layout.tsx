import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseCookieToSet } from "@/lib/supabase-cookie-types";

/** Auth gate runs in Node (Server Components); avoids Edge middleware false negatives breaking client navigations to /dashboard. */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    redirect("/api-key?next=/dashboard");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Session refresh prefers middleware; layouts may run in contexts where CookieStore is read-only.
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/api-key?next=/dashboard");
  }

  return children;
}
