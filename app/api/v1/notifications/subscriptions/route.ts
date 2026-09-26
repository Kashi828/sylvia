import {NextResponse} from 'next/server';
import {requestPrincipal} from '@/lib/request-auth';
import {deleteSubscription,listSubscriptions,upsertSubscription} from '@/lib/notification-subscriptions';

async function principal(req:Request){
  const auth=await requestPrincipal(req);
  if(!auth)return null;
  if(auth.method!=="session" || !auth.user)return null;
  return auth;
}
export async function GET(req:Request){
 const auth=await principal(req);
 if(!auth)return NextResponse.json({ok:false,error:"Authenticated user session required"},{status:401});
 return NextResponse.json({ok:true,subscriptions:await listSubscriptions(auth.ownerId,auth.projectId)});
}
export async function POST(req:Request){
 const auth=await principal(req);
 if(!auth)return NextResponse.json({ok:false,error:"Authenticated user session required"},{status:401});
 const b=await req.json().catch(()=>({}));
 if(!['all','alert','delivery'].includes(b.kind||'all')||!['all','info','warning','critical','success','error'].includes(b.severity||'all'))return NextResponse.json({ok:false,error:'Invalid subscription filter'},{status:400});
 return NextResponse.json({ok:true,subscription:await upsertSubscription({id:b.id,userId:auth.ownerId,projectId:auth.projectId,kind:b.kind,severity:b.severity,enabled:b.enabled!==false})},{status:b.id?200:201});
}
export async function DELETE(req:Request){
 const auth=await principal(req);
 if(!auth)return NextResponse.json({ok:false,error:"Authenticated user session required"},{status:401});
 const id=new URL(req.url).searchParams.get('id');
 if(!id)return NextResponse.json({ok:false,error:'id is required'},{status:400});
 await deleteSubscription(id);
 return NextResponse.json({ok:true});
}
