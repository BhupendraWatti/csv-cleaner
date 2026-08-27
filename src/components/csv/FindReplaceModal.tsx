import React from 'react';
import type { FindAndReplaceConfig } from '../../lib/types';

interface FindReplaceModalProps {
  isOpen: boolean;
  findReplace: FindAndReplaceConfig;
  onFindReplaceChange: (config: FindAndReplaceConfig) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function FindReplaceModal({
  isOpen,
  findReplace,
  onFindReplaceChange,
  onClose,
  onApply,
}: FindReplaceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#161d1f]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c1c8c2] space-y-4">
        <div className="flex justify-between items-center border-b border-[#c1c8c2] pb-3">
          <h3 className="text-lg font-bold text-[#012d1d] font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">find_replace</span>
            Find and Replace
          </h3>
          <button onClick={onClose} className="text-[#717973] hover:text-[#012d1d]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#161d1f] block mb-1">Find pattern:</label>
            <input
              type="text"
              placeholder="Text or pattern to search"
              value={findReplace.search}
              onChange={(e) => onFindReplaceChange({ ...findReplace, search: e.target.value })}
              className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2.5 text-xs text-[#161d1f] focus:outline-none focus:border-[#012d1d]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#161d1f] block mb-1">Replace with:</label>
            <input
              type="text"
              placeholder="Replacement text"
              value={findReplace.replace}
              onChange={(e) => onFindReplaceChange({ ...findReplace, replace: e.target.value })}
              className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2.5 text-xs text-[#161d1f] focus:outline-none focus:border-[#012d1d]"
            />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-[#414844] cursor-pointer">
              <input
                type="checkbox"
                checked={findReplace.matchCase}
                onChange={(e) => onFindReplaceChange({ ...findReplace, matchCase: e.target.checked })}
                className="accent-[#012d1d]"
              />
              Match case
            </label>
            <label className="flex items-center gap-2 text-xs text-[#414844] cursor-pointer">
              <input
                type="checkbox"
                checked={findReplace.isRegex}
                onChange={(e) => onFindReplaceChange({ ...findReplace, isRegex: e.target.checked })}
                className="accent-[#012d1d]"
              />
              Regex mode
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#c1c8c2]">
          <button
            onClick={() => {
              onFindReplaceChange({ search: '', replace: '', isRegex: false, matchCase: false });
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-[#57615c]"
          >
            Clear & Close
          </button>
          <button
            onClick={onApply}
            className="bg-[#012d1d] text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-[#1b4332]"
          >
            Apply Transform
          </button>
        </div>
      </div>
    </div>
  );
}
