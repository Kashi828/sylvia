import {NextResponse} from 'next/server';
import {validBearer} from '@/lib/store';
const schedules=[
 {id:1,name:'Morning telemetry check',time:'08:00',days:'Mon–Fri',action:'Trigger event review',enabled:true},
 {id:2,name:'Night profile',time:'22:30',days:'Every day',action:'Pause non-critical automations',enabled:false}
];
export async function GET(request:Request){if(!validBearer(request))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});return NextResponse.json({ok:true,schedules})}
