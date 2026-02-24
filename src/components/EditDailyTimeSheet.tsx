"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import SignatorySelect from "./SignatorySelect";
import { supabase } from "@/lib/supabase";
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useUsers } from "@/hooks/useSharedQueries";

interface EditDailyTimeSheetProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
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
  has_date: boolean;
  expense_breakfast: string;
  expense_lunch: string;
  expense_dinner: string;
  expense_transport: string;
  expense_lodging: string;
  expense_others: string;
  expense_total: string;
  expense_remarks: string;
  travel_hours: string;
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
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-14 shadow-sm"
          placeholder="Select or type a name"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(name, ""); setShowDropdown(false); }}
            className="absolute inset-y-0 right-7 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
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


const generateEntryId = () => `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export default function EditDailyTimeSheet({ data, recordId, onClose, onSaved }: EditDailyTimeSheetProps) {
  const { data: users = [] } = useUsers();
  const [formData, setFormData] = useState<Record<string, any>>(data);
  const [entries, setEntries] = useState<TimeSheetEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; description: string }[]>([]);
  const [approvedJOs, setApprovedJOs] = useState<any[]>([]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await apiClient.get('/forms/daily-time-sheet/attachments', { params: { daily_time_sheet_id: recordId } });
        setExistingAttachments(response.data.data || []);
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
            has_date: !!entry.entry_date,
            expense_breakfast: entry.expense_breakfast?.toString() || '',
            expense_lunch: entry.expense_lunch?.toString() || '',
            expense_dinner: entry.expense_dinner?.toString() || '',
            expense_transport: entry.expense_transport?.toString() || '',
            expense_lodging: entry.expense_lodging?.toString() || '',
            expense_others: entry.expense_others?.toString() || '',
            expense_total: entry.expense_total?.toString() || '',
            expense_remarks: entry.expense_remarks || '',
            travel_hours: entry.travel_hours?.toString() || '',
          }));
          setEntries(mappedEntries.length > 0 ? mappedEntries : [{ id: generateEntryId(), entry_date: '', start_time: '', stop_time: '', total_hours: '', job_description: '', has_date: true, expense_breakfast: '', expense_lunch: '', expense_dinner: '', expense_transport: '', expense_lodging: '', expense_others: '', expense_total: '', expense_remarks: '', travel_hours: '' }]);
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
        has_date: !!entry.entry_date,
        expense_breakfast: entry.expense_breakfast?.toString() || '',
        expense_lunch: entry.expense_lunch?.toString() || '',
        expense_dinner: entry.expense_dinner?.toString() || '',
        expense_transport: entry.expense_transport?.toString() || '',
        expense_lodging: entry.expense_lodging?.toString() || '',
        expense_others: entry.expense_others?.toString() || '',
        expense_total: entry.expense_total?.toString() || '',
        expense_remarks: entry.expense_remarks || '',
        travel_hours: entry.travel_hours?.toString() || '',
      }));
      if (mappedEntries.length > 0) {
        setEntries(mappedEntries);
      }
    }
  }, [recordId, data.daily_time_sheet_entries]);

  // Calculate regular and OT hours for an entry based on 8AM-5PM work schedule
  const calculateRegularAndOT = (startTime: string, stopTime: string) => {
    if (!startTime || !stopTime) return { regular: 0, ot: 0 };

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [stopHour, stopMin] = stopTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    let stopMinutes = stopHour * 60 + stopMin;
    if (stopMinutes <= startMinutes) stopMinutes += 24 * 60;

    const workStart = 8 * 60;
    const workEnd = 17 * 60;

    const overlapStart = Math.max(startMinutes, workStart);
    const overlapEnd = Math.min(stopMinutes, workEnd);
    const regularMinutes = Math.max(0, overlapEnd - overlapStart);

    const totalWorkedMinutes = stopMinutes - startMinutes;
    const otMinutes = totalWorkedMinutes - regularMinutes;

    return { regular: regularMinutes / 60, ot: otMinutes / 60 };
  };

  // Auto-calculate total manhours (regular) and grand total (reg + OT)
  useEffect(() => {
    let totalRegular = 0;
    let totalOT = 0;

    entries.forEach((entry) => {
      const { regular, ot } = calculateRegularAndOT(entry.start_time, entry.stop_time);
      totalRegular += regular;
      totalOT += ot;
    });

    const regStr = totalRegular.toFixed(2);
    const grandStr = (totalRegular + totalOT).toFixed(2);

    setFormData((prev) => {
      if (prev.total_manhours === regStr && prev.grand_total_manhours === grandStr) return prev;
      return { ...prev, total_manhours: regStr, grand_total_manhours: grandStr };
    });
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
    setEntries(prev => [...prev, { id: generateEntryId(), entry_date: '', start_time: '', stop_time: '', total_hours: '', job_description: '', has_date: false, expense_breakfast: '', expense_lunch: '', expense_dinner: '', expense_transport: '', expense_lodging: '', expense_others: '', expense_total: '', expense_remarks: '', travel_hours: '' }]);
  };

  const addDateEntry = () => {
    setEntries(prev => [...prev, { id: generateEntryId(), entry_date: '', start_time: '', stop_time: '', total_hours: '', job_description: '', has_date: true, expense_breakfast: '', expense_lunch: '', expense_dinner: '', expense_transport: '', expense_lodging: '', expense_others: '', expense_total: '', expense_remarks: '', travel_hours: '' }]);
  };

  const updateEntry = (id: string, field: keyof TimeSheetEntry, value: string) => {
    setEntries(prev => prev.map(entry => {
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
        // Recalculate expense total if any expense field changed
        const expenseFields = ['expense_breakfast', 'expense_lunch', 'expense_dinner', 'expense_transport', 'expense_lodging', 'expense_others'] as const;
        if (expenseFields.includes(field as any)) {
          const total = expenseFields.reduce((sum, f) => sum + (parseFloat(updated[f]) || 0), 0);
          updated.expense_total = total.toFixed(2);
        }
        return updated;
      }
      return entry;
    }));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.length > 1 ? prev.filter(entry => entry.id !== id) : prev);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Prepare entries data (strip client-only fields)
      const entriesData = entries.map(({ id, has_date, ...rest }, index) => ({
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
      const errMsg = error.response?.data?.error;
      const errorMessage = typeof errMsg === 'string' ? errMsg : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : "Failed to update Daily Time Sheet");
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addEntry}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Row
                  </button>
                  <button
                    type="button"
                    onClick={addDateEntry}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <CalendarDaysIcon className="h-4 w-4" />
                    Add New Date
                  </button>
                </div>
              </div>
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[110px]">Date</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[90px]">Start</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[90px]">Stop</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[70px]">Total</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2 w-[85px]">Travel Hrs</th>
                      <th className="text-left text-xs font-bold text-gray-600 uppercase py-2 px-2">Job Description</th>
                      <th className="w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <React.Fragment key={entry.id}>
                        <tr className="border-b border-gray-100">
                          <td className="pt-2 pb-1 px-2">
                            {entry.has_date ? (
                              <input
                                type="date"
                                value={entry.entry_date}
                                onChange={(e) => updateEntry(entry.id, 'entry_date', e.target.value)}
                                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                              />
                            ) : (
                              <div className="w-full h-[34px]"></div>
                            )}
                          </td>
                          <td className="pt-2 pb-1 px-2">
                            <input
                              type="time"
                              value={entry.start_time}
                              onChange={(e) => updateEntry(entry.id, 'start_time', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                            />
                          </td>
                          <td className="pt-2 pb-1 px-2">
                            <input
                              type="time"
                              value={entry.stop_time}
                              onChange={(e) => updateEntry(entry.id, 'stop_time', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                            />
                          </td>
                          <td className="pt-2 pb-1 px-2">
                            <input
                              type="text"
                              value={entry.total_hours}
                              readOnly
                              className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                            />
                          </td>
                          <td className="pt-2 pb-1 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={entry.travel_hours}
                              onChange={(e) => updateEntry(entry.id, 'travel_hours', e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                            />
                          </td>
                          <td className="pt-2 pb-1 px-2">
                            <input
                              type="text"
                              value={entry.job_description}
                              onChange={(e) => updateEntry(entry.id, 'job_description', e.target.value)}
                              placeholder="Enter job description"
                              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5"
                            />
                          </td>
                          <td className="pt-2 pb-1 px-2" rowSpan={2}>
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
                        <tr className="border-b border-gray-300 bg-gray-50/50">
                          <td colSpan={6} className="pt-1 pb-2 px-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expenses</span>
                              <div className="flex-1 border-t border-gray-200"></div>
                            </div>
                            <div className="grid grid-cols-8 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Breakfast</label>
                                <input type="number" step="0.01" value={entry.expense_breakfast} onChange={(e) => updateEntry(entry.id, 'expense_breakfast', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Lunch</label>
                                <input type="number" step="0.01" value={entry.expense_lunch} onChange={(e) => updateEntry(entry.id, 'expense_lunch', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Dinner</label>
                                <input type="number" step="0.01" value={entry.expense_dinner} onChange={(e) => updateEntry(entry.id, 'expense_dinner', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Transport</label>
                                <input type="number" step="0.01" value={entry.expense_transport} onChange={(e) => updateEntry(entry.id, 'expense_transport', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Lodging</label>
                                <input type="number" step="0.01" value={entry.expense_lodging} onChange={(e) => updateEntry(entry.id, 'expense_lodging', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Others</label>
                                <input type="number" step="0.01" value={entry.expense_others} onChange={(e) => updateEntry(entry.id, 'expense_others', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Total</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                                  <input type="text" value={entry.expense_total} readOnly className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-1.5 pl-5 font-bold" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Remarks</label>
                                <input type="text" value={entry.expense_remarks} onChange={(e) => updateEntry(entry.id, 'expense_remarks', e.target.value)} placeholder="Remarks" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-1.5" />
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-400">
                      <td colSpan={3} className="py-2 px-2 text-right font-bold text-gray-700 uppercase text-sm">Total Manhours</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={formData.total_manhours || ''}
                          readOnly
                          className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-1.5 font-bold"
                        />
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col w-full">
                    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Regular Hours (8AM - 5PM)</label>
                    <input type="text" value={formData.total_manhours || ''} readOnly className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-2.5 font-bold" />
                  </div>
                  <div className="flex flex-col w-full">
                    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Overtime Hours</label>
                    <input type="text" value={(parseFloat(formData.grand_total_manhours || '0') - parseFloat(formData.total_manhours || '0')).toFixed(2)} readOnly className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-2.5 font-bold" />
                  </div>
                  <div className="flex flex-col w-full">
                    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Grand Total Manhours (REG. + O.T.)</label>
                    <input type="text" value={formData.grand_total_manhours || ''} readOnly className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md p-2.5 font-bold" />
                  </div>
                </div>
              </div>
            </div>

            {/* Performed By */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">Performed By</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SignatorySelect
                  label="Print Name"
                  name="performed_by_name"
                  value={formData.performed_by_name}
                  signatureValue={formData.performed_by_signature}
                  onChange={handleFieldChange}
                  onSignatureChange={(sig) => handleFieldChange("performed_by_signature", sig)}
                  users={users}
                  subtitle="Performed By"
                />
                <SignatorySelect
                  label="Supervisor"
                  name="approved_by_name"
                  value={formData.approved_by_name}
                  signatureValue={formData.approved_by_signature}
                  onChange={handleFieldChange}
                  onSignatureChange={(sig) => handleFieldChange("approved_by_signature", sig)}
                  users={users}
                  subtitle="Approved By (Supervisor)"
                />
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
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">Attachments <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(max 10 photos only)</span></h4>
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
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              if (existingAttachments.length + newAttachments.length >= 10) { toast.error('Maximum 10 photos allowed'); e.target.value = ''; return; }
                              const file = e.target.files[0];
                              const compressed = file.type.startsWith('image/') ? await compressImageIfNeeded(file) : file;
                              setNewAttachments([...newAttachments, { file: compressed, description: '' }]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className={`text-xs ${existingAttachments.length + newAttachments.length >= 10 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>Any file type up to 10MB ({existingAttachments.length + newAttachments.length}/10 photos)</p>
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
