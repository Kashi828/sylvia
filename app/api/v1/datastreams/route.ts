import { NextResponse } from "next/server";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { findPersistentDeviceById } from "@/lib/persistent-devices";
import { createPersistentDatastream, deletePersistentDatastream, listPersistentDatastreams, persistentDatastreamsAvailable } from "@/lib/persistent-datastreams";

function session(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="))?.split("=")[1];
  return getSessionUser(token);
}

export async function GET(request: Request) {
  if (!session(request)) return NextResponse.json({ ok:false, error:"Authentication required" }, { status:401 });
  const deviceId = new URL(request.url).searchParams.get("deviceId") || undefined;
  const user = session(request);
  if (deviceId && !(await findPersistentDeviceById(deviceId, user?.id))) {
    return NextResponse.json({ ok:false, error:"Device not found" }, { status:404 });
  }
  return NextResponse.json({ ok:true, persistent:persistentDatastreamsAvailable(), datastreams:await listPersistentDatastreams(deviceId) });
}

export async function POST(request: Request) {
  if (!session(request)) return NextResponse.json({ ok:false, error:"Authentication required" }, { status:401 });
  const body = await request.json().catch(()=>null) as { deviceId?: string; name?: string; type?: string; unit?: string } | null;
  const deviceId = body?.deviceId?.trim();
  const name = body?.name?.trim();
  const type = body?.type;
  if (!deviceId || !name || !["Number","Boolean","String"].includes(type || "")) {
    return NextResponse.json({ ok:false, error:"deviceId, name and valid type are required" }, { status:400 });
  }
  if (!(await findPersistentDeviceById(deviceId, user?.id))) return NextResponse.json({ ok:false, error:"Device not found" }, { status:404 });
  try {
    const datastream = await createPersistentDatastream(deviceId,name,type as "Number"|"Boolean"|"String",body?.unit || "");
    return NextResponse.json({ ok:true, datastream }, { status:201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datastream creation failed";
    return NextResponse.json({ ok:false,error:message },{status:400});
  }
}

export async function DELETE(request: Request) {
  const user = session(request);
  if (!user) return NextResponse.json({ ok:false, error:"Authentication required" }, { status:401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok:false,error:"id is required" },{status:400});
  const deleted = await deletePersistentDatastream(id, user.id);
  if (!deleted) return NextResponse.json({ ok:false, error:"Datastream not found" }, { status:404 });
  return NextResponse.json({ ok:true });
}
