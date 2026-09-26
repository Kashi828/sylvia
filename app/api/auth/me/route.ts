import {NextResponse} from 'next/server';
import {getSessionUserAsync,publicUser,sessionCookie} from '@/lib/auth';

function sessionToken(req:Request){
  return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1)||undefined;
}

export async function GET(req:Request){
  const user=await getSessionUserAsync(sessionToken(req));
  return NextResponse.json({authenticated:Boolean(user),user:publicUser(user)});
}
