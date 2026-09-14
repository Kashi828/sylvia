import {NextResponse} from 'next/server';
import {validBearer} from '@/lib/store';
const templates=[{id:1,name:'Virtual ESP32',protocol:'REST + MQTT'},{id:2,name:'Smart Sensor',protocol:'REST'},{id:3,name:'Relay Controller',protocol:'REST + MQTT'}];
export async function GET(request:Request){if(!validBearer(request))return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});return NextResponse.json({ok:true,templates})}
