import {store, validBearer} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!validBearer(request)) return new Response(JSON.stringify({ok:false,error:'Unauthorized'}), {status:401, headers:{'Content-Type':'application/json'}});
  const encoder = new TextEncoder();
  const snapshot = () => `data: ${JSON.stringify({timestamp:new Date().toISOString(),devices:store.devices,streams:store.streams})}\n\n`;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(snapshot()));
      const timer = setInterval(() => controller.enqueue(encoder.encode(snapshot())), 1500);
      const close = () => clearInterval(timer);
      request.signal.addEventListener('abort', () => { close(); try { controller.close(); } catch {} }, {once:true});
    },
  });
  return new Response(stream, {headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive'}});
}
