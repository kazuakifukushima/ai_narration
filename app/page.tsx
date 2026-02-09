'use client';

import { useEffect, useState } from 'react';
import { Job, JobResult } from '../types/job';
import { connectWorkshopWS } from '../lib/ws';
import { fetchJobResult, retryJob, deleteJob, updateJobTitle } from '../lib/api';
import JobTable from '../components/JobTable';
import JobDetail from '../components/JobDetail';
import Uploader from '../components/Uploader';
import { Activity, CheckCircle, Clock, Zap } from 'lucide-react';

const WORKSHOP_ID = 'ws_2026_demo';

export default function Page() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [result, setResult] = useState<JobResult | null>(null);

  useEffect(() => {
    const cleanup = connectWorkshopWS(
      WORKSHOP_ID,
      (snapshot) => setJobs(snapshot.filter(j => j.status !== 'deleted')),
      (update) => {
        if (update.status === 'deleted') {
          setJobs((prev) => prev.filter((j) => j.job_id !== update.job_id));
          if (result?.job_id === update.job_id) setResult(null); // Close detail if deleted
        } else {
          setJobs((prev) => {
            const exists = prev.find(j => j.job_id === update.job_id);
            if (exists) return prev.map((j) => (j.job_id === update.job_id ? update : j));
            return [update, ...prev]; // Add new if not exists
          });
        }
      }
    );
    return cleanup;
  }, [result]);

  async function handlePlay(job: Job) {
    const res = await fetchJobResult(job.job_id);
    setResult(res);
  }

  async function handleRetry(job: Job) {
    await retryJob(job.job_id);
    alert('再試行を開始しました');
  }

  async function handleDelete(job: Job) {
    if (!confirm('本当に削除しますか?')) return;
    try {
      await deleteJob(job.job_id);
      // WS will convert this to UI update
    } catch (e) {
      alert('削除に失敗しました');
    }
  }

  async function handleRename(job: Job, newTitle: string) {
    try {
      await updateJobTitle(job.job_id, newTitle);
      // WS will handle update
    } catch (e) {
      alert('変更に失敗しました');
    }
  }

  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'done').length,
    processing: jobs.filter(j => ['uploaded', 'analyzing', 'narrating'].includes(j.status)).length,
  };

  return (
    <main className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Zap size={20} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              AI Narration Workshop
            </h1>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
            <span className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              {WORKSHOP_ID}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Jobs</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Processing</p>
              <p className="text-2xl font-bold text-slate-900">{stats.processing}</p>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Uploader */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">New Upload</h2>
              <Uploader workshopId={WORKSHOP_ID} />
            </section>

            {/* Result View (Desktop Sidebar style if needed, or keeping it inline for now) */}
            {result && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Latest Result</h2>
                  <button onClick={() => setResult(null)} className="text-slate-400 hover:text-slate-600">
                    <span className="sr-only">Close</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <JobDetail result={result} />
              </section>
            )}
          </div>

          {/* Right Column: Job List */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[500px]">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Recent Jobs</h2>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <JobTable
                  jobs={jobs}
                  onPlay={handlePlay}
                  onRetry={handleRetry}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              </div>
            </section>
          </div>
        </div>

      </div>
    </main>
  );
}
