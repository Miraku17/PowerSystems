"use client";

import { Button } from '@/components/ui/button';

interface Props {
  search: string;
  onSearch: (next: string) => void;
  dirtyCount: number;
  onDiscard: () => void;
  onOpenSave: () => void;
  isSaving: boolean;
}

export function MatrixToolbar({ search, onSearch, dirtyCount, onDiscard, onOpenSave, isSaving }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search modules…"
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#2B4C7E] focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600">
          {dirtyCount === 0
            ? 'No unsaved changes'
            : `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}`}
        </span>
        <Button variant="outline" disabled={dirtyCount === 0 || isSaving} onClick={onDiscard}>
          Discard
        </Button>
        <Button disabled={dirtyCount === 0 || isSaving} onClick={onOpenSave}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
