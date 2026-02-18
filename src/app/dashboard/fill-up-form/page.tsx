"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import CustomSelect from "@/components/CustomSelect";

const loading = () => <div className="py-12 text-center text-gray-400">Loading form...</div>;

const DeutzServiceForm = dynamic(() => import("@/components/DeutzServiceForm"), { loading });
const DeutzCommissioningReport = dynamic(() => import("@/components/DeutzCommissioningReport"), { loading });
const SubmersiblePumpCommissioningForm = dynamic(() => import("@/components/SubmersiblePumpCommissioningForm"), { loading });
const SubmersiblePumpServiceForm = dynamic(() => import("@/components/SubmersiblePumpServiceForm"), { loading });
const SubmersiblePumpTeardownForm = dynamic(() => import("@/components/SubmersiblePumpTeardownForm"), { loading });
const ElectricSurfacePumpCommissioningForm = dynamic(() => import("@/components/ElectricSurfacePumpCommissioningForm"), { loading });
const ElectricSurfacePumpServiceForm = dynamic(() => import("@/components/ElectricSurfacePumpServiceForm"), { loading });
const EngineSurfacePumpServiceForm = dynamic(() => import("@/components/EngineSurfacePumpServiceForm"), { loading });
const EngineSurfacePumpCommissioningForm = dynamic(() => import("@/components/EngineSurfacePumpCommissioningForm"), { loading });
const EngineTeardownForm = dynamic(() => import("@/components/EngineTeardownForm"), { loading });
const ElectricSurfacePumpTeardownForm = dynamic(() => import("@/components/ElectricSurfacePumpTeardownForm"), { loading });
const EngineInspectionReceivingForm = dynamic(() => import("@/components/EngineInspectionReceivingForm"), { loading });
const ComponentsTeardownMeasuringForm = dynamic(() => import("@/components/ComponentsTeardownMeasuringForm"), { loading });
const JobOrderRequestForm = dynamic(() => import("@/components/JobOrderRequestForm"), { loading });

const FillUpFormPage = () => {
  const [activeForm, setActiveForm] = useState<string>("job-order-request");

  const renderContent = () => {
    switch (activeForm) {
      case "service":
        return <DeutzServiceForm />;
      case "commissioning":
        return <DeutzCommissioningReport />;
      case "submersible-pump-commissioning":
        return <SubmersiblePumpCommissioningForm />;
      case "submersible-pump-service":
        return <SubmersiblePumpServiceForm />;
      case "submersible-pump-teardown":
        return <SubmersiblePumpTeardownForm />;
      case "electric-surface-pump-commissioning":
        return <ElectricSurfacePumpCommissioningForm />;
      case "electric-surface-pump-service":
        return <ElectricSurfacePumpServiceForm />;
      case "engine-surface-pump-service":
        return <EngineSurfacePumpServiceForm />;
      case "engine-surface-pump-commissioning":
        return <EngineSurfacePumpCommissioningForm />;
      case "engine-teardown":
        return <EngineTeardownForm />;
      case "electric-surface-pump-teardown":
        return <ElectricSurfacePumpTeardownForm />;
      case "engine-inspection-receiving":
        return <EngineInspectionReceivingForm />;
      case "components-teardown-measuring":
        return <ComponentsTeardownMeasuringForm />;
      case "job-order-request":
        return <JobOrderRequestForm />;
      default:
        return <DeutzServiceForm />;
    }
  };

  const options = [
    { value: "job-order-request", label: "Job Order Request Form" },
    { value: "service", label: "Deutz Service Form" },
    { value: "commissioning", label: "Deutz Commissioning Report" },
    { value: "submersible-pump-commissioning", label: "Submersible Pump Commissioning Report" },
    { value: "submersible-pump-service", label: "Submersible Pump Service Report" },
    { value: "submersible-pump-teardown", label: "Submersible Pump Teardown Report" },
    { value: "electric-surface-pump-commissioning", label: "Electric Driven Surface Pump Commissioning Report" },
    { value: "electric-surface-pump-service", label: "Electric Driven Surface Pump Service Report" },
    { value: "engine-surface-pump-service", label: "Engine Driven Surface Pump Service Report" },
    { value: "engine-surface-pump-commissioning", label: "Engine Driven Surface Pump Commissioning Report" },
    { value: "engine-teardown", label: "Engine Teardown Report" },
    { value: "electric-surface-pump-teardown", label: "Electric Driven Surface Pump Teardown Report" },
    { value: "engine-inspection-receiving", label: "Engine Inspection / Receiving Report" },
    { value: "components-teardown-measuring", label: "Components Teardown Measuring Report" },
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
