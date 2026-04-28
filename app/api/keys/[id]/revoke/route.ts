import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** Revoke an API key (instant block for `x-api-key` validation). */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: row, error: findErr } = await admin
    .from("api_keys")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findErr || !row) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const { error: updErr } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ success: false, message: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
