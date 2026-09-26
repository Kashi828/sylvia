import { NextResponse } from "next/server";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { databaseConfigured, query } from "@/lib/db";
import { listPersistentFleetDevices } from "@/lib/persistent-devices";

function sessionUser(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(sessionCookie + "="))?.split("=")[1];
  return getSessionUser(token);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = sessionUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });

  if (!databaseConfigured()) {
    return NextResponse.json({ ok: true, devices: [], persistent: false, staleAfterSeconds: 90 });
  }

  try {
    const staleAfterSeconds = Math.max(30, Math.min(
      Number(request.headers.get("x-sylvia-stale-after") || process.env.SYLVIA_DEVICE_STALE_SECONDS || 90),
      3600,
    ));

    await query(
      `UPDATE public.device_registry
       SET lifecycle='offline', online=false, updated_at=now()
       WHERE owner_id=$1
         AND lifecycle='online'
         AND last_seen IS NOT NULL
         AND last_seen < now() - ($2::text || ' seconds')::interval`,
      [user.id, staleAfterSeconds],
    );

    const devices = await listPersistentFleetDevices(user.id);
    const counts = devices.reduce((acc: Record<string, number>, device: { lifecycle: string }) => {
      acc[device.lifecycle] = (acc[device.lifecycle] || 0) + 1;
      return acc;
    }, { provisioning: 0, online: 0, offline: 0, disabled: 0 });

    return NextResponse.json({
      ok: true,
      persistent: true,
      staleAfterSeconds,
      summary: {
        total: devices.length,
        online: counts.online || 0,
        offline: counts.offline || 0,
        provisioning: counts.provisioning || 0,
        disabled: counts.disabled || 0,
      },
      devices,
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Fleet lookup failed",
    }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = sessionUser(request);
  if (!user) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });

  return NextResponse.json({
    ok: false,
    error: "Fleet registration is performed by device provisioning. Use POST /api/v1/devices.",
  }, { status: 405, headers: { Allow: "GET" } });
}
