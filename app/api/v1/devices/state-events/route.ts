import { NextRequest } from "next/server";
import { subscribeState, type StateEvent } from "@/lib/state-events";
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

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: StateEvent) => {
        if (deviceId && event.deviceId !== deviceId) return;
        controller.enqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
        );
      };

      if (deviceId) {
        void findPersistentDeviceById(deviceId, auth.ownerId, auth.projectId).then(device => {
          if (!device) return;
          send({
            type: "device.state.updated",
            deviceId: String(device.id),
            state: (device.state || {}) as StateEvent["state"],
            updatedAt: device.lastSeen ? new Date(device.lastSeen).toISOString() : new Date().toISOString(),
          });
        }).catch(() => {});
      }
      controller.enqueue(encoder.encode(`event: ready\ndata: {"ok":true}\n\n`));
      unsubscribe = subscribeState(send);
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: {}\n\n`));
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
