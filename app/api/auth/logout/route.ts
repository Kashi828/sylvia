import {NextResponse} from 'next/server';
import {deleteSessionAsync,sessionCookie} from '@/lib/auth';

function sessionToken(req:Request){
  return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1)||undefined;
}

export async function POST(req:Request){
  await deleteSessionAsync(sessionToken(req));
  const res=NextResponse.json({ok:true});
  res.cookies.set(sessionCookie,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:0,path:'/'});
  return res;
}
