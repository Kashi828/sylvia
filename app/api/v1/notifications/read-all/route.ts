import {NextResponse} from 'next/server';
import {requestPrincipal} from '@/lib/request-auth';
import {markAllNotificationsRead} from '@/lib/notifications';
export async function POST(req:Request){
 const auth=await requestPrincipal(req);
 if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 await markAllNotificationsRead(auth.projectId);
 return NextResponse.json({ok:true,projectId:auth.projectId});
}
