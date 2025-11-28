"use client";

import React, { useState } from 'react';
import DeutzServiceForm from '@/components/DeutzServiceForm';
import DeutzCommissioningReport from '@/components/DeutzCommissioningReport';

const FillUpFormPage = () => {
  const [activeForm, setActiveForm] = useState<'service' | 'commissioning'>('service');

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Fill Up Form</h1>
          <p className="text-gray-600">Select a form type below to start filling up a report.</p>
          
          <div className="mt-6">
            <label htmlFor="form-select" className="sr-only">Select Form Type</label>
            <div className="relative inline-block w-full sm:w-auto">
              <select
                id="form-select"
                name="form-select"
                onChange={(e) => setActiveForm(e.target.value as 'service' | 'commissioning')}
                value={activeForm}
                className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-gray-400 cursor-pointer"
              >
                <option value="service">Deutz Service Form</option>
                <option value="commissioning">Deutz Commissioning Report</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
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