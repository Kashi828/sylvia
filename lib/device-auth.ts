import crypto from 'node:crypto';

function getPepper(){
  const value=process.env.SYLVIA_DEVICE_TOKEN_SECRET;
  if(value)return value;
  if(process.env.NODE_ENV==='production')throw new Error('SYLVIA_DEVICE_TOKEN_SECRET must be configured in production');
  return 'sylvia-beta-device-secret-change-me';
}

export function hashDeviceToken(token:string){
  return crypto.createHmac('sha256',getPepper()).update(token).digest('hex');
}

export function tokenMatchesHash(token:string,hash:string){
  if(!token||!hash)return false;
  const a=Buffer.from(hashDeviceToken(token),'hex');
  const b=Buffer.from(hash,'hex');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

export function generateDeviceToken(){
  return `syl_dev_${crypto.randomBytes(24).toString('base64url')}`;
}

export function tokenFingerprint(token:string){
  return hashDeviceToken(token).slice(0,12);
}
