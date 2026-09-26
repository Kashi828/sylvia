import { NextResponse } from "next/server";
import { requestOwnerId } from "@/lib/request-auth";
import { listAutomationRuns } from "@/lib/automation-engine";
export async function GET(request:Request){const auth=await requestOwnerId(request);if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});const limit=Number(new URL(request.url).searchParams.get("limit")||100);return NextResponse.json({ok:true,runs:await listAutomationRuns(auth.ownerId,limit),persistent:true});}