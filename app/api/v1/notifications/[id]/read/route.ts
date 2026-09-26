import {NextResponse} from "next/server";
import {requestPrincipal} from "@/lib/request-auth";
import {markNotificationRead} from "@/lib/notifications";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requestPrincipal(req);
 if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const {id}=await params;
 await markNotificationRead(decodeURIComponent(id),auth.projectId);
 return NextResponse.json({ok:true,projectId:auth.projectId});
}
