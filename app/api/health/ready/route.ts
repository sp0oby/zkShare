import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Readiness: verifies database connectivity (PostgREST + `api_keys` readable).
 * Use behind load balancers / orchestrators; keep `GET /api/health` for fast liveness (edge).
 */
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, database: false, reason: "supabase_env_missing" },
        { status: 503 },
      );
    }
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from("api_keys").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, database: false, reason: error.message },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      database: true,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, database: false, reason: message }, { status: 503 });
  }
}
