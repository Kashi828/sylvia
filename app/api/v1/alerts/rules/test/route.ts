import {NextRequest,NextResponse} from 'next/server';
import {testAlertWebhook} from '@/lib/alerts';
export async function POST(req:NextRequest){try{const b=await req.json();const event=testAlertWebhook(String(b.id||''));return event?NextResponse.json({ok:true,event},{status:202}):NextResponse.json({error:'Rule not found'},{status:404})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid request'},{status:400})}}
