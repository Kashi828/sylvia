import {NextResponse} from 'next/server';
import {getSessionUser,publicUser,sessionCookie} from '@/lib/auth';
export async function GET(req:Request){const token=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(sessionCookie+'='))?.split('=')[1];return NextResponse.json({authenticated:Boolean(getSessionUser(token)),user:publicUser(getSessionUser(token))});}
