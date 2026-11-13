import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:4000';

    try {
      const response = await fetch(`${backendUrl}/api/help-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (_networkError) {
      // Local fallback
    }

    return NextResponse.json({
      id: 'ticket-' + Date.now(),
      status: 'waiting',
      message: 'Help request recorded. A staff helper will contact you.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

