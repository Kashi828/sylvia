
import {NextRequest,NextResponse} from "next/server";
import {requestPrincipal} from "@/lib/request-auth";
import {listPersistentAlertEvents} from "@/lib/persistent-alerts";
import {listAlertEvents as listMemoryAlertEvents} from "@/lib/alerts";
export async function GET(req:NextRequest){
 const auth=await requestPrincipal(req);if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const activeOnly=req.nextUrl.searchParams.get("activeOnly")==="true";
 const limit=Math.min(200,Math.max(1,Number(req.nextUrl.searchParams.get("limit")||200)));
 if(!process.env.POSTGRES_URL)return NextResponse.json({ok:true,events:listMemoryAlertEvents({activeOnly,limit}),persistent:false});
 return NextResponse.json({ok:true,events:await listPersistentAlertEvents(auth.ownerId,auth.projectId,{activeOnly,limit}),persistent:true});
}