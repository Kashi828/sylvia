import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {query,databaseConfigured} from '@/lib/db';
import {createSession,publicUser,sessionCookie} from '@/lib/auth';

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const name=String(body.name||'').trim(); const email=String(body.email||'').trim().toLowerCase(); const password=String(body.password||'');
  if(name.length<2||!email.includes('@')||password.length<8) return NextResponse.json({ok:false,error:'Use a name, valid email, and password of at least 8 characters'},{status:400});
  if(databaseConfigured()){
    try{
      const passwordHash=crypto.scryptSync(password,'sylvia-db-salt',64).toString('hex');
      const r=await query<{id:string;name:string;email:string;created_at:string}>(`insert into users(name,email,password_hash) values($1,$2,$3) returning id,name,email,created_at`,[name,email,passwordHash]);
      const user={id:r.rows[0].id,name:r.rows[0].name,email:r.rows[0].email,role:'Owner' as const,passwordHash,createdAt:r.rows[0].created_at};
      const token=createSession(user.id); const res=NextResponse.json({ok:true,user:publicUser(user)}); res.cookies.set(sessionCookie,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*7}); return res;
    }catch(e:any){ if(String(e?.code)==='23505') return NextResponse.json({ok:false,error:'Email already registered'},{status:409}); return NextResponse.json({ok:false,error:'Database registration failed'},{status:500}); }
  }
  return NextResponse.json({ok:false,error:'Database mode is not enabled. Keep using the demo account or configure DATABASE_URL.'},{status:503});
}
