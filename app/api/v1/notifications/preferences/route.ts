import {NextResponse} from 'next/server';
import {getNotificationPreferences,updateNotificationPreferences} from '@/lib/notifications';
export async function GET(){return NextResponse.json({ok:true,preferences:getNotificationPreferences()});}
export async function PATCH(req:Request){try{const body=await req.json();const allowed=['inApp','alertNotifications','webhookNotifications','criticalOnly'];const patch=Object.fromEntries(allowed.filter(k=>typeof body?.[k]==='boolean').map(k=>[k,body[k]]));return NextResponse.json({ok:true,preferences:await updateNotificationPreferences(patch)});}catch{return NextResponse.json({ok:false,error:'Invalid preferences'},{status:400});}}
