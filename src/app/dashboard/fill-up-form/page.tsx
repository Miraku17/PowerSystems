"use client";

import React, { useState } from "react";
import DeutzServiceForm from "@/components/DeutzServiceForm";
import DeutzCommissioningReport from "@/components/DeutzCommissioningReport";
import GrindexServiceForm from "@/components/GrindexServiceForm";
import GrindexCommissioningReport from "@/components/GrindexCommissioningReport";
import WedaServiceForm from "@/components/WedaServiceForm";
import WedaCommissioningReport from "@/components/WedaCommissioningReport";
import CustomSelect from "@/components/CustomSelect";

const FillUpFormPage = () => {
  const [activeForm, setActiveForm] = useState<string>("service");

  const renderContent = () => {
    switch (activeForm) {
      case "service":
        return <DeutzServiceForm />;
      case "commissioning":
        return <DeutzCommissioningReport />;
      case "grindex":
        return <GrindexServiceForm />;
      case "grindex-commissioning":
        return <GrindexCommissioningReport />;
      case "weda-service":
        return <WedaServiceForm />;
      case "weda-commissioning":
        return <WedaCommissioningReport />;
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Coming Soon
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              The{" "}
              <span className="font-semibold text-gray-700">
                {options.find((opt) => opt.value === activeForm)?.label}
              </span>{" "}
              is currently under development and will be available shortly.
            </p>
          </div>
        );
    }
  };

  const options = [
    { value: "service", label: "Deutz Service Form" },
    { value: "commissioning", label: "Deutz Commissioning Report" },
    { value: "grindex", label: "Grindex Service Form" },
    { value: "grindex-commissioning", label: "Grindex Commissioning Report" },
    { value: "weda-service", label: "WEDA Service Report" },
    { value: "weda-commissioning", label: "WEDA Commissioning Report" },
    {
      value: "electric-pump-commissioning",
      label: "Electric Driven Pump Commissioning Report",
    },
    {
      value: "electric-pump-service",
      label: "Electric Driven Pump Service Report",
    },
    {
      value: "electric-pump-teardown",
      label: "Electric Driven Pump Teardown Report",
    },
    {
      value: "engine-pump-commissioning",
      label: "Engine Driven Pump Commissioning Report",
    },
    {
      value: "engine-pump-service",
      label: "Engine Driven Pump Service Report",
    },
    { value: "inspection-report", label: "Inspection Report" },
    { value: "technical-report", label: "Technical Report" },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Fill Up Form</h1>
        <p className="text-gray-600">
          Select a form type below to start filling up a report.
        </p>

        <div className="mt-6 w-full sm:w-auto sm:max-w-sm">
          <label
            htmlFor="form-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Form Type
          </label>
          <CustomSelect
            value={activeForm}
            onChange={(value) => setActiveForm(value)}
            options={options}
            placeholder="Select a form type"
          />
        </div>
      </div>

      <div className="transition-opacity duration-300 ease-in-out">
        {renderContent()}
      </div>
    </div>
  );
};

export default FillUpFormPage;
