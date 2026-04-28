import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** Pro / Enterprise: CSV export of audit logs for this user’s API keys. */
export async function GET() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: keys, error: keysErr } = await admin
    .from("api_keys")
    .select("id, plan_tier")
    .eq("user_id", user.id);

  if (keysErr || !keys?.length) {
    return NextResponse.json({ error: "NO_KEYS" }, { status: 404 });
  }

  const tier = keys.some((k) => k.plan_tier === "pro" || k.plan_tier === "enterprise");
  if (!tier) {
    return NextResponse.json(
      { error: "AUDIT_EXPORT_REQUIRES_PRO", message: "Upgrade to Pro for audit export." },
      { status: 403 },
    );
  }

  const ids = keys.map((k) => k.id);
  const { data: rows, error: logErr } = await admin
    .from("audit_logs")
    .select("created_at,operation,user_id,api_key_id,payload")
    .in("api_key_id", ids)
    .order("created_at", { ascending: false })
    .limit(50_000);

  if (logErr) {
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }

  const header = "created_at,operation,user_id,api_key_id,payload_json\n";
  const body = (rows ?? [])
    .map((r) => {
      const payload = JSON.stringify(r.payload ?? {}).replaceAll('"', '""');
      return `${r.created_at},${r.operation},${r.user_id ?? ""},${r.api_key_id ?? ""},"${payload}"`;
    })
    .join("\n");

  return new NextResponse(header + body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zkshare-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
