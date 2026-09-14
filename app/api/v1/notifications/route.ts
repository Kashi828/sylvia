import {NextResponse} from 'next/server';
import {getNotificationStats,listNotifications} from '@/lib/notifications';
export async function GET(req:Request){const url=new URL(req.url);const userId=url.searchParams.get('userId')||'usr_owner';const projectId=url.searchParams.get('projectId')||'sylvia-local-workspace';const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit')||100)));const notifications=await listNotifications(limit,userId,projectId);const stats=await getNotificationStats();return NextResponse.json({ok:true,notifications,unread:stats.unread,stats});}
