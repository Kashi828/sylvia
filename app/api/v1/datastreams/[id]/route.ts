import {NextResponse} from 'next/server';
import {findStream,validBearer} from '@/lib/store';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){if(!validBearer(request))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});const {id}=await params;const stream=findStream(Number(id));if(!stream)return NextResponse.json({ok:false,error:'Datastream not found'},{status:404});return NextResponse.json({ok:true,datastream:stream})}
