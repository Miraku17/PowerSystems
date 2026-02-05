"use client";

import React from "react";
import DailyTimeSheetForm from "@/components/DailyTimeSheetForm";

const DailyTimeSheetPage = () => {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Daily Time Sheet</h1>
        <p className="text-gray-600">
          Fill out the daily time sheet to track manhours and job descriptions.
        </p>
      </div>

      <div className="transition-opacity duration-300 ease-in-out">
        <DailyTimeSheetForm />
      </div>
    </div>
  );
};

export default DailyTimeSheetPage;
