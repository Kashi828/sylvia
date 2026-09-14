import {NextResponse} from 'next/server';
import {store,validBearer,publicDevice} from '@/lib/store';
export async function GET(request:Request){if(!validBearer(request))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});return NextResponse.json({ok:true,count:store.devices.length,devices:store.devices.map(publicDevice)})}
