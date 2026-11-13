'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, BarChart2, Tag, ArrowRight, Volume2, CheckCircle2, Sparkles } from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { Course } from '@/types';

export default function CoursesPage() {
  const router = useRouter();
  const { announce } = useA11y();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const courses: Course[] = [
    {
      id: 'course-1',
      title: 'Digital Accessibility Fundamentals & Screen Reader Mastery',
      slug: 'digital-accessibility-fundamentals',
      description: 'Master screen readers (NVDA, JAWS, TalkBack), keyboard shortcuts, and document navigation for independent study and office productivity.',
      duration: '4 Weeks (16 Hours)',
      level: 'beginner',
      price: 500,
      currency: 'ETB',
      status: 'published',
    },
    {
      id: 'course-2',
      title: 'Accessible Remote Customer Support & Communications',
      slug: 'accessible-customer-support',
      description: 'Learn CRM navigation, professional email writing, telephone etiquette, and voice ticketing systems designed for visually impaired remote support agents.',
      duration: '6 Weeks (24 Hours)',
      level: 'intermediate',
      price: 800,
      currency: 'ETB',
      status: 'published',
    },
    {
      id: 'course-3',
      title: 'Accessible Python Programming & Data Literacy',
      slug: 'accessible-python-programming',
      description: 'Build algorithmic thinking using voice-friendly audio code editors, command-line environments, and structured programming paradigms.',
      duration: '8 Weeks (32 Hours)',
      level: 'advanced',
      price: 1200,
      currency: 'ETB',
      status: 'published',
    },
  ];

  const handleSelectCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    announce(`Selected ${course.title}. Price is ${course.price} ${course.currency}. Proceeding to human-assisted payment.`);
    setTimeout(() => {
      router.push(`/payment?courseId=${course.id}&title=${encodeURIComponent(course.title)}&price=${course.price}`);
    }, 1200);
  };

  const handleReadDetails = (course: Course) => {
    const text = `${course.title}. Level: ${course.level}. Duration: ${course.duration}. Price: ${course.price} ${course.currency}. ${course.description}`;
    announce(text);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utter);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Title & Heading (Rule 2) */}
      <header className="space-y-3">
        <h1 id="courses-h1" className="text-3xl font-extrabold text-white">
          Choose a Course
        </h1>
        <p className="text-slate-200 text-sm max-w-2xl leading-relaxed">
          Select a course below using your keyboard or voice. You can ask the Web Assistant: <em className="text-emerald-300">&quot;Compare courses&quot;</em> or <em className="text-emerald-300">&quot;What do you recommend for remote work?&quot;</em>
        </p>
      </header>

      {/* Course List using Native HTML <ul> and <li> (Rule 1 & Rule 24) */}
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0 m-0">
        {courses.map((course, idx) => (
          <li
            key={course.id}
            className={`p-6 rounded-3xl border flex flex-col justify-between transition-all bg-slate-900 shadow-xl ${
              selectedCourseId === course.id
                ? 'border-emerald-500 ring-2 ring-emerald-500'
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <article className="space-y-4">
              {/* Badge & Level */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  Course {idx + 1} of 3
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-100 capitalize font-bold">
                  {course.level}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-xl font-bold text-white leading-snug">{course.title}</h2>
                <p className="text-sm text-slate-200 mt-2 leading-relaxed">{course.description}</p>
              </div>

              {/* Meta details */}
              <dl className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Duration</dt>
                  <Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <dd>{course.duration}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="sr-only">Price</dt>
                  <Tag className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <dd className="font-bold text-white text-base">{course.price} {course.currency}</dd>
                </div>
              </dl>
            </article>

            {/* Actions (Rule 12: min 44px) */}
            <div className="pt-6 mt-6 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => handleReadDetails(course)}
                className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-600 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label={`Read details aloud for ${course.title}`}
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>Hear Description Aloud</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCourse(course)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl min-h-[44px] shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300"
                aria-label={`Select ${course.title} and go to payment`}
              >
                <span>Select & Go to Pay</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
