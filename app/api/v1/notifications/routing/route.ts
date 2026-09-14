import {NextResponse} from 'next/server';
import {listNotifications} from '@/lib/notifications';
import {listSubscriptions} from '@/lib/notification-subscriptions';

export async function GET(req:Request){
 const url=new URL(req.url);
 const userId=url.searchParams.get('userId')||'usr_owner';
 const projectId=url.searchParams.get('projectId')||'sylvia-local-workspace';
 const subscriptions=await listSubscriptions(userId,projectId);
 const notifications=await listNotifications(200,userId,projectId);
 const byKind=notifications.reduce<Record<string,number>>((a,n)=>(a[n.kind]=(a[n.kind]||0)+1,a),{});
 return NextResponse.json({ok:true,scope:{userId,projectId},subscriptions,matched:notifications.length,byKind,preview:notifications.slice(0,20)});
}
