import {NextResponse} from 'next/server';
import {createSession,publicUser,sessionCookie,verifyCredentials} from '@/lib/auth';
import {recordAuditEvent} from '@/lib/audit-log';

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const email=String(body.email||'').trim();
  const user=await verifyCredentials(email,String(body.password||''));
  if(!user){
    await recordAuditEvent({projectId:'sylvia-local-workspace',actorType:'unknown',actorId:null,action:'auth.login_failed',resourceType:'session',metadata:{email:email.slice(0,160)},request:req});
    return NextResponse.json({ok:false,error:'Invalid email or password'},{status:401});
  }
  const token=await createSession(user.id);
  await recordAuditEvent({ownerId:user.id,actorType:'session',actorId:user.id,action:'auth.login',resourceType:'session',metadata:{email:user.email},request:req});
  const res=NextResponse.json({ok:true,user:publicUser(user)});
  res.cookies.set(sessionCookie,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*7}); return res;
}