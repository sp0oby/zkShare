import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";
import { checkRuntimeReadiness } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Readiness: verifies environment configuration and database connectivity. Use behind load
 * balancers / orchestrators; keep `GET /api/health` for fast liveness (edge).
 */
export async function GET() {
  const readiness = checkRuntimeReadiness();
  if (!readiness.ok) {
    return NextResponse.json(
      {
        ok: false,
        database: false,
        reason: "configuration_invalid",
        missing: readiness.missing,
      },
      { status: 503 },
    );
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from("api_keys").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, database: false, reason: "database_query_failed" },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      database: true,
      warnings: readiness.warnings,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, database: false, reason: "unexpected_error" },
      { status: 503 },
    );
  }
}
