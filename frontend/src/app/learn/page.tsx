"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { useA11y } from "@/core/a11y/a11y-context";
import { BookOpen, Clock, Award, ArrowRight } from "lucide-react";
import { Course } from "@/types/course";

const SAMPLE_COURSES: Course[] = [
  {
    id: "wr-100",
    code: "WR 100",
    title: "Fundamentals of Effective Communication",
    description:
      "Master workplace verbal communication, active listening, articulation, and professional email correspondence.",
    category: "Communication",
    level: "beginner",
    totalLessons: 15,
    estimatedHours: 45,
    skillsTaught: ["Verbal Articulation", "Active Listening", "Email Etiquette", "Audience Pacing"],
    modules: [],
  },
  {
    id: "va-1",
    code: "VA-1",
    title: "VA Foundations & Professional Identity",
    description:
      "A complete guide for virtual assistants: managing client communications, digital scheduling, and cloud office tools.",
    category: "Professional Skills",
    level: "intermediate",
    totalLessons: 12,
    estimatedHours: 36,
    skillsTaught: ["Calendar Management", "Client Onboarding", "Virtual Tools", "Time Blocking"],
    modules: [],
  },
  {
    id: "cs-101",
    code: "CS 101",
    title: "Computer Basics & Screen Reader Mastery",
    description:
      "Keyboard-only navigation, desktop commands, file management, and proficient screen reader workflows.",
    category: "Digital Literacy",
    level: "beginner",
    totalLessons: 10,
    estimatedHours: 25,
    skillsTaught: ["Keyboard Shortcuts", "Screen Reader Navigation", "File Hierarchy", "Internet Browsing"],
    modules: [],
  },
];

export default function LearnPage() {
  const { speak } = useA11y();

  useEffect(() => {
    speak(
      "Learn portal. 3 courses available: Fundamentals of Effective Communication, Virtual Assistant Foundations, and Computer Basics. Select a course to begin."
    );
  }, [speak]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white">Course Catalog &amp; Learning Paths</h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Audio-first, structured courses designed for independent acquisition of digital and professional skills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_COURSES.map((course) => (
            <div
              key={course.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl hover:border-emerald-500/40 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30">
                    {course.code}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{course.level}</span>
                </div>

                <h2 className="text-xl font-bold text-white">{course.title}</h2>
                <p className="text-slate-300 text-sm leading-relaxed">{course.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    {course.totalLessons} Lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    {course.estimatedHours} hrs
                  </span>
                </div>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {course.skillsTaught.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href={`/learn/${course.id}`}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-center transition flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-300"
              >
                <span>View Course Details</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

