import {NextResponse} from 'next/server';
import {markNotificationRead} from '@/lib/notifications';
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;await markNotificationRead(decodeURIComponent(id));return NextResponse.json({ok:true});}
