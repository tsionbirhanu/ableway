import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const preferences = await req.json();

    const response = NextResponse.json({
      success: true,
      preferences,
      message: 'Accessibility settings saved successfully.',
    });

    // Save theme and settings to cookie for zero-flash initial render
    if (preferences.contrastTheme) {
      response.cookies.set('ableway_theme', preferences.contrastTheme, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
      });
    }

    if (preferences.textSize) {
      response.cookies.set('ableway_text_size', preferences.textSize, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    if (preferences.language) {
      response.cookies.set('ableway_lang', preferences.language.slice(0, 2), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

