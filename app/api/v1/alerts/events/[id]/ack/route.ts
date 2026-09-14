import {NextResponse} from 'next/server'; import {acknowledgeAlert} from '@/lib/alerts';
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params; const event=acknowledgeAlert(id); return event?NextResponse.json({ok:true,event}):NextResponse.json({error:'Alert event not found'},{status:404})}
