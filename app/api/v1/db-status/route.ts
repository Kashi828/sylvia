import {NextResponse} from 'next/server';
import {databaseConfigured,query} from '@/lib/db';
export async function GET(){
  if(!databaseConfigured()) return NextResponse.json({configured:false,connected:false,message:'DATABASE_URL not configured'});
  try{await query('select 1 as ok');return NextResponse.json({configured:true,connected:true});}
  catch{return NextResponse.json({configured:true,connected:false,message:'Database connection failed'},{status:503});}
}
