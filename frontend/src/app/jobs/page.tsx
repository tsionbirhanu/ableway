"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { useA11y } from "@/core/a11y/a11y-context";
import { useEarcons } from "@/hooks/use-earcons";
import { Briefcase, MapPin, CheckCircle, Volume2, Search, FileText } from "lucide-react";
import { JobListing } from "@/types/job";

const SAMPLE_JOBS: JobListing[] = [
  {
    id: "job-1",
    employerName: "TechAccess Africa",
    employerVerified: true,
    title: "Virtual Customer Support Representative",
    location: "Remote (Pan-Africa)",
    isRemote: true,
    jobType: "full-time",
    summary:
      "Handle customer support inquiries via accessible web chat and email ticketing systems.",
    description:
      "We provide all assistive technology tools tested and validated for NVDA and screen readers. Flexible scheduling with paid onboarding.",
    requiredSkills: ["Verbal Articulation", "Active Listening", "Email Etiquette"],
    accommodationsOffered: [
      "100% Screen reader tested ticketing tool",
      "Flexible working hours",
      "Audio-only onboarding available",
    ],
    postedDate: "2 days ago",
  },
  {
    id: "job-2",
    employerName: "Global Virtual Services",
    employerVerified: true,
    title: "Executive Virtual Assistant",
    location: "Remote",
    isRemote: true,
    jobType: "part-time",
    summary:
      "Coordinate calendar scheduling, manage executive emails, and prepare spoken agenda summaries.",
    description:
      "Looking for a motivated virtual assistant skilled in time blocking, calendar management, and professional communications.",
    requiredSkills: ["Calendar Management", "Client Onboarding", "Time Blocking"],
    accommodationsOffered: [
      "Screen reader friendly calendar software",
      "Voice notes communication enabled",
    ],
    postedDate: "1 week ago",
  },
  {
    id: "job-3",
    employerName: "Inclusion Works Kenya",
    employerVerified: true,
    title: "Data Verification & Audio Transcriptionist",
    location: "Nairobi / Remote",
    isRemote: true,
    jobType: "contract",
    summary:
      "Review speech transcriptions and audit accuracy for machine learning datasets.",
    description:
      "A keyboard-first role focusing on audio playback, quality auditing, and feedback logging.",
    requiredSkills: ["Keyboard Shortcuts", "Screen Reader Navigation", "Active Listening"],
    accommodationsOffered: [
      "Pedal and hotkey playback support",
      "Direct mentor support",
    ],
    postedDate: "Just now",
  },
];

export default function JobsPage() {
  const { speak } = useA11y();
  const { play } = useEarcons();

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);

  useEffect(() => {
    speak(
      "Jobs Portal. 3 verified accessible positions available. Say 'Apply' or click any job to review requirements."
    );
  }, [speak]);

  const filteredJobs = SAMPLE_JOBS.filter(
    (j) =>
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const speakJob = (job: JobListing) => {
    const speech = `Job title: ${job.title} at ${job.employerName}. Location: ${job.location}. Summary: ${job.summary}. Accommodations offered: ${job.accommodationsOffered.join(", ")}.`;
    speak(speech);
  };

  const handleApply = (jobId: string, jobTitle: string) => {
    if (appliedJobs.includes(jobId)) return;
    play("success");
    setAppliedJobs((prev) => [...prev, jobId]);
    speak(`Your application for ${jobTitle} has been submitted with your verified skills profile.`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <AppHeader />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-white">Accessible Job Opportunities</h1>
            <p className="text-slate-400 text-sm">
              Verified employers offering accessible software, fair pay, and inclusive environments.
            </p>
          </div>

          <Link
            href="/jobs/cv-builder"
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition flex items-center gap-2 shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-300 flex-none"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Voice CV Builder</span>
          </Link>
        </div>

        {/* Search bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-400 ml-2" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter jobs by title, skill, or accommodation..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            aria-label="Filter jobs by title, skill, or accommodation"
          />
        </div>

        {/* Linear, Listening-Friendly Job Listings (FR-6.2) */}
        <section aria-label="Job listings" className="space-y-4">
          {filteredJobs.map((job) => {
            const hasApplied = appliedJobs.includes(job.id);
            return (
              <article
                key={job.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">{job.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-emerald-400">{job.employerName}</span>
                      {job.employerVerified && (
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                          Verified Employer
                        </span>
                      )}
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {job.location}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakJob(job)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    aria-label={`Read aloud details for ${job.title}`}
                  >
                    <Volume2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>Read Aloud</span>
                  </button>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">{job.summary}</p>

                {/* Accommodations Highlight */}
                <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Accessibility Accommodations Offered:
                  </span>
                  <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
                    {job.accommodationsOffered.map((acc) => (
                      <li key={acc}>{acc}</li>
                    ))}
                  </ul>
                </div>

                {/* Footer with Skills and Apply button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApply(job.id, job.title)}
                    disabled={hasApplied}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition focus:outline-none focus:ring-4 cursor-pointer flex items-center gap-2 ${
                      hasApplied
                        ? "bg-slate-800 text-emerald-400 cursor-default"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg focus:ring-emerald-300"
                    }`}
                  >
                    {hasApplied ? (
                      <>
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Application Submitted</span>
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4" aria-hidden="true" />
                        <span>Apply with Spoken Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}

