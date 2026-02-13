"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from './SignaturePad';
import ConfirmationModal from "./ConfirmationModal";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useDailyTimeSheetFormStore, TimeSheetEntry } from "@/stores/dailyTimeSheetFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import JobOrderAutocomplete from './JobOrderAutocomplete';

interface User {
  id: string;
  fullName: string;
}

export default function DailyTimeSheetForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, resetFormData, addEntry, updateEntry, removeEntry } = useDailyTimeSheetFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();

  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [approvedJOs, setApprovedJOs] = useState<any[]>([]);

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

    const fetchApprovedJOs = async () => {
      try {
        const response = await apiClient.get('/forms/job-order-request/approved');
        if (response.data.success) {
          setApprovedJOs(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch approved job orders", error);
      }
    };

    fetchUsers();
    fetchCustomers();
    fetchApprovedJOs();
  }, []);

  // Auto-calculate total manhours when entries change
  useEffect(() => {
    const totalHours = formData.entries.reduce((sum, entry) => {
      const hours = parseFloat(entry.total_hours) || 0;
      return sum + hours;
    }, 0);
    const total = totalHours.toFixed(2);
    if (formData.total_manhours !== total) {
      setFormData({ total_manhours: total });
    }
  }, [formData.entries]);

  // Auto-calculate performance percentage
  useEffect(() => {
    const srt = parseFloat(formData.total_srt) || 0;
    const actualManhour = parseFloat(formData.actual_manhour) || 0;
    if (actualManhour > 0) {
      const perf = ((srt / actualManhour) * 100).toFixed(2);
      if (formData.performance !== perf) {
        setFormData({ performance: perf });
      }
    }
  }, [formData.total_srt, formData.actual_manhour]);

  // Calculate total hours for an entry when start/stop time changes
  const calculateTotalHours = (entry: TimeSheetEntry) => {
    if (entry.start_time && entry.stop_time) {
      const [startHour, startMin] = entry.start_time.split(':').map(Number);
      const [stopHour, stopMin] = entry.stop_time.split(':').map(Number);

      let totalMinutes = (stopHour * 60 + stopMin) - (startHour * 60 + startMin);
      if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight

      const hours = (totalMinutes / 60).toFixed(2);
      updateEntry(entry.id, { total_hours: hours });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      customer: customer.customer || "",
      address: customer.address || "",
    });
  };

  const handleJobOrderSelect = (jo: any) => {
    setFormData({
      job_number: jo.shop_field_jo_number || "",
      customer: jo.full_customer_name || "",
      address: jo.address || "",
      job_order_request_id: jo.id || "",
    });
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData({ [name]: signature });
  };

  const handleEntryChange = (entryId: string, field: keyof TimeSheetEntry, value: string) => {
    const entry = formData.entries.find(e => e.id === entryId);
    if (entry) {
      updateEntry(entryId, { [field]: value });

      // Recalculate total hours if time changed
      if (field === 'start_time' || field === 'stop_time') {
        const updatedEntry = { ...entry, [field]: value };
        setTimeout(() => calculateTotalHours(updatedEntry), 0);
      }
    }
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    // Prepare entries data for submission
    const entriesData = formData.entries.map(({ id, ...rest }) => rest);

    await submit({
      formType: 'daily-time-sheet' as any,
      formData: {
        ...formData,
        entries: JSON.stringify(entriesData),
      } as unknown as Record<string, unknown>,
      attachments,
      onSuccess: () => {
        setAttachments([]);
        resetFormData();
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_number || formData.job_number.trim() === '') {
      toast.error('Job Number is required');
      return;
    }

    if (!formData.customer || formData.customer.trim() === '') {
      toast.error('Customer is required');
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Incorporated</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">C-3 Road corner Torsillo Street, Dagat-Dagatan, Caloocan City</p>
        <div className="mt-6">
          <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Daily Time Sheet
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Header Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <JobOrderAutocomplete
              label="Job No."
              value={formData.job_number}
              onChange={(value) => setFormData({ job_number: value })}
              onSelect={handleJobOrderSelect}
              jobOrders={approvedJOs}
              required
            />
            <Input label="Date" name="date" type="date" value={formData.date} onChange={handleChange} />
            <div className="md:col-span-2">
              <CustomerAutocomplete
                label="Customer"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                onSelect={handleCustomerSelect}
                customers={customers}
                searchKey="customer"
                required
              />
            </div>
            <div className="md:col-span-2">
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
          </div>
        </div>

        {/* Section: Time Entries Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-1 h-6 bg-blue-600 mr-2"></div>
              <h3 className="text-lg font-bold text-gray-800 uppercase">Manhours & Job Descriptions</h3>
            </div>
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              Add Row
            </button>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-2 w-[120px]">Date</th>
                  <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-2 w-[100px]">Start</th>
                  <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-2 w-[100px]">Stop</th>
                  <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-2 w-[80px]">Total</th>
                  <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-2">Job Descriptions<br/><span className="font-normal text-gray-500">(Pls. indicate specific component & Eng. Model)</span></th>
                  <th className="w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {formData.entries.map((entry, index) => (
                  <tr key={entry.id} className="border-b border-gray-200">
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={entry.entry_date}
                        onChange={(e) => handleEntryChange(entry.id, 'entry_date', e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="time"
                        value={entry.start_time}
                        onChange={(e) => handleEntryChange(entry.id, 'start_time', e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="time"
                        value={entry.stop_time}
                        onChange={(e) => handleEntryChange(entry.id, 'stop_time', e.target.value)}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.total_hours}
                        onChange={(e) => handleEntryChange(entry.id, 'total_hours', e.target.value)}
                        className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-2"
                        readOnly
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={entry.job_description}
                        onChange={(e) => handleEntryChange(entry.id, 'job_description', e.target.value)}
                        placeholder="Enter job description"
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
                      />
                    </td>
                    <td className="py-2 px-2">
                      {formData.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400">
                  <td colSpan={3} className="py-3 px-2 text-right font-bold text-gray-700 uppercase">Total Manhours</td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_manhours}
                      className="w-full bg-blue-50 border border-blue-300 text-gray-900 text-sm rounded-md p-2 font-bold"
                      readOnly
                    />
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Input
              label="Grand Total Manhours (REG. + O.T.)"
              name="grand_total_manhours"
              type="number"
              step="0.01"
              value={formData.grand_total_manhours}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section: Performed By */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Performed By</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="space-y-4">
              <Select label="Print Name" name="performed_by_name" value={formData.performed_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Signature"
                value={formData.performed_by_signature}
                onChange={(signature: string) => handleSignatureChange('performed_by_signature', signature)}
                subtitle="Performed By"
              />
            </div>
            <div className="space-y-4">
              <Select label="Supervisor" name="approved_by_name" value={formData.approved_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Signature"
                value={formData.approved_by_signature}
                onChange={(signature: string) => handleSignatureChange('approved_by_signature', signature)}
                subtitle="Approved By (Supervisor)"
              />
            </div>
          </div>
        </div>

        {/* Section: For Service Office Only */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-red-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">For Service Office Only</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-red-50 p-6 rounded-lg border border-red-200">
            <Input label="Total SRT" name="total_srt" type="number" step="0.01" value={formData.total_srt} onChange={handleChange} />
            <Input label="Actual Manhour" name="actual_manhour" type="number" step="0.01" value={formData.actual_manhour} onChange={handleChange} />
            <Input label="Performance (%)" name="performance" type="number" step="0.01" value={formData.performance} onChange={handleChange} disabled />
            <div></div>
            <Select label="CHK. BY" name="checked_by" value={formData.checked_by} onChange={handleChange} options={users.map(user => user.fullName)} />
            <Select label="SVC. CO'RDNTR" name="service_coordinator" value={formData.service_coordinator} onChange={handleChange} options={users.map(user => user.fullName)} />
            <Select label="APVD. BY" name="approved_by_service" value={formData.approved_by_service} onChange={handleChange} options={users.map(user => user.fullName)} />
            <Select label="SVC. MANAGER" name="service_manager" value={formData.service_manager} onChange={handleChange} options={users.map(user => user.fullName)} />
            <div className="lg:col-span-4">
              <TextArea label="Note" name="service_office_note" value={formData.service_office_note} onChange={handleChange} rows={2} />
            </div>
            <div className="lg:col-span-4 text-xs text-gray-600 italic">
              <p>ACTUAL MANHOUR = REGULAR + OVERTIME</p>
              <p>PERFORMANCE = SRT / ACTUAL MANHOUR</p>
            </div>
          </div>
        </div>

        {/* Section: Attachments */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Attachments</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
              Supporting Documents / Photos
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
                              placeholder="Enter document title/description"
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
                  <label htmlFor="file-upload-time-sheet" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input
                      id="file-upload-time-sheet"
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
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
          <button type="button" onClick={resetFormData} className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base">
            Clear Form
          </button>
          <button type="submit" className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base" disabled={isSubmitting}>
            <span className="mr-2">Submit Daily Time Sheet</span>
            {isSubmitting ? (
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
        message="Are you sure you want to submit this Daily Time Sheet?"
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
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  step?: string;
}

const Input = ({ label, name, value, onChange, type = "text", required = false, disabled = false, placeholder, step }: InputProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      step={step}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      placeholder={placeholder || `Enter ${label.toLowerCase()}`}
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
  required?: boolean;
}

const CustomerAutocomplete = ({ label, name, value, onChange, onSelect, customers, searchKey = "customer", required = false }: CustomerAutocompleteProps) => {
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
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
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
