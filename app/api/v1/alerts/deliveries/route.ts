
import {NextRequest,NextResponse} from "next/server";
import {requestOwnerId} from "@/lib/request-auth";
import {listPersistentAlertDeliveries} from "@/lib/persistent-alerts";
import {listAlertDeliveries as listMemoryDeliveries} from "@/lib/alerts";
export async function GET(req:NextRequest){
 const auth=await requestOwnerId(req);if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const limit=Math.min(200,Math.max(1,Number(req.nextUrl.searchParams.get("limit")||100)));
 if(!process.env.POSTGRES_URL)return NextResponse.json({ok:true,deliveries:listMemoryDeliveries(limit),persistent:false});
 return NextResponse.json({ok:true,deliveries:await listPersistentAlertDeliveries(auth.ownerId,limit),persistent:true});
}