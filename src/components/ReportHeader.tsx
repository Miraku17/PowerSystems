"use client";

import React from "react";
import { useReportHeaderContent } from "@/hooks/useReportHeader";

interface ReportHeaderProps {
  title: string;
  /** Optional secondary line under the boxed title (e.g. "Submersible Pump") */
  subtitle?: string;
  /** Optional className override on the outer wrapper if a caller needs to tighten/loosen spacing */
  className?: string;
}

export default function ReportHeader({ title, subtitle, className = "" }: ReportHeaderProps) {
  const { content } = useReportHeaderContent();
  return (
    <div className={`text-center mb-8 border-b-2 border-gray-800 pb-6 ${className}`.trim()}>
      <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">
        {content.company_name}
      </h1>
      <p className="text-xs md:text-sm text-gray-600 mt-2">
        {content.address}
      </p>
      <p className="text-xs md:text-sm text-gray-600 mt-1">
        <span className="font-bold text-gray-700">Tel:</span> {content.tel}
        <span className="mx-2">|</span>
        <span className="font-bold text-gray-700">Fax:</span> {content.fax}
      </p>
      <p className="text-sm text-gray-600 mt-1">
        <span className="font-bold text-gray-700">Email:</span> {content.email}
      </p>
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-[10px] md:text-xs font-bold text-gray-500 tracking-widest uppercase">
          {content.branches}
        </p>
      </div>
      <div className="mt-6">
        <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            ({subtitle})
          </p>
        ) : null}
      </div>
    </div>
  );
}
