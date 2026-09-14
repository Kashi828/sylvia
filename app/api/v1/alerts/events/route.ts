import {NextRequest,NextResponse} from 'next/server'; import {listAlertEvents} from '@/lib/alerts';
export async function GET(req:NextRequest){const activeOnly=req.nextUrl.searchParams.get('activeOnly')==='true'; return NextResponse.json({events:listAlertEvents({activeOnly,limit:200})})}
