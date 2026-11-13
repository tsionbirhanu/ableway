import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const exportData = {
      exportedAt: new Date().toISOString(),
      platform: 'Ableway Accessibility Learning Platform',
      profile: {
        name: 'Learner User',
        email: 'learner@example.com',
        phone: '+251911234567',
        language: 'en',
        role: 'learner',
      },
      accessibility: {
        interactionMode: 'voice-first',
        contrastTheme: 'default',
        textSize: 'normal',
        speechRate: 0.82,
        shortcutsEnabled: true,
      },
      jobAlerts: [
        {
          id: 'alert-1',
          keywords: ['Accessibility tester', 'Customer support'],
          location: 'Remote',
          jobType: 'Full-time',
          channel: 'Telegram',
          active: true,
        },
      ],
      enrollments: [
        {
          courseSlug: 'accessible-web-dev',
          status: 'active',
          progress: 40,
        },
      ],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="ableway-learner-data.json"',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not export data.' }, { status: 500 });
  }
}

