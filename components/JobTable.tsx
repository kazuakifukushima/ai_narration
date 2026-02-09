'use client';

import { Job } from '../types/job';
import { Play, RotateCcw, Clock, CheckCircle, AlertCircle, FileText, Trash2, Edit2, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

export default function JobTable({
  jobs,
  onPlay,
  onRetry,
  onDelete,
  onRename
}: {
  jobs: Job[];
  onPlay: (job: Job) => void;
  onRetry: (job: Job) => void;
  onDelete: (job: Job) => void;
  onRename: (job: Job, newTitle: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <FileText size={48} className="mb-4 opacity-50" />
        <p className="text-sm font-medium">No jobs yet</p>
      </div>
    );
  }

  const startEdit = (job: Job) => {
    setEditingId(job.job_id);
    setEditTitle(job.title || `Result ${job.group_id}`);
  };

  const saveEdit = (job: Job) => {
    if (editTitle.trim()) {
      onRename(job, editTitle);
    }
    setEditingId(null);
  };

  return (
    <div className="divide-y divide-slate-100">
      {jobs.map((job) => (
        <div key={job.job_id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
          <div className="flex items-center gap-4 flex-1">
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center border shrink-0",
              job.status === 'done' && "bg-green-50 border-green-200 text-green-600",
              (job.status === 'analyzing' || job.status === 'narrating') && "bg-amber-50 border-amber-200 text-amber-600 animate-pulse",
              job.status === 'error' && "bg-red-50 border-red-200 text-red-600",
              job.status === 'uploaded' && "bg-slate-50 border-slate-200 text-slate-400"
            )}>
              <span className="font-bold text-sm bg-white/50 w-full h-full flex items-center justify-center rounded-full">
                {job.group_id}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              {editingId === job.job_id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-[200px]"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(job)}
                  />
                  <button onClick={() => saveEdit(job)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {job.title || `Result ${job.group_id}`}
                  </p>
                  <button
                    onClick={() => startEdit(job)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-0.5">
                {job.status === 'done' && <CheckCircle size={14} className="text-green-500" />}
                {(job.status === 'analyzing' || job.status === 'narrating') && <Clock size={14} className="text-amber-500" />}
                {job.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                <span className="text-xs text-slate-500 capitalize">{job.status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {job.status === 'done' && (
              <button
                onClick={() => onPlay(job)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="Play Result"
              >
                <Play size={18} fill="currentColor" />
              </button>
            )}
            {job.status === 'error' && (
              <button
                onClick={() => onRetry(job)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Retry Job"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              onClick={() => onDelete(job)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              title="Delete Job"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
