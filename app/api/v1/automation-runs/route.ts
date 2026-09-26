import { NextResponse } from "next/server";
import { getSessionUser, sessionCookie } from "@/lib/auth";
import { listAutomationRuns } from "@/lib/automation-engine";
function sessionUser(request:Request){const token=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+"="))?.split("=")[1];return getSessionUser(token);}
export async function GET(request:Request){const user=sessionUser(request);if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});const limit=Number(new URL(request.url).searchParams.get("limit")||100);return NextResponse.json({ok:true,runs:await listAutomationRuns(user.id,limit),persistent:true});}