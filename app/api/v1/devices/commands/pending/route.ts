import {NextResponse} from 'next/server';
import {addEvent,findDevice,takeCommands,validBearer,authenticateDeviceToken} from '@/lib/store';
import {findPersistentDeviceByToken} from '@/lib/persistent-devices';
import {listPersistentPendingCommands,persistentCommandsAvailable} from '@/lib/persistent-commands';
import {withRateLimit} from '@/lib/http';

export async function GET(request:Request){
  const limited=withRateLimit(request,60);if(limited)return limited;
  const token=validBearer(request);
  if(!token)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});

  const deviceId=new URL(request.url).searchParams.get('deviceId');
  const limit=Number(new URL(request.url).searchParams.get('limit')||10);

  if(persistentCommandsAvailable() && deviceId){
    const persistentDevice=await findPersistentDeviceByToken(token,deviceId);
    if(persistentDevice){
      const commands=await listPersistentPendingCommands(deviceId,Number.isFinite(limit)?limit:10);
      if(commands.length) addEvent('device.command.delivered',`${persistentDevice.name}: ${commands.length} durable command(s) delivered`,persistentDevice.id);
      return NextResponse.json({ok:true,commands,persistent:true});
    }
  }

  const device=findDevice(Number(deviceId||0));
  if(!device || !authenticateDeviceToken(token, device.id))return NextResponse.json({ok:false,error:'Device not found'},{status:404});
  const commands=takeCommands(device.id,Number.isFinite(limit)?limit:10);
  if(commands.length)addEvent('device.command.delivered',`${device.name}: ${commands.length} command(s) delivered`,device.id);
  return NextResponse.json({ok:true,commands,persistent:false});
}