import { NextResponse } from "next/server";
import { requestOwnerId } from "@/lib/request-auth";
import { store } from "@/lib/store";
import { listDeviceEvents } from "@/lib/device-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requestOwnerId(request);
  if (!auth) return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") || 100), 200));
  const durable = await listDeviceEvents(auth.ownerId,{deviceId:url.searchParams.get("deviceId")||undefined,kind:url.searchParams.get("kind")||undefined,limit});
  const memory = store.events.slice(-limit).reverse().map(event => ({id:`runtime:${event.id}`,kind:"runtime",severity:"info",title:event.type,message:event.message,deviceId:event.deviceId ? String(event.deviceId) : "—",streamId:event.streamId ? String(event.streamId) : "—",timestamp:event.createdAt}));
  return NextResponse.json({ok:true,persistent:true,events:[...durable,...memory].slice(0,limit)},{headers:{"Cache-Control":"no-store"}});
}