import {NextResponse} from 'next/server';
import {addEvent,findDevice,findStream,validBearer,authenticateDeviceToken,publicDevice} from '@/lib/store';
import {withRateLimit} from '@/lib/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const limited=withRateLimit(request,60);if(limited)return limited;
 const token=validBearer(request);if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
 const {id}=await params;const device=findDevice(Number(id));if(!device||!authenticateDeviceToken(token, device.id))return NextResponse.json({ok:false,error:'Device not found'},{status:404});
 const body=await request.json().catch(()=>null) as {streamId?:number;value?:unknown}|null;
 if(!body||!Number.isFinite(Number(body.streamId)))return NextResponse.json({ok:false,error:'streamId is required'},{status:400});
 const stream=findStream(Number(body.streamId));if(!stream||stream.deviceId!==device.id)return NextResponse.json({ok:false,error:'Datastream does not belong to device'},{status:400});
 let value=body.value;if(stream.type==='Number'){const n=Number(value);if(!Number.isFinite(n))return NextResponse.json({ok:false,error:'Value must be numeric'},{status:400});value=n;}if(stream.type==='Boolean'){if(typeof value==='string')value=value==='true';if(typeof value!=='boolean')return NextResponse.json({ok:false,error:'Value must be boolean'},{status:400});}
 stream.value=value as never;stream.updatedAt=new Date().toISOString();device.online=true;device.lastSeen=stream.updatedAt;if(stream.name==='Temperature')device.temperature=Number(value);if(stream.name==='Battery')device.battery=Number(value);if(stream.name==='Online')device.online=Boolean(value);
 addEvent('device.state',`${device.name} state → ${stream.name}: ${String(value)}`,device.id,stream.id);return NextResponse.json({ok:true,device:publicDevice(device),datastream:stream});
}
