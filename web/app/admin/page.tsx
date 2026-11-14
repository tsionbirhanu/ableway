'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { 
  ShieldAlert, 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  Trash2, 
  Send, 
  PlusCircle, 
  FileText, 
  AlertTriangle,
  Globe,
  Loader2,
  RefreshCw,
  Eye,
  CheckSquare,
  XSquare
} from 'lucide-react';
import { useA11y } from '@/lib/a11y/a11y-context';

export interface UnansweredQuestion {
  id: string;
  text: string;
  language: string;
  channel: 'web' | 'telegram';
  resolved: boolean;
  createdAt: string;
}

export interface KnowledgeItem {
  id: string;
  sourceType: string;
  title: string;
  text: string;
  language: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
}

export default function AdminDashboardPage() {
  const { announce } = useA11y();

  const [activeTab, setActiveTab] = useState<'unanswered' | 'knowledge' | 'checklist'>('unanswered');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unanswered Questions State
  const [unanswered, setUnanswered] = useState<UnansweredQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<UnansweredQuestion | null>(null);
  const [answerTitle, setAnswerTitle] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [answerSourceType, setAnswerSourceType] = useState('platform_help');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // Knowledge Base State
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([]);
  const [isCreatingKnowledge, setIsCreatingKnowledge] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newSourceType, setNewSourceType] = useState('platform_help');
  const [newLang, setNewLang] = useState('en');

  // Checklist state
  const [courseList, setCourseList] = useState<any[]>([]);

  // Fetch Unanswered
  const fetchUnanswered = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/unanswered?resolved=false');
      if (!res.ok) throw new Error('Failed to load unanswered questions');
      const data = await res.json();
      setUnanswered(data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching unanswered');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Knowledge
  const fetchKnowledge = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/knowledge?limit=50');
      if (!res.ok) throw new Error('Failed to load knowledge entries');
      const data = await res.json();
      setKnowledgeList(data.chunks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching knowledge');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Courses for checklist
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/content/courses');
      if (!res.ok) throw new Error('Failed to load courses checklist');
      const data = await res.json();
      setCourseList(data.courses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'unanswered') fetchUnanswered();
    else if (activeTab === 'knowledge') fetchKnowledge();
    else if (activeTab === 'checklist') fetchCourses();
  }, [activeTab, fetchUnanswered, fetchKnowledge, fetchCourses]);

  // Handle Answer Submission & Ingestion
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !answerText.trim() || !answerTitle.trim()) return;

    setIsSubmittingAnswer(true);
    try {
      // 1. Ingest into knowledge chunks
      const kbRes = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: answerTitle.trim(),
          text: answerText.trim(),
          sourceType: answerSourceType,
          language: selectedQuestion.language || 'en',
          status: 'published',
        }),
      });

      if (!kbRes.ok) throw new Error('Failed to ingest knowledge answer');

      // 2. Mark unanswered question resolved
      await fetch(`/api/admin/unanswered/${selectedQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });

      announce(`Answer successfully ingested and question marked resolved!`, 'polite');
      setSelectedQuestion(null);
      setAnswerTitle('');
      setAnswerText('');
      fetchUnanswered();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error submitting answer';
      announce(`Failed: ${msg}`, 'assertive');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Handle Dismiss Question
  const handleDismissQuestion = async (id: string) => {
    try {
      await fetch(`/api/admin/unanswered/${id}`, { method: 'DELETE' });
      setUnanswered((prev) => prev.filter((q) => q.id !== id));
      announce('Question dismissed', 'polite');
    } catch (err) {
      announce('Failed to dismiss question', 'assertive');
    }
  };

  // Handle Create Knowledge
  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          text: newText.trim(),
          sourceType: newSourceType,
          language: newLang,
          status: 'published',
        }),
      });
      if (!res.ok) throw new Error('Failed to create knowledge entry');
      announce('New knowledge entry published and vector indexed', 'polite');
      setIsCreatingKnowledge(false);
      setNewTitle('');
      setNewText('');
      fetchKnowledge();
    } catch (err) {
      announce(`Error creating knowledge: ${err instanceof Error ? err.message : ''}`, 'assertive');
    }
  };

  // Handle Unpublish Knowledge
  const handleUnpublishKnowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/knowledge/${id}/unpublish`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unpublish chunk');
      announce('Knowledge entry unpublished and removed from active vector search', 'polite');
      fetchKnowledge();
    } catch (err) {
      announce('Could not unpublish entry', 'assertive');
    }
  };

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-emerald-400" aria-hidden="true" />
          <span>Content Management & Knowledge Administration</span>
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          Manage platform knowledge chunks, answer questions the assistant was unsure about, and audit lesson accessibility publish checklists.
        </p>
      </header>

      {/* Tabs */}
      <nav aria-label="Admin Navigation Tabs" className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('unanswered')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
            activeTab === 'unanswered'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
          <span>Unanswered Questions ({unanswered.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
            activeTab === 'knowledge'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" aria-hidden="true" />
          <span>Knowledge Base ({knowledgeList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
            activeTab === 'checklist'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          <span>Lesson Accessibility Checklists</span>
        </button>
      </nav>

      {error && (
        <div role="alert" className="p-4 bg-red-950/80 border border-red-700 rounded-2xl text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Tab 1: Unanswered Questions */}
      {activeTab === 'unanswered' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section aria-labelledby="unanswered-list-heading" className="lg:col-span-2 space-y-4">
            <h2 id="unanswered-list-heading" className="text-xl font-bold text-white flex items-center justify-between">
              <span>Learner Questions Needing Grounded Answers</span>
              <button
                type="button"
                onClick={fetchUnanswered}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Refresh unanswered questions"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </button>
            </h2>

            {loading ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-700 rounded-3xl text-slate-300 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" aria-hidden="true" />
                <span>Loading questions...</span>
              </div>
            ) : (
              <ul className="space-y-3 list-none p-0 m-0">
                {unanswered.map((q) => (
                  <li
                    key={q.id}
                    className={`p-5 rounded-2xl border transition-all bg-slate-900 ${
                      selectedQuestion?.id === q.id
                        ? 'border-emerald-500 ring-2 ring-emerald-500'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-700">
                          {q.channel}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Lang: {q.language}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="py-3 text-sm text-white font-medium leading-relaxed">&ldquo;{q.text}&rdquo;</p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleDismissQuestion(q.id)}
                        className="p-2 text-slate-400 hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                        aria-label={`Dismiss question: ${q.text}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuestion(q);
                          setAnswerTitle(`FAQ: ${q.text.slice(0, 60)}...`);
                          announce(`Drafting answer for question: ${q.text}`, 'polite');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl min-h-[44px] flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Answer & Ingest</span>
                      </button>
                    </div>
                  </li>
                ))}

                {unanswered.length === 0 && (
                  <li className="p-12 text-center bg-slate-900 border border-slate-700 rounded-3xl text-slate-300 text-sm">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" aria-hidden="true" />
                    <p className="font-bold text-white text-base">All clear!</p>
                    <p className="text-xs text-slate-400">No unanswered questions currently recorded.</p>
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Form to Answer and Ingest Knowledge */}
          <section aria-labelledby="answer-form-heading" className="space-y-4">
            <h2 id="answer-form-heading" className="text-xl font-bold text-white">Answer Grounding Tool</h2>

            {selectedQuestion ? (
              <form onSubmit={handleAnswerSubmit} className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4 shadow-xl">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-emerald-400">Answering Question</span>
                  <p className="text-xs text-slate-200 mt-1 font-medium">&ldquo;{selectedQuestion.text}&rdquo;</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="answer-title-input" className="block text-xs font-bold text-slate-200">
                    Knowledge Document Title
                  </label>
                  <input
                    id="answer-title-input"
                    type="text"
                    required
                    value={answerTitle}
                    onChange={(e) => setAnswerTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="answer-type-select" className="block text-xs font-bold text-slate-200">
                    Knowledge Source Category
                  </label>
                  <select
                    id="answer-type-select"
                    value={answerSourceType}
                    onChange={(e) => setAnswerSourceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[44px]"
                  >
                    <option value="platform_help">Platform Help / General</option>
                    <option value="payment_help">Payment & Assistance</option>
                    <option value="telegram_guide">Telegram How-To</option>
                    <option value="course">Course Description</option>
                    <option value="job">Job Listing Knowledge</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="answer-text-area" className="block text-xs font-bold text-slate-200">
                    Grounded Answer / Content Body
                  </label>
                  <textarea
                    id="answer-text-area"
                    required
                    rows={6}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Provide plain language facts the assistant will retrieve to answer future learners..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedQuestion(null)}
                    className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAnswer}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs min-h-[44px] flex items-center justify-center gap-2"
                  >
                    {isSubmittingAnswer ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>Ingest & Ground</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 bg-slate-900 border border-slate-700 rounded-3xl text-center text-slate-400 text-xs">
                Select an unanswered question from the list to write and ingest an authoritative answer.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 2: Knowledge Base Management */}
      {activeTab === 'knowledge' && (
        <section aria-labelledby="knowledge-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 id="knowledge-heading" className="text-xl font-bold text-white">
              Vector Grounded Knowledge Base ({knowledgeList.length} Chunks)
            </h2>

            <button
              type="button"
              onClick={() => setIsCreatingKnowledge(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl min-h-[44px] flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Add Grounded Knowledge</span>
            </button>
          </div>

          {/* Modal / Section to add knowledge */}
          {isCreatingKnowledge && (
            <form onSubmit={handleCreateKnowledge} className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-base">New Grounded Knowledge Chunk</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingKnowledge(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="new-kb-title" className="block text-xs font-bold text-slate-200">Title</label>
                  <input
                    id="new-kb-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="new-kb-type" className="block text-xs font-bold text-slate-200">Source Category</label>
                  <select
                    id="new-kb-type"
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white min-h-[44px]"
                  >
                    <option value="platform_help">Platform Help</option>
                    <option value="payment_help">Payment Help</option>
                    <option value="telegram_guide">Telegram Guide</option>
                    <option value="course">Course Description</option>
                    <option value="job">Job Information</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="new-kb-text" className="block text-xs font-bold text-slate-200">Knowledge Content (300-500 words chunks)</label>
                <textarea
                  id="new-kb-text"
                  required
                  rows={5}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingKnowledge(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold min-h-[44px]"
                >
                  Ingest & Publish
                </button>
              </div>
            </form>
          )}

          <ul className="space-y-3 list-none p-0 m-0">
            {knowledgeList.map((item) => (
              <li key={item.id} className="p-5 bg-slate-900 border border-slate-700 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700">
                      {item.sourceType}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">v{item.version} ({item.language})</span>
                    <span className={`text-xs font-bold ${item.status === 'published' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {item.status}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUnpublishKnowledge(item.id)}
                    className="text-xs text-red-400 hover:text-red-300 font-medium min-h-[44px] px-2 flex items-center gap-1"
                  >
                    <span>Unpublish</span>
                  </button>
                </div>

                <h3 className="font-bold text-white text-base">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tab 3: Publish Checklist Auditor */}
      {activeTab === 'checklist' && (
        <section aria-labelledby="checklist-heading" className="space-y-6">
          <h2 id="checklist-heading" className="text-xl font-bold text-white">
            Accessible Course & Lesson Publish Checklist
          </h2>

          <div className="p-4 bg-blue-950 border border-blue-700 rounded-2xl text-xs text-blue-200 leading-relaxed">
            <strong>Publishing Quality Rule:</strong> No lesson can be published to learners without a full text transcript, audio/text media, and explicit text descriptions for every visual graphic.
          </div>

          <div className="space-y-4">
            {courseList.map((course) => (
              <div key={course.id} className="p-6 bg-slate-900 border border-slate-700 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{course.title}</h3>
                    <p className="text-xs text-slate-400">Status: {course.status} | Currency: {course.currency}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    course.status === 'published' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300'
                  }`}>
                    {course.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>Transcript Attached</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>16 kHz Speech Audio</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>Alt Text for Images</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
