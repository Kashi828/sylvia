import {NextResponse} from 'next/server';
import {createSession,publicUser,sessionCookie,verifyCredentials} from '@/lib/auth';
export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const user=await verifyCredentials(String(body.email||''),String(body.password||''));
  if(!user)return NextResponse.json({ok:false,error:'Invalid email or password'},{status:401});
  const token=await createSession(user.id); const res=NextResponse.json({ok:true,user:publicUser(user)});
  res.cookies.set(sessionCookie,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*7}); return res;
}
