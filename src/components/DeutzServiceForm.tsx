"use client";

import React, { useState } from 'react';

export default function DeutzServiceForm() {
  const [formData, setFormData] = useState({
    reporting_person_name: '',
    telephone_fax: '',
    report_date: '',
    customer_name: '',
    contact_person: '',
    address: '',
    email_address: '',
    equipment_manufacturer: '',
    equipment_model: '',
    equipment_serial_no: '',
    engine_model: '',
    engine_serial_no: '',
    alternator_brand_model: '',
    alternator_serial_no: '',
    location: '',
    date_in_service: '',
    rating: '',
    revolution: '',
    starting_voltage: '',
    running_hours: '',
    fuel_pump_serial_no: '',
    fuel_pump_code: '',
    lube_oil_type: '',
    fuel_type: '',
    cooling_water_additives: '',
    date_failed: '',
    turbo_model: '',
    turbo_serial_no: '',
    customer_complaint: '',
    possible_cause: '',
    observation: '',
    findings: '',
    action_taken: '',
    recommendations: '',
    summary_details: '',
    within_coverage_period: 'No',
    warrantable_failure: 'No',
    service_technician: '',
    approved_by: '',
    acknowledged_by: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Form submitted (console log only for now)');
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Incorporated</h1>
        <p className="text-sm text-gray-600 mt-2">2nd Floor TOPY&apos;s Place #3 Calle Industria cor. Economia Street, Bagumbayan, Libis, Quezon City</p>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Tel:</span> (+63-2) 687-9275 to 78 <span className="mx-2">|</span> <span className="font-bold text-gray-700">Fax:</span> (+63-2) 687-9279
        </p>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Email:</span> sales@psi-deutz.com
        </p>
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-[10px] md:text-xs font-bold text-gray-500 tracking-widest uppercase">
            NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA • ILO-ILO • SURIGAO
          </p>
        </div>
        <div className="mt-6">
             <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Deutz Service Form
            </h2>
        </div>
       
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: General Information */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">General Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} />
                <Input label="Date" name="report_date" type="date" value={formData.report_date} onChange={handleChange} />
                <Input label="Date Failed" name="date_failed" type="date" value={formData.date_failed} onChange={handleChange} />
                
                <div className="lg:col-span-2">
                   <Input label="Customer Name" name="customer_name" value={formData.customer_name} onChange={handleChange} />
                </div>
                <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
                <Input label="Telephone / Fax" name="telephone_fax" value={formData.telephone_fax} onChange={handleChange} />
                
                <div className="lg:col-span-3">
                    <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
                </div>
                <Input label="Email Address" name="email_address" type="email" value={formData.email_address} onChange={handleChange} />
            </div>
        </div>

        {/* Section 2: Equipment & Engine Details */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Equipment & Engine Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
                <Input label="Equipment Model" name="equipment_model" value={formData.equipment_model} onChange={handleChange} />
                <Input label="Equipment Serial No." name="equipment_serial_no" value={formData.equipment_serial_no} onChange={handleChange} />
                
                <Input label="Engine Model" name="engine_model" value={formData.engine_model} onChange={handleChange} />
                <Input label="Engine Serial No." name="engine_serial_no" value={formData.engine_serial_no} onChange={handleChange} />
                <Input label="Turbo Model" name="turbo_model" value={formData.turbo_model} onChange={handleChange} />
                
                <Input label="Turbo Serial No." name="turbo_serial_no" value={formData.turbo_serial_no} onChange={handleChange} />
                <Input label="Alternator Brand/Model" name="alternator_brand_model" value={formData.alternator_brand_model} onChange={handleChange} />
                <Input label="Alternator Serial No." name="alternator_serial_no" value={formData.alternator_serial_no} onChange={handleChange} />
                
                <Input label="Fuel Pump Code" name="fuel_pump_code" value={formData.fuel_pump_code} onChange={handleChange} />
                <Input label="Fuel Pump Serial No." name="fuel_pump_serial_no" value={formData.fuel_pump_serial_no} onChange={handleChange} />
            </div>
        </div>

        {/* Section 3: Operational Data */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Operational Data</h3>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
                <Input label="Date in Service" name="date_in_service" type="date" value={formData.date_in_service} onChange={handleChange} />
                <Input label="Rating" name="rating" value={formData.rating} onChange={handleChange} />
                <Input label="Revolution (RPM)" name="revolution" value={formData.revolution} onChange={handleChange} />
                
                <Input label="Starting Voltage" name="starting_voltage" value={formData.starting_voltage} onChange={handleChange} />
                <Input label="Running Hours" name="running_hours" type="number" value={formData.running_hours} onChange={handleChange} />
                <Input label="Lube Oil Type" name="lube_oil_type" value={formData.lube_oil_type} onChange={handleChange} />
                <Input label="Fuel Type" name="fuel_type" value={formData.fuel_type} onChange={handleChange} />
                
                <div className="lg:col-span-2">
                    <Input label="Cooling Water Additives" name="cooling_water_additives" value={formData.cooling_water_additives} onChange={handleChange} />
                </div>
                <Select label="Within Coverage Period?" name="within_coverage_period" value={formData.within_coverage_period} onChange={handleChange} options={['Yes', 'No']} />
                <Select label="Warrantable Failure?" name="warrantable_failure" value={formData.warrantable_failure} onChange={handleChange} options={['Yes', 'No']} />
            </div>
        </div>

        {/* Section 4: Failure Analysis & Findings */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Service Report Details</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
                <TextArea label="Customer Complaint" name="customer_complaint" value={formData.customer_complaint} onChange={handleChange} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TextArea label="Possible Cause" name="possible_cause" value={formData.possible_cause} onChange={handleChange} />
                    <TextArea label="Observation" name="observation" value={formData.observation} onChange={handleChange} />
                </div>
                <TextArea label="Findings" name="findings" value={formData.findings} onChange={handleChange} />
                <TextArea label="Action Taken" name="action_taken" value={formData.action_taken} onChange={handleChange} />
                <TextArea label="Recommendations" name="recommendations" value={formData.recommendations} onChange={handleChange} />
                <TextArea label="Summary Details" name="summary_details" value={formData.summary_details} onChange={handleChange} />
                
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Attachments</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                            <span className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                            </span>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Section 5: Signatures */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Signatures</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gray-50 p-8 rounded-lg border border-gray-100">
                <div className="flex flex-col justify-end">
                    <Input label="Service Technician" name="service_technician" value={formData.service_technician} onChange={handleChange} />
                    <p className="text-xs text-center text-gray-400 mt-1 italic">Signed by Technician</p>
                </div>
                <div className="flex flex-col justify-end">
                    <Input label="Approved By" name="approved_by" value={formData.approved_by} onChange={handleChange} />
                    <p className="text-xs text-center text-gray-400 mt-1 italic">Authorized Signature</p>
                </div>
                <div className="flex flex-col justify-end">
                    <Input label="Acknowledged By" name="acknowledged_by" value={formData.acknowledged_by} onChange={handleChange} />
                    <p className="text-xs text-center text-gray-400 mt-1 italic">Customer Signature</p>
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-6 pb-12">
            <button type="button" className="mr-4 bg-white text-gray-700 font-bold py-3 px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150">
                Cancel
            </button>
            <button type="submit" className="bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-3 px-10 rounded-lg shadow-md transition duration-150 flex items-center">
                <span className="mr-2">Submit Service Report</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
      </form>
    </div>
  );
}

// Helper Components
interface InputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
}

const Input = ({ label, name, value, onChange, type = "text" }: InputProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
      placeholder={`Enter ${label.toLowerCase()}`}
    />
  </div>
);

interface TextAreaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const TextArea = ({ label, name, value, onChange }: TextAreaProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={4}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
      placeholder={`Enter ${label.toLowerCase()}`}
    />
  </div>
);

interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  options: string[];
}

const Select = ({ label, name, value, onChange, options }: SelectProps) => (
    <div className="flex flex-col w-full">
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 appearance-none shadow-sm"
        >
            {options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>
  );
