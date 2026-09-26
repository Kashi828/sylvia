
import {NextResponse} from "next/server";
import {requestPrincipal} from "@/lib/request-auth";
import {acknowledgePersistentAlertEvent} from "@/lib/persistent-alerts";
import {acknowledgeAlert as acknowledgeMemoryAlert} from "@/lib/alerts";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requestPrincipal(req);if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const {id}=await params;
 if(!process.env.POSTGRES_URL){const event=acknowledgeMemoryAlert(id);return event?NextResponse.json({ok:true,event,persistent:false}):NextResponse.json({ok:false,error:"Alert event not found"},{status:404});}
 const event=await acknowledgePersistentAlertEvent(id,auth.ownerId,auth.projectId);return event?NextResponse.json({ok:true,event,persistent:true}):NextResponse.json({ok:false,error:"Alert event not found"},{status:404});
}