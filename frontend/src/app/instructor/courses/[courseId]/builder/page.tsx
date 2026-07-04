'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  FileText,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Lesson {
  id: string;
  title: string;
  order: number;
  contentType: string;
  isPreview: boolean;
}

interface ModuleType {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  status: string;
  modules: ModuleType[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

export default function CourseBuilderPage({ params }: { params: { courseId: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingModule, setAddingModule] = useState(false);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');

  const [lessonFormModuleId, setLessonFormModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    contentType: 'video',
    videoUrl: '',
    transcript: '',
    isPreview: false,
  });
  const [submittingLesson, setSubmittingLesson] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/courses/${params.courseId}/builder`);
      setCourse(res.data.data);
      setExpanded((prev) => {
        const next = { ...prev };
        res.data.data.modules.forEach((m: ModuleType) => {
          if (!(m.id in next)) next[m.id] = true;
        });
        return next;
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load this course.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.courseId]);

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim() || !course) return;
    setAddingModule(true);
    try {
      await api.post('/modules', { courseId: course.id, title: newModuleTitle, order: course.modules.length });
      setNewModuleTitle('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not add module.');
    } finally {
      setAddingModule(false);
    }
  }

  async function handleRenameModule(moduleId: string) {
    if (!editingModuleTitle.trim()) return;
    try {
      await api.patch(`/modules/${moduleId}`, { title: editingModuleTitle });
      setEditingModuleId(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not rename module.');
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm('Delete this module and all its lessons? This cannot be undone.')) return;
    try {
      await api.delete(`/modules/${moduleId}`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not delete module.');
    }
  }

  async function handleAddLesson(e: React.FormEvent, moduleId: string) {
    e.preventDefault();
    const mod = course?.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    setSubmittingLesson(true);
    try {
      await api.post('/lessons', {
        moduleId,
        title: lessonForm.title,
        order: mod.lessons.length,
        contentType: lessonForm.contentType,
        videoUrl: lessonForm.videoUrl || undefined,
        transcript: lessonForm.transcript || undefined,
        isPreview: lessonForm.isPreview,
      });
      setLessonForm({ title: '', contentType: 'video', videoUrl: '', transcript: '', isPreview: false });
      setLessonFormModuleId(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not add lesson.');
    } finally {
      setSubmittingLesson(false);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm('Delete this lesson? This cannot be undone.')) return;
    try {
      await api.delete(`/lessons/${lessonId}`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not delete lesson.');
    }
  }

  async function handleSubmitForReview() {
    if (!course) return;
    setSubmittingReview(true);
    setMessage('');
    try {
      await api.post(`/courses/${course.id}/submit-for-review`);
      setMessage('Course submitted for admin review!');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not submit for review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDragEnd(result: DropResult) {
    if (!course || !result.destination) return;
    const { source, destination } = result;

    // Reordering modules
    if (source.droppableId === 'modules-list') {
      const reordered = Array.from(course.modules);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setCourse({ ...course, modules: reordered });
      try {
        await api.patch('/modules/reorder', {
          courseId: course.id,
          orderedModuleIds: reordered.map((m) => m.id),
        });
      } catch {
        setError('Could not save the new module order.');
        load();
      }
      return;
    }

    // Reordering lessons within the same module
    if (source.droppableId === destination.droppableId) {
      const moduleId = source.droppableId;
      const mod = course.modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const reorderedLessons = Array.from(mod.lessons);
      const [moved] = reorderedLessons.splice(source.index, 1);
      reorderedLessons.splice(destination.index, 0, moved);

      setCourse({
        ...course,
        modules: course.modules.map((m) => (m.id === moduleId ? { ...m, lessons: reorderedLessons } : m)),
      });

      try {
        await api.patch('/lessons/reorder', {
          moduleId,
          orderedLessonIds: reorderedLessons.map((l) => l.id),
        });
      } catch {
        setError('Could not save the new lesson order.');
        load();
      }
    }
    // Moving lessons across modules isn't supported yet — result.destination in a different
    // module is simply a no-op, since we return above for same-module reorders only.
  }

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-24 text-center text-gray-500">Loading course builder…</div>;

  if (error && !course) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Can&apos;t open this course</h1>
        <p className="mt-3 text-gray-600">{error}</p>
        <Link href="/instructor/courses" className="mt-6 inline-block text-brand-600 hover:underline">
          ← Back to my courses
        </Link>
      </div>
    );
  }

  if (!course) return null;

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const canSubmit = course.status === 'DRAFT' || course.status === 'REJECTED';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/instructor/courses" className="text-sm text-brand-600 hover:underline">
        ← Back to my courses
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[course.status]}`}>
            {course.status.replace('_', ' ')}
          </span>
        </div>

        {canSubmit && (
          <button
            onClick={handleSubmitForReview}
            disabled={submittingReview || course.modules.length === 0 || totalLessons === 0}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            title={course.modules.length === 0 || totalLessons === 0 ? 'Add at least one module and lesson first' : ''}
          >
            <Send size={14} /> {submittingReview ? 'Submitting…' : 'Submit for Review'}
          </button>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-brand-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <p className="mt-1 text-sm text-gray-500">Drag modules and lessons to reorder them.</p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="modules-list" type="MODULE">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="mt-6 space-y-4">
              {course.modules.map((mod, index) => (
                <Draggable key={mod.id} draggableId={mod.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="rounded-xl border border-gray-100 bg-white shadow-sm"
                    >
                      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                        <span {...provided.dragHandleProps} className="cursor-grab text-gray-400">
                          <GripVertical size={16} />
                        </span>
                        <button
                          onClick={() => setExpanded((p) => ({ ...p, [mod.id]: !p[mod.id] }))}
                          className="text-gray-500"
                        >
                          {expanded[mod.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {editingModuleId === mod.id ? (
                          <input
                            autoFocus
                            value={editingModuleTitle}
                            onChange={(e) => setEditingModuleTitle(e.target.value)}
                            onBlur={() => handleRenameModule(mod.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameModule(mod.id)}
                            className="flex-1 rounded border border-brand-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="flex-1 font-semibold text-gray-900">{mod.title}</span>
                        )}

                        <span className="text-xs text-gray-400">{mod.lessons.length} lesson(s)</span>

                        <button
                          onClick={() => {
                            setEditingModuleId(mod.id);
                            setEditingModuleTitle(mod.title);
                          }}
                          className="text-gray-400 hover:text-brand-600"
                          title="Rename module"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete module"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {expanded[mod.id] && (
                        <div className="p-3">
                          <Droppable droppableId={mod.id} type="LESSON">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                                {mod.lessons.map((lesson, lIndex) => (
                                  <Draggable key={lesson.id} draggableId={lesson.id} index={lIndex}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                                      >
                                        <span {...provided.dragHandleProps} className="cursor-grab text-gray-400">
                                          <GripVertical size={14} />
                                        </span>
                                        {lesson.contentType === 'video' ? (
                                          <PlayCircle size={14} className="text-brand-600" />
                                        ) : (
                                          <FileText size={14} className="text-brand-600" />
                                        )}
                                        <span className="flex-1 text-gray-800">{lesson.title}</span>
                                        {lesson.isPreview && (
                                          <span className="rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                                            Preview
                                          </span>
                                        )}
                                        <button
                                          onClick={() => handleDeleteLesson(lesson.id)}
                                          className="text-gray-400 hover:text-red-600"
                                          title="Delete lesson"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>

                          {lessonFormModuleId === mod.id ? (
                            <form onSubmit={(e) => handleAddLesson(e, mod.id)} className="mt-3 space-y-2 rounded-lg border border-gray-100 p-3">
                              <input
                                required
                                autoFocus
                                placeholder="Lesson title"
                                value={lessonForm.title}
                                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <select
                                  value={lessonForm.contentType}
                                  onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value })}
                                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                                >
                                  <option value="video">Video</option>
                                  <option value="pdf">PDF</option>
                                  <option value="slides">Slides</option>
                                  <option value="text">Text</option>
                                </select>
                                <input
                                  placeholder="Video URL (optional)"
                                  value={lessonForm.videoUrl}
                                  onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                                  className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                                />
                              </div>
                              <textarea
                                placeholder="Transcript (optional — powers AI Chat Tutor & AI Summary)"
                                rows={2}
                                value={lessonForm.transcript}
                                onChange={(e) => setLessonForm({ ...lessonForm, transcript: e.target.value })}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                              />
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={lessonForm.isPreview}
                                  onChange={(e) => setLessonForm({ ...lessonForm, isPreview: e.target.checked })}
                                />
                                Free preview (visible without enrollment)
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={submittingLesson}
                                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                                >
                                  {submittingLesson ? 'Adding…' : 'Add Lesson'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLessonFormModuleId(null)}
                                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              onClick={() => setLessonFormModuleId(mod.id)}
                              className="mt-3 flex items-center gap-1 text-sm text-brand-600 hover:underline"
                            >
                              <Plus size={14} /> Add Lesson
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <form onSubmit={handleAddModule} className="mt-6 flex gap-2">
        <input
          placeholder="New module title (e.g. 'Getting Started')"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={addingModule}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus size={14} /> Add Module
        </button>
      </form>
    </div>
  );
}
