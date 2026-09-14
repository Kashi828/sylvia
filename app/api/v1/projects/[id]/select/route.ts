import {NextResponse} from 'next/server';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){ const {id}=await params; const body=await req.json().catch(()=>({})); return NextResponse.json({ok:true,projectId:id,memberId:body.memberId||null,message:'Project selection acknowledged. Persist the active project in the client until workspace sessions are enabled.'}); }
