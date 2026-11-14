'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Search, 
  Filter, 
  Bell, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Accessibility, 
  ExternalLink,
  ChevronDown,
  Loader2,
  X
} from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';
import { useAssistant } from '@/lib/assistant/assistant-context';

export interface JobListing {
  id: string;
  title: string;
  employer: string;
  location: string;
  jobType: 'full_time' | 'part_time' | 'contract' | 'internship' | 'volunteer';
  description: string;
  requirements: string;
  howToApply: string;
  deadline?: string | null;
  accessibilityNotes?: string | null;
  publishedAt?: string | null;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
  volunteer: 'Volunteer',
};

export default function JobsPage() {
  const { announce, speak, stopSpeaking } = useA11y();
  const assistant = useAssistant();

  const queryInputId = useId();
  const locationInputId = useId();
  const typeSelectId = useId();

  // Search & Filter state
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  
  // Jobs list state
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentlyReadingId, setCurrentlyReadingId] = useState<string | null>(null);

  // Subscribe alert state
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertKeywords, setAlertKeywords] = useState('');
  const [alertLocation, setAlertLocation] = useState('');
  const [alertType, setAlertType] = useState('');
  const [alertChannel, setAlertChannel] = useState<'telegram' | 'sms'>('telegram');
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Set assistant page context
  useEffect(() => {
    if (assistant?.setPageContext) {
      assistant.setPageContext({ page: '/jobs' });
    }
    return () => {
      if (assistant?.setPageContext) {
        assistant.setPageContext(null);
      }
    };
  }, [assistant]);

  // Fetch jobs
  const fetchJobs = useCallback(async (reset = false, customOffset?: number) => {
    const currentOffset = reset ? 0 : (customOffset ?? offset);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (location.trim()) params.set('location', location.trim());
      if (jobType) params.set('type', jobType);
      params.set('offset', currentOffset.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load job listings');
      }

      const data = await res.json();
      const newJobs: JobListing[] = data.jobs || (data.job ? [data.job] : []);
      
      if (reset) {
        setJobs(newJobs);
        setOffset(newJobs.length);
      } else {
        setJobs((prev) => [...prev, ...newJobs]);
        setOffset(currentOffset + newJobs.length);
      }

      setHasMore(Boolean(data.nextOffset));
      
      const countMsg = reset 
        ? `Found ${newJobs.length} job ${newJobs.length === 1 ? 'opening' : 'openings'}`
        : `Loaded ${newJobs.length} more jobs`;
      announce(countMsg, 'polite');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not fetch jobs';
      setError(msg);
      announce(`Error: ${msg}`, 'assertive');
    } finally {
      setLoading(false);
    }
  }, [query, location, jobType, offset, announce]);

  // Initial fetch
  useEffect(() => {
    fetchJobs(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(true);
  };

  // Handle Voice Reading
  const handleToggleSpeak = async (job: JobListing) => {
    if (currentlyReadingId === job.id) {
      stopSpeaking();
      setCurrentlyReadingId(null);
      announce('Stopped reading', 'polite');
    } else {
      stopSpeaking();
      setCurrentlyReadingId(job.id);
      const textToRead = `${job.title} at ${job.employer}. Location: ${job.location}. Role type: ${JOB_TYPE_LABELS[job.jobType] || job.jobType}. Description: ${job.description}. Requirements: ${job.requirements}. ${job.accessibilityNotes ? `Accessibility accommodations: ${job.accessibilityNotes}.` : ''} How to apply: ${job.howToApply}.`;
      announce(`Reading details for ${job.title}`, 'polite');
      await speak(textToRead);
      setCurrentlyReadingId(null);
    }
  };

  // Handle Alert Subscription
  const handleSubscribeAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertLoading(true);
    setAlertError(null);
    setAlertSuccess(false);

    try {
      const keywords = alertKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          location: alertLocation.trim() || null,
          jobType: alertType || null,
          channel: alertChannel,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in to subscribe to job alerts.');
        }
        throw new Error('Failed to create subscription.');
      }

      setAlertSuccess(true);
      announce('Successfully subscribed to job alerts!', 'polite');
      setTimeout(() => {
        setIsAlertOpen(false);
        setAlertSuccess(false);
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error subscribing';
      setAlertError(msg);
      announce(`Error: ${msg}`, 'assertive');
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-400" aria-hidden="true" />
              <span>Accessible Job Opportunities</span>
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Verified inclusive job listings with explicit accessibility accommodations, screen-reader support, and direct voice reading.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAlertOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm min-h-[44px] focus:outline-none focus:ring-4 focus:ring-emerald-400 transition-colors shadow-lg"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            <span>Subscribe to Job Alerts</span>
          </button>
        </div>
      </header>

      {/* Search & Filter Form */}
      <section aria-labelledby="filter-heading" className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-md">
        <h2 id="filter-heading" className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <span>Search & Filter Jobs</span>
        </h2>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Query Input */}
          <div className="md:col-span-1 space-y-1">
            <label htmlFor={queryInputId} className="block text-xs font-bold text-slate-200">
              Keywords (Title, Skills, Employer)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                id={queryInputId}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Accessibility, React, Audio"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
              />
            </div>
          </div>

          {/* Location Input */}
          <div className="space-y-1">
            <label htmlFor={locationInputId} className="block text-xs font-bold text-slate-200">
              Location / Remote
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                id={locationInputId}
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, Addis Ababa"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
              />
            </div>
          </div>

          {/* Job Type Dropdown */}
          <div className="space-y-1">
            <label htmlFor={typeSelectId} className="block text-xs font-bold text-slate-200">
              Employment Type
            </label>
            <select
              id={typeSelectId}
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
            >
              <option value="">All Employment Types</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-sm rounded-xl py-2.5 min-h-[44px] flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-400 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>Search Jobs</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Job Alert Modal */}
      {isAlertOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="alert-dialog-title" className="text-xl font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                <span>Get Instant Job Alerts</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAlertOpen(false)}
                className="p-2 text-slate-300 hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close job alerts modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              We deliver new matching opportunities directly to your Telegram or SMS as soon as verified employers post them.
            </p>

            {alertError && (
              <div role="alert" className="p-3 bg-red-950 border border-red-700 rounded-xl text-xs text-red-200">
                {alertError}
              </div>
            )}

            {alertSuccess && (
              <div role="status" className="p-3 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Subscription saved! You will receive verified alerts.</span>
              </div>
            )}

            <form onSubmit={handleSubscribeAlert} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="alert-keywords-input" className="block text-xs font-bold text-slate-200">
                  Target Keywords (comma-separated)
                </label>
                <input
                  id="alert-keywords-input"
                  type="text"
                  value={alertKeywords}
                  onChange={(e) => setAlertKeywords(e.target.value)}
                  placeholder="e.g. Accessibility, Remote, Writer"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="alert-location-input" className="block text-xs font-bold text-slate-200">
                  Preferred Location (Optional)
                </label>
                <input
                  id="alert-location-input"
                  type="text"
                  value={alertLocation}
                  onChange={(e) => setAlertLocation(e.target.value)}
                  placeholder="e.g. Remote"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="alert-type-select" className="block text-xs font-bold text-slate-200">
                    Type
                  </label>
                  <select
                    id="alert-type-select"
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                  >
                    <option value="">Any</option>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="alert-channel-select" className="block text-xs font-bold text-slate-200">
                    Delivery Channel
                  </label>
                  <select
                    id="alert-channel-select"
                    value={alertChannel}
                    onChange={(e) => setAlertChannel(e.target.value as 'telegram' | 'sms')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                  >
                    <option value="telegram">Telegram Bot</option>
                    <option value="sms">SMS Text</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAlertOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={alertLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-2"
                >
                  {alertLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : null}
                  <span>Subscribe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Listings List */}
      <section aria-labelledby="listings-heading" className="space-y-4">
        <h2 id="listings-heading" className="text-xl font-bold text-white flex items-center justify-between">
          <span>Available Listings ({jobs.length})</span>
          {loading && <span className="text-xs text-slate-400 font-mono">Loading...</span>}
        </h2>

        {error && (
          <div role="alert" className="p-4 bg-red-950/80 border border-red-700 rounded-2xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <ul className="space-y-4 list-none p-0 m-0">
          {jobs.map((job) => {
            const isReading = currentlyReadingId === job.id;
            return (
              <li
                key={job.id}
                className="p-6 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-3xl transition-all shadow-md space-y-4"
              >
                <article>
                  {/* Job Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white leading-snug">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                        <span className="flex items-center gap-1 font-semibold text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          <span>{job.employer}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          <span>{job.location}</span>
                        </span>
                        {job.deadline && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Deadline: {job.deadline}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700">
                        {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSpeak(job)}
                        className={`p-2.5 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                          isReading
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                        }`}
                        aria-label={isReading ? `Stop reading ${job.title}` : `Read ${job.title} aloud`}
                      >
                        {isReading ? (
                          <VolumeX className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Accessibility Accommodation Callout */}
                  {job.accessibilityNotes && (
                    <div className="my-3 p-3.5 bg-emerald-950/60 border border-emerald-600/70 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
                      <Accessibility className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <strong className="font-bold text-emerald-300 block mb-0.5">
                          Accessibility & Accommodations Provided:
                        </strong>
                        <p className="leading-relaxed">{job.accessibilityNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* Job Description & Requirements */}
                  <div className="space-y-3 py-2 text-xs leading-relaxed text-slate-200">
                    <div>
                      <strong className="text-white block font-semibold mb-1">Description:</strong>
                      <p className="text-slate-300 whitespace-pre-line">{job.description}</p>
                    </div>

                    <div>
                      <strong className="text-white block font-semibold mb-1">Requirements:</strong>
                      <p className="text-slate-300 whitespace-pre-line">{job.requirements}</p>
                    </div>
                  </div>

                  {/* How to Apply */}
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-slate-400">How to Apply: </span>
                      <span className="text-white font-medium">{job.howToApply}</span>
                    </div>

                    {job.howToApply.startsWith('http') && (
                      <a
                        href={job.howToApply}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                      >
                        <span>Apply Externally</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              </li>
            );
          })}

          {!loading && jobs.length === 0 && (
            <li className="p-12 text-center bg-slate-900 border border-slate-700 rounded-3xl text-slate-300 text-sm space-y-2">
              <Briefcase className="w-10 h-10 mx-auto text-slate-500 mb-2" aria-hidden="true" />
              <p className="font-bold text-white text-base">No job opportunities match your criteria</p>
              <p className="text-xs text-slate-400">Try broadening your keywords or clearing the location filter.</p>
            </li>
          )}
        </ul>

        {/* Load More Button */}
        {hasMore && (
          <div className="pt-4 text-center">
            <button
              type="button"
              onClick={() => fetchJobs(false)}
              disabled={loading}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white font-bold text-sm rounded-xl min-h-[44px] border border-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-400 transition-colors inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
              <span>Load More Opportunities</span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
