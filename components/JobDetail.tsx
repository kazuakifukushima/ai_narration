'use client';

import { JobResult } from '../types/job';
import { FileAudio, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function JobDetail({ result }: { result: JobResult }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.summary_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">

      {/* Audio Player Section */}
      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <FileAudio size={20} />
          </div>
          <h3 className="text-sm font-semibold text-indigo-900">Audio Narration</h3>
        </div>
        <audio
          controls
          src={result.audio_url}
          className="w-full h-10 accent-indigo-600"
        />
      </div>

      {/* Script Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Generated Script</h3>
          <button
            onClick={handleCopy}
            className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-700 max-h-[400px] overflow-y-auto font-medium">
          {result.summary_text}
        </div>
      </div>

    </div>
  );
}
