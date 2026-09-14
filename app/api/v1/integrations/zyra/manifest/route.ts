import {NextResponse} from 'next/server';
import {validBearer} from '@/lib/store';
export async function GET(request:Request){if(!validBearer(request))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});return NextResponse.json({ok:true,manifest:{name:'SYLVIA',version:'1.0',integration:'ZYRA AI',capabilities:['device.read','telemetry.read','telemetry.write','device.command','event.subscribe','automation.trigger'],base:'/api/v1',auth:'Bearer token'}})}
