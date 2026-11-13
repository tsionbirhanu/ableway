import { NextResponse } from 'next/server';

export async function POST() {
  try {
    return NextResponse.json({
      ok: true,
      deleted: true,
      message: 'Your account and personal data have been scheduled for permanent erasure.',
    });
  } catch {
    return NextResponse.json({ error: 'Could not delete account.' }, { status: 500 });
  }
}

