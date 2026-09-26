import {NextResponse} from 'next/server';
import {deleteSessionAsync,getSessionUserAsync,sessionCookie} from '@/lib/auth';
import {recordAuditEvent} from '@/lib/audit-log';

function sessionToken(req:Request){
  return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1)||undefined;
}

export async function POST(req:Request){
  const token=sessionToken(req);
  const user=await getSessionUserAsync(token);
  await deleteSessionAsync(token);
  if(user)await recordAuditEvent({ownerId:user.id,actorType:'session',actorId:user.id,action:'auth.logout',resourceType:'session',request:req});
  const res=NextResponse.json({ok:true});
  res.cookies.set(sessionCookie,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:0,path:'/'});
  return res;
}