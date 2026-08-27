import React from 'react';
import type { HeaderCaseOption } from '../../lib/types';

interface TransformControlsProps {
  headerCase: HeaderCaseOption;
  applyHeaderCaseToggle: boolean;
  onHeaderCaseChange: (value: HeaderCaseOption) => void;
  onApplyHeaderCaseToggleChange: (checked: boolean) => void;
  missingValueReplacement: string;
  applyImputationToggle: boolean;
  onMissingValueReplacementChange: (value: string) => void;
  onApplyImputationToggleChange: (checked: boolean) => void;
  onOpenFindReplaceModal: () => void;
}

export default function TransformControls({
  headerCase,
  applyHeaderCaseToggle,
  onHeaderCaseChange,
  onApplyHeaderCaseToggleChange,
  missingValueReplacement,
  applyImputationToggle,
  onMissingValueReplacementChange,
  onApplyImputationToggleChange,
  onOpenFindReplaceModal,
}: TransformControlsProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-[#c1c8c2] shadow-ambient space-y-4">
      <div className="flex items-center justify-between border-b border-[#c1c8c2] pb-2">
        <h3 className="text-base font-bold text-[#012d1d] font-display">
          Custom Transformations
        </h3>
        <button
          onClick={onOpenFindReplaceModal}
          className="px-2.5 py-1 rounded-md border border-[#c1c8c2] text-xs font-semibold text-[#012d1d] hover:bg-[#f4fafd] transition-all flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">find_replace</span>
          Find & Replace
        </button>
      </div>

      {/* Header Casing */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-[#161d1f] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#012d1d]">title</span>
            Format Header Casing
          </label>
          <input
            type="checkbox"
            checked={applyHeaderCaseToggle}
            onChange={(e) => onApplyHeaderCaseToggleChange(e.target.checked)}
            className="accent-[#012d1d] cursor-pointer"
          />
        </div>
        <select
          value={headerCase}
          onChange={(e) => onHeaderCaseChange(e.target.value as HeaderCaseOption)}
          disabled={!applyHeaderCaseToggle}
          className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2 text-xs font-semibold text-[#161d1f] focus:outline-none focus:border-[#012d1d] disabled:opacity-50"
        >
          <option value="snake_case">snake_case (e.g. email_address)</option>
          <option value="camelCase">camelCase (e.g. emailAddress)</option>
          <option value="UPPERCASE">UPPERCASE (e.g. EMAIL_ADDRESS)</option>
          <option value="Title Case">Title Case (e.g. Email Address)</option>
          <option value="lowercase">lowercase (e.g. email address)</option>
        </select>
      </div>

      {/* Missing Value Imputation */}
      <div className="space-y-1.5 pt-2 border-t border-[#c1c8c2]/50">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-[#161d1f] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#012d1d]">edit_note</span>
            Impute Empty / Placeholder Cells
          </label>
          <input
            type="checkbox"
            checked={applyImputationToggle}
            onChange={(e) => onApplyImputationToggleChange(e.target.checked)}
            className="accent-[#012d1d] cursor-pointer"
          />
        </div>
        <input
          type="text"
          placeholder="Fill empty cells with (e.g. N/A or 0)"
          value={missingValueReplacement}
          onChange={(e) => onMissingValueReplacementChange(e.target.value)}
          disabled={!applyImputationToggle}
          className="w-full bg-[#f4fafd] border border-[#c1c8c2] rounded-lg p-2 text-xs text-[#161d1f] focus:outline-none focus:border-[#012d1d] disabled:opacity-50"
        />
      </div>
    </div>
  );
}
