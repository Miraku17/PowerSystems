"use client";

import { ReactNode } from 'react';

interface Props {
  description: string | null;
  children: ReactNode;
}

export function PermissionTooltip({ description, children }: Props) {
  if (!description) return <>{children}</>;
  return (
    <span className="group relative inline-block">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow group-hover:block"
      >
        {description}
      </span>
    </span>
  );
}
