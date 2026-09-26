import { NextResponse } from "next/server";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { store } from "@/lib/store";
import { listDeviceEvents } from "@/lib/device-events";

function sessionUser(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(sessionCookie + "="))?.split("=")[1];
  return getSessionUser(token);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = sessionUser(request);
  if (!user) return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") || 100), 200));
  const durable = await listDeviceEvents(user.id,{deviceId:url.searchParams.get("deviceId")||undefined,kind:url.searchParams.get("kind")||undefined,limit});
  const memory = store.events.slice(-limit).reverse().map(event => ({id:`runtime:${event.id}`,kind:"runtime",severity:"info",title:event.type,message:event.message,deviceId:event.deviceId ? String(event.deviceId) : "—",streamId:event.streamId ? String(event.streamId) : "—",timestamp:event.createdAt}));
  return NextResponse.json({ok:true,persistent:true,events:[...durable,...memory].slice(0,limit)},{headers:{"Cache-Control":"no-store"}});
}