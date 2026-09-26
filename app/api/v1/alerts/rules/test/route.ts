
import {NextResponse} from "next/server";
import {requestOwnerId} from "@/lib/request-auth";
import {testPersistentAlertWebhook} from "@/lib/persistent-alerts";
import {testAlertWebhook as testMemoryWebhook} from "@/lib/alerts";
export async function POST(req:Request){
 const auth=await requestOwnerId(req);if(!auth)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const b=await req.json().catch(()=>({}));const id=String(b?.id||"");
 if(!process.env.POSTGRES_URL){const event=testMemoryWebhook(id);return event?NextResponse.json({ok:true,event,persistent:false}):NextResponse.json({ok:false,error:"Rule not found"},{status:404});}
 const result=await testPersistentAlertWebhook(id,auth.ownerId);return result?NextResponse.json({ok:true,...result,persistent:true}):NextResponse.json({ok:false,error:"Rule not found"},{status:404});
}