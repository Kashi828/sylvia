import {NextResponse} from 'next/server';
import {deleteSession,sessionCookie} from '@/lib/auth';
export async function POST(req:Request){const token=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];deleteSession(token);const res=NextResponse.json({ok:true});res.cookies.set(sessionCookie,'',{httpOnly:true,maxAge:0,path:'/'});return res;}
