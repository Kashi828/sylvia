import crypto from 'node:crypto';

type User={id:string;name:string;email:string;role:'Owner'|'Admin'|'Builder'|'Viewer';passwordHash:string;createdAt:string};
type Session={token:string;userId:string;expiresAt:number};

const g=globalThis as typeof globalThis & {__sylviaAuth?:{users:User[];sessions:Map<string,Session>}};
if(!g.__sylviaAuth){
  const seedPassword=process.env.SYLVIA_DEMO_PASSWORD||'sylvia-demo';
  const salt='sylvia-demo-salt';
  g.__sylviaAuth={users:[{id:'usr_owner',name:'SYLVIA Owner',email:'owner@sylvia.local',role:'Owner',passwordHash:crypto.scryptSync(seedPassword,salt,64).toString('hex'),createdAt:new Date().toISOString()}],sessions:new Map()};
}
export const authStore=g.__sylviaAuth!;
function hashPassword(password:string){return crypto.scryptSync(password,'sylvia-demo-salt',64).toString('hex')}
export function verifyCredentials(email:string,password:string){const u=authStore.users.find(x=>x.email.toLowerCase()===email.toLowerCase());return u&&crypto.timingSafeEqual(Buffer.from(u.passwordHash,'hex'),Buffer.from(hashPassword(password),'hex'))?u:null}
export function createSession(userId:string){const token=crypto.randomBytes(32).toString('hex');authStore.sessions.set(token,{token,userId,expiresAt:Date.now()+1000*60*60*24*7});return token}
export function getSessionUser(token:string|undefined){if(!token)return null;const s=authStore.sessions.get(token);if(!s||s.expiresAt<Date.now()){if(s)authStore.sessions.delete(token);return null}return authStore.users.find(u=>u.id===s.userId)||null}
export function deleteSession(token:string|undefined){if(token)authStore.sessions.delete(token)}
export const sessionCookie='sylvia_session';
export function publicUser(u:User|null){return u?{id:u.id,name:u.name,email:u.email,role:u.role,createdAt:u.createdAt}:null}
