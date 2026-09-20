import {NextResponse} from 'next/server';
import {withRateLimit} from '@/lib/http';
import {ingestMqttTelemetry} from '@/lib/mqtt-telemetry';
import {persistTelemetry} from '@/lib/telemetry-persistence';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const limited=withRateLimit(request,60); if(limited)return limited;
  const {id}=await params;
  const token=request.headers.get('authorization')?.replace(/^Bearer\\s+/i,'').trim() || '';
  if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const body=await request.json().catch(()=>null) as {streamId?:string|number;key?:string;value?:unknown;timestamp?:string;firmware?:string}|null;
  if(!body || (body.streamId===undefined && !body.key))return NextResponse.json({ok:false,error:'streamId or key is required'},{status:400});
  if(body.value===undefined)return NextResponse.json({ok:false,error:'value is required'},{status:400});

  try{
    const sample=await ingestMqttTelemetry({
      deviceId:id,
      streamId:String(body.streamId ?? body.key),
      key:String(body.key ?? body.streamId),
      value:body.value as number|string|boolean,
      timestamp:body.timestamp,
      firmware:body.firmware,
    },token);
    const persisted=await persistTelemetry({...sample,transport:'rest'});
    return NextResponse.json({ok:true,sample:persisted,persistent:true},{status:201});
  }catch(error){
    const message=error instanceof Error?error.message:'Telemetry ingestion failed';
    const status=message==='Unauthorized'?401:message==='Device not found'?404:400;
    return NextResponse.json({ok:false,error:message},{status});
  }
}
