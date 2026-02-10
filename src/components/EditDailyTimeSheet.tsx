"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";

interface EditDailyTimeSheetProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface User {
  id: string;
  fullName: string;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  description: string;
  created_at: string;
}

interface TimeSheetEntry {
  id: string;
  entry_date: string;
  start_time: string;
  stop_time: string;
  total_hours: string;
  job_description: string;
}

// Helper Components
const Input = ({ label, name, value, type = "text", className = "", step, disabled, onChange }: { label: string; name: string; value: any; type?: string; className?: string; step?: string; disabled?: boolean; onChange: (name: string, value: any) => void }) => (
  <div className={`flex flex-col w-full ${className}`}>
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  </div>
);

const TextArea = ({ label, name, value, onChange }: { label: string; name: string; value: any; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      rows={3}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm resize-none"
    />
  </div>
);

const Select = ({ label, name, value, options, onChange }: { label: string; name: string; value: any; options: string[]; onChange: (name: string, value: any) => void }) => {
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
    onChange(name, option);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 shadow-sm"
          placeholder="Select or type a name"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 focus:outline-none"
        >
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <div
                key={opt}
                onClick={() => handleSelectOption(opt)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900"
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const JobOrderAutocomplete = ({ label, value, onChange, onSelect, jobOrders, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (jo: any) => void;
  jobOrders: any[];
  required?: boolean;
}) => {
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

  const filteredJOs = jobOrders.filter((jo) => {
    const search = (value || "").toLowerCase();
    return (
      (jo.shop_field_jo_number || "").toLowerCase().includes(search) ||
      (jo.full_customer_name || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
          placeholder="Search by JO number or customer name"
          autoComplete="off"
        />
        {showDropdown && filteredJOs.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredJOs.map((jo) => (
              <div
                key={jo.id}
                onClick={() => { onSelect(jo); setShowDropdown(false); }}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
              >
                <div className="font-semibold">{jo.shop_field_jo_number}</div>
                <div className="text-xs text-gray-500">{jo.full_customer_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const generateEntryId = () => `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export default function EditDailyTimeSheet({ data, recordId, onClose, onSaved }: EditDailyTimeSheetProps) {
  const [formData, setFormData] = useState<Record<string, any>>(data);
  const [entries, setEntries] = useState<TimeSheetEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; description: string }[]>([]);
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

    const fetchAttachments = async () => {
      try {
        const { data: attachmentsData, error } = await supabase
          .from('daily_time_sheet_attachments')
          .select('*')
          .eq('daily_time_sheet_id', recordId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching attachments:', error);
        } else {
          setExistingAttachments(attachmentsData || []);
        }
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };

    const fetchEntries = async () => {
      try {
        const { data: entriesData, error } = await supabase
          .from('daily_time_sheet_entries')
          .select('*')
          .eq('daily_time_sheet_id', recordId)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching entries:', error);
        } else {
          const mappedEntries = (entriesData || []).map((entry: any) => ({
            id: entry.id,
            entry_date: entry.entry_date || '',
            start_time: entry.start_time || '',
            stop_time: entry.stop_time || '',
            total_hours: entry.total_hours?.toString() || '',
            job_description: entry.job_description || '',
          }));
          setEntries(mappedEntries.length > 0 ? mappedEntries : [{ id: generateEntryId(), entry_date: '', start_time: '', stop_time: '', total_hours: '', job_description: '' }]);
        }
      } catch (error) {
        console.error('Error fetching entries:', error);
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
    fetchAttachments();
    fetchEntries();
    fetchApprovedJOs();

    // Also check if entries are in data object
    if (data.daily_time_sheet_entries && Array.isArray(data.daily_time_sheet_entries)) {
      const mappedEntries = data.daily_time_sheet_entries.map((entry: any) => ({
        id: entry.id || generateEntryId(),
        entry_date: entry.entry_date || '',
        start_time: entry.start_time || '',
        stop_time: entry.stop_time || '',
        total_hours: entry.total_hours?.toString() || '',
        job_description: entry.job_description || '',
      }));
      if (mappedEntries.length > 0) {
        setEntries(mappedEntries);
      }
    }
  }, [recordId, data.daily_time_sheet_entries]);

  // Auto-calculate total manhours
  useEffect(() => {
    const totalHours = entries.reduce((sum, entry) => {
      const hours = parseFloat(entry.total_hours) || 0;
      return sum + hours;
    }, 0);
    const total = totalHours.toFixed(2);
    if (formData.total_manhours !== total) {
      handleFieldChange('total_manhours', total);
    }
  }, [entries]);

  // Auto-calculate performance
  useEffect(() => {
    const srt = parseFloat(formData.total_srt) || 0;
    const actualManhour = parseFloat(formData.actual_manhour) || 0;
    if (actualManhour > 0) {
      const perf = ((srt / actualManhour) * 100).toFixed(2);
      if (formData.performance !== perf) {
        handleFieldChange('performance', perf);
      }
    }
  }, [formData.total_srt, formData.actual_manhour]);

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData((prev) => ({ ...prev, [name]: signature }));
  };

  const handleJobOrderSelect = (jo: any) => {
    setFormData((prev) => ({
      ...prev,
      job_number: jo.shop_field_jo_number || "",
      customer: jo.full_customer_name || "",
      address: jo.address || "",
      job_order_request_id: jo.id || "",
    }));
  };

  const addEntry = () => {
    setEntries([...entries, { id: generateEntryId(), entry_date: '', start_time: '', stop_time: '', total_hours: '', job_description: '' }]);
  };

  const updateEntry = (id: string, field: keyof TimeSheetEntry, value: string) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };
        // Recalculate total hours if time changed
        if ((field === 'start_time' || field === 'stop_time') && updated.start_time && updated.stop_time) {
          const [startHour, startMin] = updated.start_time.split(':').map(Number);
          const [stopHour, stopMin] = updated.stop_time.split(':').map(Number);
          let totalMinutes = (stopHour * 60 + stopMin) - (startHour * 60 + startMin);
          if (totalMinutes < 0) totalMinutes += 24 * 60;
          updated.total_hours = (totalMinutes / 60).toFixed(2);
        }
        return updated;
      }
      return entry;
    }));
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Prepare entries data
      const entriesData = entries.map(({ id, ...rest }, index) => ({
        ...rest,
        sort_order: index,
      }));

      // First, update the main form data (JSON)
      await apiClient.patch(`/forms/daily-time-sheet/${recordId}`, {
        ...formData,
        entries: entriesData,
      });

      // Handle attachments updates separately
      const formDataObj = new FormData();
      formDataObj.append('daily_time_sheet_id', recordId);
      formDataObj.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
      formDataObj.append('existing_attachments', JSON.stringify(existingAttachments));

      // Append new attachments
      newAttachments.forEach((attachment) => {
        formDataObj.append('attachment_files', attachment.file);
        formDataObj.append('attachment_descriptions', attachment.description);
      });

      // Update attachments
      await apiClient.post('/forms/daily-time-sheet/attachments', formDataObj);

      toast.success("Daily Time Sheet updated successfully!");
      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error updating Daily Time Sheet:", error);
      const errorMessage = error.response?.data?.error || "Failed to update Daily Time Sheet";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Edit Daily Time Sheet</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <div className="space-y-6 max-w-5xl mx-auto">

            {/* Basic Information */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JobOrderAutocomplete
                  label="Job No."
                  value={formData.job_number || ''}
                  onChange={(value) => handleFieldChange('job_number', value)}
                  onSelect={handleJobOrderSelect}
                  jobOrders={approvedJOs}
                />
                <Input label="Customer" name="customer" value={formData.customer} onChange={handleFieldChange} />
                <Input label="Address" name="address" value={formData.address} onChange={handleFieldChange} className="md:col-span-2" />
                <Input label="Date" name="date" type="date" value={formData.date} onChange={handleFieldChange} />
              </div>
            </div>

            {/* Manhours & Job Descriptions */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                <h4 className="text-base font-bold text-gray-800 uppercase">Manhours & Job Descriptions</h4>
                <button
                  type="button"
                  onClick={addEntry}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Row
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[110px]">Date</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[90px]">Start</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[90px]">Stop</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[70px]">Total</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2">Job Description</th>
                      <th className="w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-200">
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={entry.entry_date}
                            onChange={(e) => updateEntry(entry.id, 'entry_date', e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="time"
                            value={entry.start_time}
                            onChange={(e) => updateEntry(entry.id, 'start_time', e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="time"
                            value={entry.stop_time}
                            onChange={(e) => updateEntry(entry.id, 'stop_time', e.target.value)}
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={entry.total_hours}
                            readOnly
                            className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={entry.job_description}
                            onChange={(e) => updateEntry(entry.id, 'job_description', e.target.value)}
                            placeholder="Enter job description"
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                          />
                        </td>
                        <td className="py-2 px-2">
                          {entries.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEntry(entry.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
                      <td colSpan={3} className="py-2 px-2 text-right font-bold text-gray-700 uppercase text-sm">Total Manhours</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={formData.total_manhours || ''}
                          readOnly
                          className="w-full bg-blue-50 border border-blue-300 text-gray-900 text-sm rounded-md p-1.5 font-bold"
                        />
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-4">
                <Input label="Grand Total Manhours (REG. + O.T.)" name="grand_total_manhours" type="number" step="0.01" value={formData.grand_total_manhours} onChange={handleFieldChange} />
              </div>
            </div>

            {/* Performed By */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">Performed By</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Select label="Print Name" name="performed_by_name" value={formData.performed_by_name} options={users.map(u => u.fullName)} onChange={handleFieldChange} />
                  <SignaturePad
                    label="Signature"
                    value={formData.performed_by_signature}
                    onChange={(sig) => handleSignatureChange('performed_by_signature', sig)}
                    subtitle="Performed By"
                  />
                </div>
                <div className="space-y-4">
                  <Select label="Supervisor" name="approved_by_name" value={formData.approved_by_name} options={users.map(u => u.fullName)} onChange={handleFieldChange} />
                  <SignaturePad
                    label="Signature"
                    value={formData.approved_by_signature}
                    onChange={(sig) => handleSignatureChange('approved_by_signature', sig)}
                    subtitle="Approved By (Supervisor)"
                  />
                </div>
              </div>
            </div>

            {/* For Service Office Only */}
            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
              <h4 className="text-base font-bold text-red-700 mb-4 pb-2 border-b border-red-300 uppercase">For Service Office Only</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input label="Total SRT" name="total_srt" type="number" step="0.01" value={formData.total_srt} onChange={handleFieldChange} />
                <Input label="Actual Manhour" name="actual_manhour" type="number" step="0.01" value={formData.actual_manhour} onChange={handleFieldChange} />
                <Input label="Performance (%)" name="performance" type="number" step="0.01" value={formData.performance} onChange={handleFieldChange} disabled />
                <div></div>
                <Select label="CHK. BY" name="checked_by" value={formData.checked_by} options={users.map(u => u.fullName)} onChange={handleFieldChange} />
                <Select label="SVC. CO'RDNTR" name="service_coordinator" value={formData.service_coordinator} options={users.map(u => u.fullName)} onChange={handleFieldChange} />
                <Select label="APVD. BY" name="approved_by_service" value={formData.approved_by_service} options={users.map(u => u.fullName)} onChange={handleFieldChange} />
                <Select label="SVC. MANAGER" name="service_manager" value={formData.service_manager} options={users.map(u => u.fullName)} onChange={handleFieldChange} />
                <div className="lg:col-span-4">
                  <TextArea label="Note" name="service_office_note" value={formData.service_office_note} onChange={handleFieldChange} />
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">Attachments</h4>
              <div className="space-y-4">
                {/* Existing Attachments */}
                {existingAttachments.map((attachment) => {
                  const isImage = attachment.file_type?.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.file_name || '');

                  return (
                    <div key={attachment.id} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0">
                            {isImage ? (
                              <img
                                src={attachment.file_url}
                                alt={attachment.file_name}
                                className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-gray-100 rounded-md border-2 border-gray-200 flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 mb-2">{attachment.file_name}</p>
                                <input
                                  type="text"
                                  placeholder="Enter description"
                                  value={attachment.description || ''}
                                  onChange={(e) => {
                                    const updatedAttachments = existingAttachments.map((att) =>
                                      att.id === attachment.id ? { ...att, description: e.target.value } : att
                                    );
                                    setExistingAttachments(updatedAttachments);
                                  }}
                                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachmentsToDelete([...attachmentsToDelete, attachment.id]);
                                  setExistingAttachments(existingAttachments.filter((att) => att.id !== attachment.id));
                                }}
                                className="ml-4 text-red-600 hover:text-red-800 transition-colors shrink-0"
                                title="Remove attachment"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* New Attachments */}
                {newAttachments.map((attachment, index) => {
                  const previewUrl = URL.createObjectURL(attachment.file);
                  const isImage = attachment.file.type.startsWith('image/');

                  return (
                    <div key={`new-${index}`} className="px-6 py-4 border-2 border-blue-300 rounded-md bg-blue-50 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0">
                            {isImage ? (
                              <img
                                src={previewUrl}
                                alt={attachment.file.name}
                                className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                                onLoad={() => URL.revokeObjectURL(previewUrl)}
                              />
                            ) : (
                              <div className="w-24 h-24 bg-gray-100 rounded-md border-2 border-gray-200 flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate mb-2">
                                  {attachment.file.name}
                                </p>
                                <input
                                  type="text"
                                  placeholder="Enter description"
                                  value={attachment.description}
                                  onChange={(e) => {
                                    const updatedAttachments = [...newAttachments];
                                    updatedAttachments[index].description = e.target.value;
                                    setNewAttachments(updatedAttachments);
                                  }}
                                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewAttachments(newAttachments.filter((_, i) => i !== index));
                                }}
                                className="ml-4 text-red-600 hover:text-red-800 transition-colors shrink-0"
                                title="Remove attachment"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Upload New Attachment */}
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="attachment-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="attachment-upload"
                          name="attachment-upload"
                          type="file"
                          accept="*/*"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setNewAttachments([...newAttachments, { file, description: '' }]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">Any file type up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
