"use client";

import React, { useState } from "react";
import DeutzServiceForm from "@/components/DeutzServiceForm";
import DeutzCommissioningReport from "@/components/DeutzCommissioningReport";
import SubmersiblePumpCommissioningForm from "@/components/SubmersiblePumpCommissioningForm";
import ElectricSurfacePumpCommissioningForm from "@/components/ElectricSurfacePumpCommissioningForm";
import CustomSelect from "@/components/CustomSelect";

const FillUpFormPage = () => {
  const [activeForm, setActiveForm] = useState<string>("service");

  const renderContent = () => {
    switch (activeForm) {
      case "service":
        return <DeutzServiceForm />;
      case "commissioning":
        return <DeutzCommissioningReport />;
      case "submersible-pump-commissioning":
        return <SubmersiblePumpCommissioningForm />;
      case "electric-surface-pump-commissioning":
        return <ElectricSurfacePumpCommissioningForm />;
      default:
        return <DeutzServiceForm />;
    }
  };

  const options = [
    { value: "service", label: "Deutz Service Form" },
    { value: "commissioning", label: "Deutz Commissioning Report" },
    { value: "submersible-pump-commissioning", label: "Submersible Pump Commissioning Report" },
    { value: "electric-surface-pump-commissioning", label: "Electric Driven Surface Pump Commissioning Report" },
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
