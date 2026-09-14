import {NextRequest,NextResponse} from 'next/server';
import {listAlertDeliveries} from '@/lib/alerts';
export async function GET(req:NextRequest){const limit=Math.min(200,Math.max(1,Number(req.nextUrl.searchParams.get('limit')||100)));return NextResponse.json({deliveries:listAlertDeliveries(limit)});}
