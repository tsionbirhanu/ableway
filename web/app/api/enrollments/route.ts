import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, courseTitle, price } = body;

    if (!courseId || !courseTitle) {
      return NextResponse.json(
        { error: 'Please choose a valid course before continuing to payment.' },
        { status: 400 }
      );
    }

    const enrollmentId = `ENR-${Date.now().toString().slice(-6)}`;

    return NextResponse.json(
      {
        ok: true,
        enrollmentId,
        courseId,
        courseTitle,
        price: price || 'Free',
        status: 'pending_payment',
        message: `Successfully reserved enrollment for ${courseTitle}.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'We could not process your enrollment right now. Please try again.' },
      { status: 500 }
    );
  }
}

