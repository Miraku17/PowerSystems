"use client";

import React from "react";
import dynamic from "next/dynamic";

const JobOrderRequestForm = dynamic(
  () => import("@/components/JobOrderRequestForm"),
  { loading: () => <div className="py-12 text-center text-gray-400">Loading form...</div> }
);

const JobOrderRequestPage = () => {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Job Order Request</h1>
        <p className="text-gray-600">
          Fill out the job order request form for service, repairs, and equipment maintenance.
        </p>
      </div>

      <div className="transition-opacity duration-300 ease-in-out">
        <JobOrderRequestForm />
      </div>
    </div>
  );
};

export default JobOrderRequestPage;
