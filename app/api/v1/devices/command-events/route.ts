import { NextRequest } from "next/server";
import { subscribeCommand, type CommandEvent } from "@/lib/command-events";
import { findPersistentDeviceById } from "@/lib/persistent-devices";
import { requestPrincipal } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  const auth = await requestPrincipal(request);
  if (!auth) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  if (!deviceId) {
    return new Response(JSON.stringify({ ok: false, error: "deviceId is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const device = await findPersistentDeviceById(deviceId, auth.ownerId, auth.projectId);
  if (!device) {
    return new Response(JSON.stringify({ ok: false, error: "Device not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: CommandEvent) => {
        if (deviceId && event.deviceId !== deviceId) return;
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
      };
      controller.enqueue(encoder.encode('event: ready\ndata: {"ok":true}\n\n'));
      unsubscribe = subscribeCommand(send);
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode("event: heartbeat\ndata: {}\n\n"));
      }, 20000);
    },
    cancel() {
      unsubscribe?.();
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
