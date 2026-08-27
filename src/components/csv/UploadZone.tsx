import React, { useRef } from 'react';

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
}

export default function UploadZone({ onFileUpload, onLoadSample, isProcessing }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="bg-white rounded-2xl p-8 border-2 border-dashed border-[#c1c8c2] hover:border-[#012d1d] transition-all shadow-ambient text-center space-y-4 cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileUpload(file);
        }}
      />

      <div className="w-16 h-16 rounded-full bg-[#c1ecd4]/60 text-[#012d1d] mx-auto flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">upload_file</span>
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-extrabold text-[#161d1f] font-display">
          Drag & Drop your CSV file here
        </h3>
        <p className="text-xs text-[#414844]">
          Supports <span className="font-semibold">.csv, .tsv, .txt</span> files up to <span className="font-semibold text-[#012d1d]">25MB</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="bg-[#012d1d] text-white text-xs font-semibold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-[#1b4332] shadow-xs transition-all disabled:opacity-50"
        >
          Browse Local File
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            onLoadSample();
          }}
          className="bg-[#e2e9ec] text-[#012d1d] border border-[#c1c8c2] text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#d8e2dc] transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">science</span>
          Load Demo Sample
        </button>
      </div>

      <div className="pt-4 border-t border-[#c1c8c2]/40 inline-flex items-center gap-2 text-[11px] text-[#57615c]">
        <span className="material-symbols-outlined text-sm text-[#012d1d]">lock</span>
        <span>100% Client-Side Processing • Your file is never uploaded to any cloud server</span>
      </div>
    </div>
  );
}
