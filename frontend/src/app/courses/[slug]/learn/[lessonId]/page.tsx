'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Lesson {
  id: string;
  title: string;
  transcript?: string | null;
  aiSummary?: string | null;
  video?: { streamUrl?: string; originalUrl: string } | null;
  resources: { id: string; title: string; fileUrl: string }[];
  quizzes: { id: string; title: string }[];
  assignments: { id: string; title: string }[];
}

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
}

export default function LessonPlayerPage({ params }: { params: { slug: string; lessonId: string } }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const watchStart = useRef<number>(Date.now());

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/lessons/${params.lessonId}`);
        setLesson(res.data.data);
        setSummary(res.data.data.aiSummary ?? null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to load this lesson. You may need to enroll first.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.lessonId]);

  async function handleSummarize() {
    setSummarizing(true);
    try {
      const res = await api.post('/ai/summarize', { lessonId: params.lessonId });
      setSummary(res.data.data.summary);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'AI summary is currently unavailable.');
    } finally {
      setSummarizing(false);
    }
  }

  async function handleSendChat() {
    if (!chatInput.trim()) return;
    const userMessage: ChatEntry = { role: 'user', content: chatInput };
    setChat((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await api.post('/ai/chat', {
        lessonId: params.lessonId,
        message: userMessage.content,
        history: chat,
      });
      setChat((prev) => [...prev, { role: 'assistant', content: res.data.data.reply }]);
    } catch (err: any) {
      setChat((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, the AI tutor is unavailable right now. Please try again shortly.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleMarkComplete() {
    setMarking(true);
    try {
      const watchedSecs = Math.round((Date.now() - watchStart.current) / 1000);
      await api.post(`/lessons/${params.lessonId}/progress`, {
        watchedSecs,
        lastPositionSecs: watchedSecs,
        isCompleted: true,
      });
      setCompleted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save your progress.');
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-24 text-center text-gray-500">Loading lesson…</div>;
  }

  if (error && !lesson) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Can&apos;t access this lesson</h1>
        <p className="mt-3 text-gray-600">{error}</p>
        <Link href={`/courses/${params.slug}`} className="mt-6 inline-block text-brand-600 hover:underline">
          ← Back to course
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Link href={`/courses/${params.slug}`} className="text-sm text-brand-600 hover:underline">
          ← Back to course
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{lesson?.title}</h1>

        <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black">
          {lesson?.video?.originalUrl ? (
            <video controls className="h-full w-full" src={lesson.video.originalUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              No video attached to this lesson yet.
            </div>
          )}
        </div>

        <button
          onClick={handleMarkComplete}
          disabled={marking || completed}
          className="mt-4 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          {completed ? 'Marked as complete' : marking ? 'Saving…' : 'Mark lesson complete'}
        </button>

        {lesson?.resources && lesson.resources.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold text-gray-900">Resources</h2>
            <ul className="mt-2 space-y-2">
              {lesson.resources.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-600 hover:underline"
                  >
                    <FileText size={14} /> {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(lesson?.quizzes?.length ?? 0) > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-900">Quiz</h2>
            {lesson!.quizzes.map((q) => (
              <p key={q.id} className="mt-1 text-sm text-gray-600">{q.title}</p>
            ))}
          </div>
        )}

        {(lesson?.assignments?.length ?? 0) > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-900">Assignment</h2>
            {lesson!.assignments.map((a) => (
              <p key={a.id} className="mt-1 text-sm text-gray-600">{a.title}</p>
            ))}
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">AI Lesson Summary</h2>
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="flex items-center gap-1 text-sm text-brand-600 hover:underline disabled:opacity-60"
            >
              <Sparkles size={14} /> {summarizing ? 'Summarizing…' : summary ? 'Regenerate' : 'Generate summary'}
            </button>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
            {summary || 'No summary yet — click "Generate summary" for an AI-written recap of this lesson.'}
          </p>
        </div>
      </div>

      <aside className="flex h-fit flex-col rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 p-4">
          <Sparkles size={16} className="text-brand-600" />
          <h2 className="font-semibold text-gray-900">AI Chat Tutor</h2>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 400 }}>
          {chat.length === 0 && (
            <p className="text-sm text-gray-400">Ask a question about this lesson and get instant help.</p>
          )}
          {chat.map((entry, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                entry.role === 'user' ? 'ml-6 bg-brand-600 text-white' : 'mr-6 bg-gray-100 text-gray-800'
              }`}
            >
              {entry.content}
            </div>
          ))}
          {chatLoading && <p className="text-xs text-gray-400">AI tutor is typing…</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 p-3">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder="Ask the AI tutor…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleSendChat}
            disabled={chatLoading}
            className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Send size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}
