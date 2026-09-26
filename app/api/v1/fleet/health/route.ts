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
  if (!user) return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  if (!databaseConfigured()) {
    return NextResponse.json({ok:true,persistent:false,summary:{total:0,online:0,offline:0,provisioning:0,disabled:0,stale:0},mqtt:{configured:Boolean(process.env.SYLVIA_MQTT_BROKER)},recentEvents:0});
  }
  try {
    const staleAfterSeconds = Math.max(30, Math.min(Number(process.env.SYLVIA_DEVICE_STALE_SECONDS || 90), 3600));
    await query(
      `UPDATE public.device_registry
       SET lifecycle='offline', online=false, updated_at=now()
       WHERE owner_id=$1 AND lifecycle='online'
         AND last_seen IS NOT NULL
         AND last_seen < now() - ($2::text || ' seconds')::interval`,
      [user.id, staleAfterSeconds],
    );
    const devices = await listPersistentFleetDevices(user.id);
    const counts = {provisioning:0,online:0,offline:0,disabled:0};
    for (const device of devices) counts[device.lifecycle] += 1;
    const recent = await query(
      `SELECT count(*)::int AS count FROM public.device_events WHERE owner_id=$1 AND occurred_at > now() - interval '24 hours'`,
      [user.id],
    );
    const telemetry = await query(
      `SELECT count(*)::int AS count FROM public.telemetry_events t JOIN public.device_registry d ON d.device_id=t.device_id WHERE d.owner_id=$1 AND t.occurred_at > now() - interval '24 hours'`,
      [user.id],
    );
    const latestHeartbeat = devices.map(device => device.lastSeen ? Date.parse(device.lastSeen) : 0).filter(Number.isFinite).sort((a,b)=>b-a)[0] || null;
    return NextResponse.json({
      ok:true,persistent:true,staleAfterSeconds,
      summary:{total:devices.length,online:counts.online,offline:counts.offline,provisioning:counts.provisioning,disabled:counts.disabled,stale:counts.offline},
      activity:{deviceEvents24h:Number(recent.rows[0]?.count||0),telemetrySamples24h:Number(telemetry.rows[0]?.count||0),latestHeartbeat:latestHeartbeat?new Date(latestHeartbeat).toISOString():null},
      mqtt:{configured:Boolean(process.env.SYLVIA_MQTT_BROKER),brokerConfigured:Boolean(process.env.SYLVIA_MQTT_BROKER)},
      devices,
    }, {headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Fleet health unavailable"},{status:503});
  }
}