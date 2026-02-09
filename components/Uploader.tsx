'use client';

import { useState } from 'react';
import { uploadImage } from '../lib/upload';
import { CloudUpload, Loader2, Mic } from 'lucide-react';
import { clsx } from 'clsx';

const GROUPS = ['A', 'B', 'C', 'D'];

const VOICES = [
  { id: 'ja-JP-Neural2-B', name: '女性 (落ち着いた)', label: '女性 (標準)' },
  { id: 'ja-JP-Neural2-C', name: '男性 (深み)', label: '男性 (深み)' },
  { id: 'ja-JP-Neural2-D', name: '男性 (はっきり)', label: '男性 (堅実)' },
];

export default function Uploader({ workshopId }: { workshopId: string }) {
  const [index, setIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [voiceId, setVoiceId] = useState(VOICES[0].id);

  const groupId = GROUPS[index] || `G${index + 1}`;

  async function handleUpload(file: File) {
    if (!file) return;
    try {
      setIsUploading(true);
      await uploadImage(file, groupId, workshopId, voiceId);
      setIndex(i => i + 1);
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await handleUpload(file);
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Settings Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Group Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Next:</span>
          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
            {groupId}
          </span>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center gap-2">
          <Mic size={16} className="text-slate-400" />
          <select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="text-sm bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer hover:border-indigo-300 transition-colors"
          >
            {VOICES.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={clsx(
          "relative group w-full h-48 rounded-xl border-2 border-dashed transition-all duration-200 ease-in-out flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden",
          dragActive
            ? "border-indigo-500 bg-indigo-50/50"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-2" />
            <p className="text-sm text-indigo-600 font-medium">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="p-3 bg-white rounded-full shadow-sm ring-1 ring-slate-200 group-hover:scale-110 transition-transform">
              <CloudUpload className="w-6 h-6 text-indigo-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                Click to upload
              </p>
              <p className="text-xs text-slate-500 mt-1">
                or drag and drop
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
