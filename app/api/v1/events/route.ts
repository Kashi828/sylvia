import {NextResponse} from 'next/server';
import {store,validBearer} from '@/lib/store';
export async function GET(request:Request){if(!validBearer(request))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});return NextResponse.json({ok:true,events:store.events})}
