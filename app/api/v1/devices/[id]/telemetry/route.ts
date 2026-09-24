import {NextResponse} from 'next/server';
import {withRateLimit} from '@/lib/http';
import {ingestMqttTelemetry} from '@/lib/mqtt-telemetry';
import {persistTelemetry} from '@/lib/telemetry-persistence';
import {listPersistentDatastreams} from '@/lib/persistent-datastreams';
import {findPersistentDeviceByToken} from '@/lib/persistent-devices';
import {findDevice, validBearer} from '@/lib/store';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const limited=withRateLimit(request,60); if(limited)return limited;
  const {id}=await params;
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim() || '';
  if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const body=await request.json().catch(()=>null) as {datastreamId?:string|number;streamId?:string|number;key?:string;value?:unknown;timestamp?:string;firmware?:string}|null;
  const datastreamId=body?.datastreamId ?? body?.streamId ?? body?.key;
  if(!body || datastreamId===undefined)return NextResponse.json({ok:false,error:'datastreamId is required'},{status:400});
  if(body.value===undefined)return NextResponse.json({ok:false,error:'value is required'},{status:400});

  try{
    // Authenticate the device before looking up its datastreams.
    const persistent=await findPersistentDeviceByToken(token,id);
    const numericId=Number(id);
    const legacyAuthorized=!persistent && Number.isFinite(numericId) && validBearer(token,numericId) && Boolean(findDevice(numericId));
    if(!persistent && !legacyAuthorized){
      return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
    }

    const registered=await listPersistentDatastreams(id);
    const stream=registered.find(item=>item.id===String(datastreamId));
    if(!stream)return NextResponse.json({ok:false,error:'Datastream not registered for device'},{status:404});
    const validType=(stream.type==='Number'&&typeof body.value==='number'&&Number.isFinite(body.value))||(stream.type==='Boolean'&&typeof body.value==='boolean')||(stream.type==='String'&&typeof body.value==='string');
    if(!validType)return NextResponse.json({ok:false,error:`Value type mismatch for datastream ${stream.id}`},{status:400});

    const sample=await ingestMqttTelemetry({
      deviceId:id,
      streamId:String(datastreamId),
      key:String(body.key ?? body.streamId ?? datastreamId),
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