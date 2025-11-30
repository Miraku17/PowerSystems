"use client";

import React, { useState } from 'react';
import DeutzServiceForm from '@/components/DeutzServiceForm';
import DeutzCommissioningReport from '@/components/DeutzCommissioningReport';
import CustomSelect from '@/components/CustomSelect';

const FillUpFormPage = () => {
  const [activeForm, setActiveForm] = useState<'service' | 'commissioning'>('service');

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Fill Up Form</h1>
          <p className="text-gray-600">Select a form type below to start filling up a report.</p>
          
          <div className="mt-6 w-full sm:w-auto sm:max-w-sm">
            <label htmlFor="form-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Form Type
            </label>
            <CustomSelect
              value={activeForm}
              onChange={(value) => setActiveForm(value as 'service' | 'commissioning')}
              options={[
                { value: 'service', label: 'Deutz Service Form' },
                { value: 'commissioning', label: 'Deutz Commissioning Report' }
              ]}
              placeholder="Select a form type"
            />
          </div>
      </div>
      
      <div className="transition-opacity duration-300 ease-in-out">
        {activeForm === 'service' ? (
          <DeutzServiceForm />
        ) : (
          <DeutzCommissioningReport />
        )}
      </div>
    </div>
  );
};

export default FillUpFormPage;