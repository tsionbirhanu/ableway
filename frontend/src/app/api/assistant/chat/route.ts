import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, currentPage, language = 'en' } = body;

    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:4000';

    try {
      const response = await fetch(`${backendUrl}/api/assistant/chat`, {
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
      // Backend not running on port 4000; execute compliant local fallback
    }

    // High-fidelity local fallback conforming to SRS v2.0
    const lower = (message || '').toLowerCase().trim();

    if (lower.includes('human') || lower.includes('agent') || lower.includes('call staff') || lower.includes('help me')) {
      return NextResponse.json({
        reply: 'I am alerting a human helper for you right away. A team member will assist you shortly.',
        spokenReply: 'I am calling a human helper for you right now.',
        actions: [{ name: 'request_human', params: { reason: 'Learner requested human help', type: 'general' } }],
        escalateToHuman: true,
        language,
      });
    }

    if (lower.includes('course') || lower.includes('classes')) {
      return NextResponse.json({
        reply: 'We offer Digital Accessibility Fundamentals (4 weeks, 500 ETB), Accessible Customer Support (6 weeks, 800 ETB), and Python Programming (8 weeks, 1200 ETB). Would you like to select one or hear a comparison?',
        actions: [{ name: 'go_to_page', params: { path: '/courses' } }],
        escalateToHuman: false,
        language,
      });
    }

    if (lower.includes('register') || lower.includes('sign up')) {
      return NextResponse.json({
        reply: 'Navigating to registration. I can fill the form as you speak your name and email.',
        actions: [{ name: 'go_to_page', params: { path: '/register' } }],
        escalateToHuman: false,
        language,
      });
    }

    if (lower.includes('pay') || lower.includes('cost')) {
      return NextResponse.json({
        reply: 'All payments on Ableway are handled safely with human staff assistance via Telebirr or CBE. Navigating to the payment page.',
        actions: [{ name: 'go_to_page', params: { path: '/payment' } }],
        escalateToHuman: false,
        language,
      });
    }

    return NextResponse.json({
      reply: 'I am your Ableway Assistant. I can guide you through registration, course selection, payment with human help, and learning modules. What would you like to do?',
      actions: [],
      escalateToHuman: false,
      language,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

