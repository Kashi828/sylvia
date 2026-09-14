import {NextResponse} from 'next/server';
import {deleteSubscription,listSubscriptions,upsertSubscription} from '@/lib/notification-subscriptions';
const user=(req:Request)=>new URL(req.url).searchParams.get('userId')||'usr_owner';
const project=(req:Request)=>new URL(req.url).searchParams.get('projectId')||'sylvia-local-workspace';
export async function GET(req:Request){return NextResponse.json({ok:true,subscriptions:await listSubscriptions(user(req),project(req))});}
export async function POST(req:Request){const b=await req.json().catch(()=>({}));if(!['all','alert','delivery'].includes(b.kind||'all')||!['all','info','warning','critical','success','error'].includes(b.severity||'all'))return NextResponse.json({ok:false,error:'Invalid subscription filter'},{status:400});return NextResponse.json({ok:true,subscription:await upsertSubscription({id:b.id,userId:b.userId||user(req),projectId:b.projectId||project(req),kind:b.kind,severity:b.severity,enabled:b.enabled!==false})},{status:b.id?200:201});}
export async function DELETE(req:Request){const id=new URL(req.url).searchParams.get('id');if(!id)return NextResponse.json({ok:false,error:'id is required'},{status:400});await deleteSubscription(id);return NextResponse.json({ok:true});}
