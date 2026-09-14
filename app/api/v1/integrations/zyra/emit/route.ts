import {NextResponse} from 'next/server';
import {addEvent,validBearer} from '@/lib/store';
export async function POST(request:Request){if(!validBearer(request))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});const body=await request.json().catch(()=>({}));addEvent('zyra.bridge','ZYRA AI bridge event emitted',Number(body.deviceId)||undefined);return NextResponse.json({ok:true,accepted:true,bridge:'ZYRA AI',event:body,eventId:Date.now(),timestamp:new Date().toISOString()},{status:202})}
