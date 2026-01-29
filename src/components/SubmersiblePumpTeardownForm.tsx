"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from './SignaturePad';
import ConfirmationModal from "./ConfirmationModal";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useSubmersiblePumpTeardownFormStore } from "@/stores/submersiblePumpTeardownFormStore";

interface User {
  id: string;
  fullName: string;
}

export default function SubmersiblePumpTeardownForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, resetFormData } = useSubmersiblePumpTeardownFormStore();
  const [isLoading, setIsLoading] = useState(false);
  const [preTeardownAttachments, setPreTeardownAttachments] = useState<{ file: File; title: string }[]>([]);
  const [wetEndAttachments, setWetEndAttachments] = useState<{ file: File; title: string }[]>([]);
  const [motorAttachments, setMotorAttachments] = useState<{ file: File; title: string }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users');
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    const fetchCustomers = async () => {
      try {
        const response = await apiClient.get('/customers');
        if (response.data.success) {
          setCustomers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch customers", error);
      }
    };

    fetchUsers();
    fetchCustomers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleBooleanChange = (name: string, value: boolean | null) => {
    setFormData({ [name]: value });
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      reporting_person_name: customer.name || "",
      customer: customer.customer || "",
      contact_person: customer.contactPerson || "",
      address: customer.address || "",
      email_or_contact: customer.email || customer.phone || "",
    });
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData({ [name]: signature });
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);
    setIsLoading(true);
    const loadingToastId = toast.loading('Submitting teardown report...');

    try {
      const formDataToSubmit = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSubmit.append(key, value.toString());
        }
      });

      // Append pre-teardown attachments
      preTeardownAttachments.forEach((attachment) => {
        formDataToSubmit.append('pre_teardown_files', attachment.file);
        formDataToSubmit.append('pre_teardown_titles', attachment.title);
      });

      // Append wet end attachments
      wetEndAttachments.forEach((attachment) => {
        formDataToSubmit.append('wet_end_files', attachment.file);
        formDataToSubmit.append('wet_end_titles', attachment.title);
      });

      // Append motor attachments
      motorAttachments.forEach((attachment) => {
        formDataToSubmit.append('motor_files', attachment.file);
        formDataToSubmit.append('motor_titles', attachment.title);
      });

      const response = await apiClient.post('/forms/submersible-pump-teardown', formDataToSubmit, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Teardown Report submitted successfully!', { id: loadingToastId });
      setPreTeardownAttachments([]);
      setWetEndAttachments([]);
      setMotorAttachments([]);
      resetFormData();
    } catch (error: any) {
      console.error('Submission error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'A network error occurred. Please try again.';
      toast.error(`Failed to submit report: ${errorMessage}`, { id: loadingToastId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_order || formData.job_order.trim() === '') {
      toast.error('Job Order is required');
      return;
    }

    setIsModalOpen(true);
  };

  const renderAttachmentSection = (
    label: string,
    attachments: { file: File; title: string }[],
    setAttachments: React.Dispatch<React.SetStateAction<{ file: File; title: string }[]>>,
    inputId: string
  ) => (
    <div className="mb-6">
      <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
        {label}
      </label>

      {attachments.length > 0 && (
        <div className="space-y-3 mb-4">
          {attachments.map((attachment, index) => {
            const previewUrl = URL.createObjectURL(attachment.file);
            return (
              <div key={index} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={previewUrl}
                      alt={attachment.file.name}
                      className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                      onLoad={() => URL.revokeObjectURL(previewUrl)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{attachment.file.name}</p>
                        <p className="text-xs text-gray-500">{(attachment.file.size / 1024).toFixed(2)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                        className="ml-4 text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Enter image title"
                        value={attachment.title}
                        onChange={(e) => {
                          const newAttachments = [...attachments];
                          newAttachments[index].title = e.target.value;
                          setAttachments(newAttachments);
                        }}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label htmlFor={inputId} className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
              <span>Upload an image</span>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (!file.type.startsWith('image/')) {
                      toast.error('Please select only image files');
                      return;
                    }
                    setAttachments([...attachments, { file, title: '' }]);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Incorporated</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">2nd Floor TOPY&apos;s Place #3 Calle Industria cor. Economia Street, Bagumbayan, Libis, Quezon City</p>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Tel:</span> (+63-2) 687-9275 to 78 <span className="mx-2">|</span> <span className="font-bold text-gray-700">Fax:</span> (+63-2) 687-9279
        </p>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Email:</span> sales@psi-deutz.com
        </p>
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-[10px] md:text-xs font-bold text-gray-500 tracking-widest uppercase">
            NAVOTAS * BACOLOD * CEBU * CAGAYAN * DAVAO * GEN SAN * ZAMBOANGA * ILO-ILO * SURIGAO
          </p>
        </div>
        <div className="mt-6">
          <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Teardown Report
          </h2>
          <p className="text-sm text-gray-600 mt-2">(Submersible Pump)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Job Reference */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Job Reference</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="Job Order" name="job_order" value={formData.job_order} onChange={handleChange} />
            <Input label="J.O Date" name="jo_date" type="date" value={formData.jo_date} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Basic Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <CustomerAutocomplete
              label="Name of Reporting Person"
              name="reporting_person_name"
              value={formData.reporting_person_name}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="name"
            />
            <Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} />
            <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
            <div></div>
            <CustomerAutocomplete
              label="Customer"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="customer"
            />
            <CustomerAutocomplete
              label="Contact Person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="contactPerson"
            />
            <div className="lg:col-span-2">
              <CustomerAutocomplete
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onSelect={handleCustomerSelect}
                customers={customers}
                searchKey="address"
              />
            </div>
            <div className="lg:col-span-2">
              <Input label="Email or Contact Number" name="email_or_contact" value={formData.email_or_contact} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Section: Pump Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Pump Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
            <Input label="Serial Number" name="serial_number" value={formData.serial_number} onChange={handleChange} />
            <Input label="Part Number" name="part_number" value={formData.part_number} onChange={handleChange} />
            <div></div>
            <Input label="KW Rating P1" name="kw_rating_p1" value={formData.kw_rating_p1} onChange={handleChange} />
            <Input label="KW Rating P2" name="kw_rating_p2" value={formData.kw_rating_p2} onChange={handleChange} />
            <Input label="Voltage" name="voltage" value={formData.voltage} onChange={handleChange} />
            <Input label="Phase" name="phase" value={formData.phase} onChange={handleChange} />
            <Input label="Frequency" name="frequency" value={formData.frequency} onChange={handleChange} />
            <Input label="RPM" name="rpm" value={formData.rpm} onChange={handleChange} />
            <Input label="HMAX (Head)" name="hmax_head" value={formData.hmax_head} onChange={handleChange} />
            <Input label="QMAX (Flow)" name="qmax_flow" value={formData.qmax_flow} onChange={handleChange} />
            <Input label="TMAX" name="tmax" value={formData.tmax} onChange={handleChange} />
            <Input label="Running Hrs (or No. of Month/Days)" name="running_hrs" value={formData.running_hrs} onChange={handleChange} />
            <Input label="Date of Failure" name="date_of_failure" type="date" value={formData.date_of_failure} onChange={handleChange} />
            <Input label="Teardown Date" name="teardown_date" type="date" value={formData.teardown_date} onChange={handleChange} />
            <div className="lg:col-span-4">
              <TextArea label="Reason for Teardown" name="reason_for_teardown" value={formData.reason_for_teardown} onChange={handleChange} rows={2} />
            </div>
          </div>
        </div>

        {/* Section: Warranty Coverage */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Warranty Coverage</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <BooleanSelect
              label="Is the unit within the coverage?"
              name="is_within_warranty"
              value={formData.is_within_warranty}
              onChange={(value) => handleBooleanChange('is_within_warranty', value)}
            />
            <BooleanSelect
              label="If yes, is this a warrantable failure?"
              name="is_warrantable_failure"
              value={formData.is_warrantable_failure}
              onChange={(value) => handleBooleanChange('is_warrantable_failure', value)}
            />
          </div>
        </div>

        {/* Section: External Condition Before Teardown */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">External Condition Before Teardown</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Description</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow num={1} label="Discharge" name="ext_discharge_findings" value={formData.ext_discharge_findings} onChange={handleChange} />
                    <TableRow num={2} label="Power cable" name="ext_power_cable_findings" value={formData.ext_power_cable_findings} onChange={handleChange} />
                    <TableRow num={3} label="Signal cable" name="ext_signal_cable_findings" value={formData.ext_signal_cable_findings} onChange={handleChange} />
                    <TableRow num={4} label="Lifting eye" name="ext_lifting_eye_findings" value={formData.ext_lifting_eye_findings} onChange={handleChange} />
                    <TableRow num={5} label="Terminal Cover" name="ext_terminal_cover_findings" value={formData.ext_terminal_cover_findings} onChange={handleChange} />
                    <TableRow num={6} label="Outer casing" name="ext_outer_casing_findings" value={formData.ext_outer_casing_findings} onChange={handleChange} />
                    <TableRow num={7} label="Oil plug" name="ext_oil_plug_findings" value={formData.ext_oil_plug_findings} onChange={handleChange} />
                    <TableRow num={8} label="Strainer" name="ext_strainer_findings" value={formData.ext_strainer_findings} onChange={handleChange} />
                    <TableRow num={9} label="Motor inspection plug" name="ext_motor_inspection_plug_findings" value={formData.ext_motor_inspection_plug_findings} onChange={handleChange} />
                  </tbody>
                </table>
              </div>
              {/* Reference Image */}
              <div className="flex flex-col items-center justify-start">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <img
                    src="/images/sumbersible_pump_teardown/external_condition_before_teardown.png"
                    alt="External Condition Reference"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Pre-Teardown Photos */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Pre-Teardown Photos</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            {renderAttachmentSection("Pre-Teardown Photos", preTeardownAttachments, setPreTeardownAttachments, "pre-teardown-upload")}
          </div>
        </div>

        {/* Section: Components Condition During Teardown */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Components Condition During Teardown</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Description</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow num={1} label="Discharge Unit" name="comp_discharge_unit_findings" value={formData.comp_discharge_unit_findings} onChange={handleChange} />
                    <TableRow num={2} label="Cable unit" name="comp_cable_unit_findings" value={formData.comp_cable_unit_findings} onChange={handleChange} />
                    <TableRow num={3} label="Top housing unit" name="comp_top_housing_unit_findings" value={formData.comp_top_housing_unit_findings} onChange={handleChange} />
                    <TableRow num={4} label="Starter unit" name="comp_starter_unit_findings" value={formData.comp_starter_unit_findings} onChange={handleChange} />
                    <TableRow num={5} label="Motor unit" name="comp_motor_unit_findings" value={formData.comp_motor_unit_findings} onChange={handleChange} />
                    <TableRow num={6} label="Shaft rotor unit" name="comp_shaft_rotor_unit_findings" value={formData.comp_shaft_rotor_unit_findings} onChange={handleChange} />
                    <TableRow num={7} label="Seal unit" name="comp_seal_unit_findings" value={formData.comp_seal_unit_findings} onChange={handleChange} />
                    <TableRow num={8} label="Wet end unit" name="comp_wet_end_unit_findings" value={formData.comp_wet_end_unit_findings} onChange={handleChange} />
                  </tbody>
                </table>
              </div>
              {/* Reference Image */}
              <div className="flex flex-col items-center justify-start">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <img
                    src="/images/sumbersible_pump_teardown/components_during_teardown.png"
                    alt="Components During Teardown Reference"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <TextArea label="Comments" name="teardown_comments" value={formData.teardown_comments} onChange={handleChange} rows={3} />
            </div>
          </div>
        </div>

        {/* Section: Wet End Teardown Photos */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Wet End Teardown Photos</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            {renderAttachmentSection("Wet End Teardown Photos", wetEndAttachments, setWetEndAttachments, "wet-end-upload")}
          </div>
        </div>

        {/* Section: Motor Condition */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Motor Condition</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            {/* Stator Winding Resistance */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Stator Winding Resistance</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <Input label="L1 - L2" name="stator_l1_l2" value={formData.stator_l1_l2} onChange={handleChange} />
                  <Input label="L1 - L3" name="stator_l1_l3" value={formData.stator_l1_l3} onChange={handleChange} />
                  <Input label="L2 - L3" name="stator_l2_l3" value={formData.stator_l2_l3} onChange={handleChange} />
                </div>
                {/* Reference Image */}
                <div className="flex flex-col items-center justify-start">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img
                      src="/images/sumbersible_pump_teardown/stator_winding_assistance.png"
                      alt="Stator Winding Resistance Reference"
                      className="max-w-full h-auto object-contain max-h-48"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Insulation Resistance */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Insulation Resistance</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <Input label="U1 - Ground" name="insulation_u1_ground" value={formData.insulation_u1_ground} onChange={handleChange} />
                  <Input label="U2 - Ground" name="insulation_u2_ground" value={formData.insulation_u2_ground} onChange={handleChange} />
                  <Input label="V1 - Ground" name="insulation_v1_ground" value={formData.insulation_v1_ground} onChange={handleChange} />
                  <Input label="V2 - Ground" name="insulation_v2_ground" value={formData.insulation_v2_ground} onChange={handleChange} />
                  <Input label="W1 - Ground" name="insulation_w1_ground" value={formData.insulation_w1_ground} onChange={handleChange} />
                  <Input label="W2 - Ground" name="insulation_w2_ground" value={formData.insulation_w2_ground} onChange={handleChange} />
                </div>
                {/* Reference Image */}
                <div className="flex flex-col items-center justify-start">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img
                      src="/images/sumbersible_pump_teardown/insulation_resistance.png"
                      alt="Insulation Resistance Reference"
                      className="max-w-full h-auto object-contain max-h-48"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <TextArea label="Comments" name="motor_comments" value={formData.motor_comments} onChange={handleChange} rows={3} />
            </div>
          </div>
        </div>

        {/* Section: Motor Teardown Photos */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Motor Teardown Photos</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            {renderAttachmentSection("Motor Teardown Photos", motorAttachments, setMotorAttachments, "motor-upload")}
          </div>
        </div>

        {/* Section: Signatures */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Signatures</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50 p-4 md:p-8 rounded-lg border border-gray-100">
            <div className="flex flex-col space-y-4">
              <Select label="Tear downed By" name="teardowned_by_name" value={formData.teardowned_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.teardowned_by_signature}
                onChange={(signature: string) => handleSignatureChange('teardowned_by_signature', signature)}
                subtitle="Svc Engineer/Technician"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select label="Checked & Approved By" name="checked_approved_by_name" value={formData.checked_approved_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.checked_approved_by_signature}
                onChange={(signature: string) => handleSignatureChange('checked_approved_by_signature', signature)}
                subtitle="Svc. Supvr. / Supt."
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select label="Noted By" name="noted_by_name" value={formData.noted_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.noted_by_signature}
                onChange={(signature: string) => handleSignatureChange('noted_by_signature', signature)}
                subtitle="Svc. Manager"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select label="Acknowledged By" name="acknowledged_by_name" value={formData.acknowledged_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.acknowledged_by_signature}
                onChange={(signature: string) => handleSignatureChange('acknowledged_by_signature', signature)}
                subtitle="Customer Representative"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
          <button type="button" onClick={resetFormData} className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base">
            Clear Form
          </button>
          <button type="submit" className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base" disabled={isLoading}>
            <span className="mr-2">Submit Teardown Report</span>
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </form>
      <ConfirmationModal
        isOpen={isModalOpen}
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Submission"
        message="Are you sure you want to submit this Submersible Pump Teardown Report?"
      />
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
  rows?: number;
}

const TextArea = ({ label, name, value, onChange, rows = 3 }: TextAreaProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm resize-none"
      placeholder={`Enter ${label.toLowerCase()}`}
    />
  </div>
);

interface BooleanSelectProps {
  label: string;
  name: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}

const BooleanSelect = ({ label, name, value, onChange }: BooleanSelectProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={value === true}
          onChange={() => onChange(true)}
          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Yes</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={value === false}
          onChange={() => onChange(false)}
          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">No</span>
      </label>
    </div>
  </div>
);

interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  options: string[];
}

const Select = ({ label, name, value, onChange, options }: SelectProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (option: string) => {
    const syntheticEvent = { target: { name, value: option } } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors pr-10"
          placeholder="Select or type a name"
        />
        <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
          <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full px-4 py-2 text-left transition-colors ${opt === value ? "bg-[#2B4C7E] text-white font-medium" : "text-gray-900 hover:bg-[#2B4C7E] hover:text-white"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CustomerAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSelect: (customer: any) => void;
  customers: any[];
  searchKey?: string;
}

const CustomerAutocomplete = ({ label, name, value, onChange, onSelect, customers, searchKey = "customer" }: CustomerAutocompleteProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: any) => {
    onSelect(customer);
    setShowDropdown(false);
  };

  const filteredCustomers = customers.filter((c) =>
    (c[searchKey] || "").toLowerCase().includes((value || "").toLowerCase())
  );

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => { onChange(e); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
        />
        {showDropdown && filteredCustomers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-xs text-gray-500">{customer.customer}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface TableRowProps {
  num: number;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const TableRow = ({ num, label, name, value, onChange }: TableRowProps) => (
  <tr className="border-b border-gray-200 last:border-b-0">
    <td className="py-2 px-3 text-gray-600">{num}</td>
    <td className="py-2 px-3 text-gray-800">{label}</td>
    <td className="py-2 px-3">
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors duration-200 ease-in-out shadow-sm"
        placeholder="Enter findings"
      />
    </td>
  </tr>
);
