type Bucket={count:number;resetAt:number};
const globalScope=globalThis as typeof globalThis & {__sylviaRateBuckets?:Map<string,Bucket>};
const buckets=globalScope.__sylviaRateBuckets ??= new Map<string,Bucket>();

export function rateLimit(key:string, limit=120, windowMs=60_000){
  const now=Date.now();
  const current=buckets.get(key);
  if(!current || current.resetAt<=now){
    buckets.set(key,{count:1,resetAt:now+windowMs});
    return {allowed:true,remaining:limit-1,resetAt:now+windowMs};
  }
  current.count += 1;
  return {allowed:current.count<=limit,remaining:Math.max(0,limit-current.count),resetAt:current.resetAt};
}

export function clientKey(request:Request){
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'local';
}
