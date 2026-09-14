import { NextRequest, NextResponse } from "next/server";
import { aggregateNumeric, queryTelemetry } from "@/lib/telemetry-analytics";

const bucketSizes: Record<string, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const deviceId = params.get("deviceId");
  const streamId = params.get("streamId");
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  const bucket = params.get("bucket") || "5m";

  if (!deviceId || !streamId) {
    return NextResponse.json(
      { error: "deviceId and streamId are required" },
      { status: 400 },
    );
  }

  const rows = await queryTelemetry(deviceId, streamId, from, to);
  const bucketMs = bucketSizes[bucket] ?? bucketSizes["5m"];

  return NextResponse.json({
    deviceId,
    streamId,
    from: from ?? null,
    to: to ?? null,
    bucket,
    samples: rows,
    aggregates: aggregateNumeric(rows, bucketMs),
  });
}
