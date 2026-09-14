import { NextResponse } from 'next/server';
import { findDevice, rotateDeviceToken, validBearer } from '@/lib/store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deviceId = Number(id);
  if (!Number.isInteger(deviceId)) return NextResponse.json({ ok:false, error:'Invalid device id' }, { status:400 });
  const actor = validBearer(request);
  if (!actor) return NextResponse.json({ ok:false, error:'Unauthorized' }, { status:401 });
  const target = findDevice(deviceId);
  if (!target || !validBearer(actor, deviceId)) return NextResponse.json({ ok:false, error:'Device not found' }, { status:404 });
  const rotated = rotateDeviceToken(deviceId);
  if (!rotated) return NextResponse.json({ ok:false, error:'Device not found' }, { status:404 });
  return NextResponse.json({ ok:true, deviceId, token:rotated.token, tokenPreview:rotated.device.tokenPreview, warning:'Store this token securely. It will not be returned again.' });
}
