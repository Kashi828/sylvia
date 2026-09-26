import { NextResponse } from "next/server";
import { runDueSchedules } from "@/lib/automation-engine";
import { markStaleDevices } from "@/lib/device-registry";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(secret && request.headers.get("authorization")!==`Bearer ${secret}`)return new NextResponse("Unauthorized",{status:401});
 try{
   const schedules=await runDueSchedules(new Date());
   await markStaleDevices(Math.max(30000,Number(process.env.SYLVIA_DEVICE_STALE_SECONDS||90)*1000));
   const executed=schedules.filter(item=>["queued","dispatched","failed"].includes(item.result.status)).length;
   return NextResponse.json({ok:true,executed,schedules});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Automation scheduler failed"},{status:500});}
}