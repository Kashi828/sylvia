import {NextResponse} from "next/server";
import {requestPrincipal} from "@/lib/request-auth";
import {getNotificationStats,listNotifications} from "@/lib/notifications";

export async function GET(req:Request){
  const auth=await requestPrincipal(req);
  if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const limit=Math.min(200,Math.max(1,Number(new URL(req.url).searchParams.get("limit")||100)));
  const notifications=await listNotifications(limit,auth.ownerId,auth.projectId);
  const stats=await getNotificationStats(auth.ownerId,auth.projectId);
  return NextResponse.json({ok:true,projectId:auth.projectId,notifications,unread:stats.unread,stats});
}
