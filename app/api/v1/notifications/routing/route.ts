import {NextResponse} from 'next/server';
import {requestPrincipal} from '@/lib/request-auth';
import {listNotifications} from '@/lib/notifications';
import {listSubscriptions} from '@/lib/notification-subscriptions';

export async function GET(req:Request){
 const auth=await requestPrincipal(req);
 if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const subscriptions=await listSubscriptions(auth.ownerId,auth.projectId);
 const notifications=await listNotifications(200,auth.ownerId,auth.projectId);
 const byKind=notifications.reduce<Record<string,number>>((a,n)=>(a[n.kind]=(a[n.kind]||0)+1,a),{});
 return NextResponse.json({ok:true,scope:{userId:auth.ownerId,projectId:auth.projectId},subscriptions,matched:notifications.length,byKind,preview:notifications.slice(0,20)});
}
