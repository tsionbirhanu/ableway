import { NextResponse } from 'next/server';

interface LinkCodeEntry {
  code: string;
  expiresAt: number;
  linked: boolean;
  telegramUsername?: string;
}

const activeCodes = new Map<string, LinkCodeEntry>();

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    // Simulate link completion (used in demo / tests)
    if (action === 'simulate-link') {
      const code = body.code;
      if (!code || !activeCodes.has(code)) {
        return NextResponse.json(
          { error: 'Code not found or expired.' },
          { status: 404 }
        );
      }
      const entry = activeCodes.get(code)!;
      entry.linked = true;
      entry.telegramUsername = body.username || '@LearnerAccount';
      return NextResponse.json({ ok: true, linked: true, username: entry.telegramUsername });
    }

    // Default: generate a new 6-digit one-time code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInSeconds = 300; // 5 minutes
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    activeCodes.set(code, {
      code,
      expiresAt,
      linked: false,
    });

    return NextResponse.json({
      ok: true,
      code,
      expiresAt,
      expiresInSeconds,
      formattedCode: `${code.slice(0, 3)} ${code.slice(3)}`,
      botUsername: 'AblewayBot',
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not create link code. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Please provide a linking code to check.' },
        { status: 400 }
      );
    }

    const entry = activeCodes.get(code);
    if (!entry) {
      return NextResponse.json({
        ok: true,
        linked: false,
        expired: true,
        message: 'Code not found or expired.',
      });
    }

    if (Date.now() > entry.expiresAt) {
      activeCodes.delete(code);
      return NextResponse.json({
        ok: true,
        linked: false,
        expired: true,
        message: 'Code has expired.',
      });
    }

    return NextResponse.json({
      ok: true,
      linked: entry.linked,
      expired: false,
      telegramUsername: entry.telegramUsername,
      remainingSeconds: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000)),
    });
  } catch {
    return NextResponse.json(
      { error: 'Error checking linking status.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    return NextResponse.json({
      ok: true,
      unlinked: true,
      message: 'Telegram account unlinked successfully.',
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not unlink Telegram account. Please try again.' },
      { status: 500 }
    );
  }
}

