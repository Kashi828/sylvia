import {NextResponse} from 'next/server';
import {clientKey,rateLimit} from '@/lib/rate-limit';

export function withRateLimit(request:Request, limit=120){
  const result=rateLimit(`${request.method}:${clientKey(request)}`,limit);
  if(result.allowed)return null;
  return NextResponse.json({ok:false,error:'Rate limit exceeded',retryAfterMs:Math.max(0,result.resetAt-Date.now())},{status:429,headers:{'Retry-After':String(Math.ceil(Math.max(0,result.resetAt-Date.now())/1000))}});
}

export function jsonError(error:string,status:number){return NextResponse.json({ok:false,error},{status});}
