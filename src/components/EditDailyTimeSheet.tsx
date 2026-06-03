"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import { useUploadLoadingStore } from "@/stores/uploadLoadingStore";
import SignatorySelect from "./SignatorySelect";
import { supabase } from "@/lib/supabase";
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useUsers, FormUser } from "@/hooks/useSharedQueries";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/stores/authStore";
import {
  ExpenseItem,
  ExpenseItemType,
  TimeSheetEntry,
  computeSummary,
} from "@/stores/dailyTimeSheetFormStore";

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

const EXPENSE_TYPE_OPTIONS: { value: ExpenseItemType; label: string }[] = [
  { value: 'breakfast',    label: 'Breakfast' },
  { value: 'lunch',        label: 'Lunch' },
  { value: 'dinner',       label: 'Dinner' },
  { value: 'car_odo',      label: 'Car ODO' },
  { value: 'hotel_others', label: 'Hotel & Others' },
];

const formatPeso = (n: number) =>
  n === 0 ? '—' : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatHours = (n: number) => `${n.toFixed(2)} hours`;

const genEntryId   = () => `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const genExpenseId = () => `expense-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const createEmptyEntry = (hasDate: boolean): TimeSheetEntry => ({
  id: genEntryId(),
  entry_date: '',
  start_time: '',
  stop_time: '',
  total_hours: '',
  has_date: hasDate,
  initial_location: '',
  final_location: '',
  is_travel: false,
  expense_items: [],
});

export default function EditDailyTimeSheet({ data, recordId, onClose, onSaved }: EditDailyTimeSheetProps) {
  const { uploadFiles } = useSupabaseUpload();
  const { showUploadLoading, hideUploadLoading } = useUploadLoadingStore();
  const { data: users = [] } = useUsers();
  const [formData, setFormData] = useState<Record<string, any>>(data);
  const [entries, setEntries] = useState<TimeSheetEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; description: string }[]>([]);

  const { hasPermission } = usePermissions();
  const canEditCheckedBy  = hasPermission('dts_service_office', 'checked_by');
  const canEditApprovedBy = hasPermission('dts_service_office', 'approved_by');

  const currentUser = useCurrentUser();
  const currentUserPosition = (
    users.find((u: any) => u.id === currentUser?.id)?.position?.name || ''
  ).toLowerCase();
  const isSuperAdmin = currentUserPosition === 'super admin';

  const summary = useMemo(() => computeSummary(entries), [entries]);

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
          .select('*, daily_time_sheet_expense_items(*)')
          .eq('daily_time_sheet_id', recordId)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching entries:', error);
          return;
        }

        const mapped: TimeSheetEntry[] = (entriesData || []).map((e: any, index: number) => ({
          id: `entry-${e.id}`,
          entry_date: e.entry_date || '',
          start_time: e.start_time || '',
          stop_time:  e.stop_time  || '',
          total_hours: e.total_hours != null ? String(e.total_hours) : '',
          has_date: index === 0 || !!e.entry_date,
          initial_location: e.initial_location || '',
          final_location:   e.final_location   || '',
          is_travel:        !!e.is_travel,
          expense_items: (e.daily_time_sheet_expense_items || [])
            .slice()
            .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((it: any, i: number): ExpenseItem => ({
              id: `expense-${it.id}`,
              type: it.type,
              amount:        it.amount        != null ? String(it.amount)        : '',
              departure_odo: it.departure_odo != null ? String(it.departure_odo) : '',
              arrival_odo:   it.arrival_odo   != null ? String(it.arrival_odo)   : '',
              job_description: it.job_description || '',
              sort_order: it.sort_order ?? i,
            })),
        }));

        setEntries(mapped.length > 0 ? mapped : [createEmptyEntry(true)]);
      } catch (error) {
        console.error('Error fetching entries:', error);
      }
    };

    fetchAttachments();
    fetchEntries();
  }, [recordId]);

  // Push the two totals into form state for API submission.
  useEffect(() => {
    const tm  = (summary.totalRegularHours + summary.totalTravelHours).toFixed(2);
    const gtm = summary.grandTotalManhours.toFixed(2);
    setFormData(prev => {
      if (prev.total_manhours === tm && prev.grand_total_manhours === gtm) return prev;
      return { ...prev, total_manhours: tm, grand_total_manhours: gtm };
    });
  }, [summary.totalRegularHours, summary.totalTravelHours, summary.grandTotalManhours]);

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleJobOrderSelect = (jo: any) => {
    setFormData(prev => ({
      ...prev,
      job_number: jo.shop_field_jo_number || "",
      customer: jo.full_customer_name || "",
      address: jo.location_of_unit || "",
      job_order_request_id: jo.id || "",
    }));
  };

  const updateEntry = (id: string, patch: Partial<TimeSheetEntry>) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev);
  };

  const addRow     = () => setEntries(prev => [...prev, createEmptyEntry(false)]);
  const addDateRow = () => setEntries(prev => [...prev, createEmptyEntry(true)]);

  const addExpenseItem = (entryId: string, type: ExpenseItemType) =>
    setEntries(prev => prev.map(e => e.id === entryId
      ? {
          ...e,
          expense_items: [...e.expense_items, {
            id: genExpenseId(),
            type, amount: '', job_description: '',
            departure_odo: '', arrival_odo: '',
            sort_order: e.expense_items.length,
          }],
        }
      : e));

  const updateExpenseItem = (entryId: string, itemId: string, patch: Partial<ExpenseItem>) =>
    setEntries(prev => prev.map(e => e.id === entryId
      ? { ...e, expense_items: e.expense_items.map(i => i.id === itemId ? { ...i, ...patch } : i) }
      : e));

  const removeExpenseItem = (entryId: string, itemId: string) =>
    setEntries(prev => prev.map(e => e.id === entryId
      ? { ...e, expense_items: e.expense_items.filter(i => i.id !== itemId) }
      : e));

  const handleEntryChange = (entryId: string, field: keyof TimeSheetEntry, value: any) => {
    updateEntry(entryId, { [field]: value });
    if (field === 'start_time' || field === 'stop_time') {
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;
      const next = { ...entry, [field]: value } as TimeSheetEntry;
      if (next.start_time && next.stop_time) {
        const [sh, sm] = next.start_time.split(':').map(Number);
        const [eh, em] = next.stop_time.split(':').map(Number);
        let m = (eh * 60 + em) - (sh * 60 + sm);
        if (m < 0) m += 24 * 60;
        setTimeout(() => updateEntry(entryId, { total_hours: (m / 60).toFixed(2) }), 0);
      }
    }
  };

  const handleSignatoryChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const entriesData = entries.map(({ id, has_date, expense_items, ...rest }, index) => ({
        ...rest,
        sort_order: index,
        expense_items: expense_items.map(({ id: _id, ...item }, i) => ({
          ...item,
          sort_order: i,
        })),
      }));

      await apiClient.patch(`/forms/daily-time-sheet/${recordId}`, {
        ...formData,
        entries: entriesData,
      });

      const uploadedNewAttachments: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }> = [];

      if (newAttachments.length > 0) {
        showUploadLoading('Uploading images...');
        const results = await uploadFiles(
          newAttachments.map(a => a.file),
          { bucket: 'service-reports', pathPrefix: 'daily-time-sheet' }
        );
        results.forEach((r, i) => {
          if (r.success && r.url) {
            uploadedNewAttachments.push({
              url: r.url,
              title: newAttachments[i].description,
              fileName: newAttachments[i].file.name,
              fileType: newAttachments[i].file.type,
              fileSize: newAttachments[i].file.size,
            });
          } else {
            console.error(`Failed to upload file: ${r.error}`);
          }
        });
        hideUploadLoading();
      }

      await apiClient.post('/forms/daily-time-sheet/attachments', {
        daily_time_sheet_id: recordId,
        attachments_to_delete: attachmentsToDelete,
        existing_attachments: existingAttachments,
        uploaded_new_attachments: uploadedNewAttachments,
      });

      toast.success("Daily Time Sheet updated successfully!");
      onSaved();
      onClose();
    } catch (error: any) {
      hideUploadLoading();
      console.error("Error updating Daily Time Sheet:", error);
      const errMsg = error.response?.data?.error;
      const errorMessage = typeof errMsg === 'string'
        ? errMsg
        : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : "Failed to update Daily Time Sheet");
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
                />
                <Input label="Customer" name="customer" value={formData.customer} onChange={handleFieldChange} disabled />
                <Input label="Location of Unit" name="address" value={formData.address} onChange={handleFieldChange} className="md:col-span-2" />
                <Input label="Date" name="date" type="date" value={formData.date} onChange={handleFieldChange} />
              </div>
            </div>

            {/* Manhours & Expenses */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">Manhours & Expenses</h4>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-200 text-gray-700">
                      <th className="border border-gray-300 px-2 py-2 text-left w-[110px]">Date</th>
                      <th className="border border-gray-300 px-2 py-2 text-left w-[90px]">Start Time</th>
                      <th className="border border-gray-300 px-2 py-2 text-left">Initial Location</th>
                      <th className="border border-gray-300 px-2 py-2 text-left w-[90px]">Stop Time</th>
                      <th className="border border-gray-300 px-2 py-2 text-left">Final Location</th>
                      <th className="border border-gray-300 px-2 py-2 text-center w-[70px]">Total</th>
                      <th className="border border-gray-300 px-2 py-2 text-center w-[60px]">Travel</th>
                      <th className="border border-gray-300 px-2 py-2 text-left w-[140px]">Expense Type</th>
                      <th className="border border-gray-300 px-2 py-2 text-left w-[160px]">Amount</th>
                      <th className="border border-gray-300 px-2 py-2 text-left">Job Description</th>
                      <th className="border border-gray-300 px-2 py-2 w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const rowSpan = Math.max(1, entry.expense_items.length);
                      return (
                        <React.Fragment key={entry.id}>
                          <tr>
                            <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                              {entry.has_date ? (
                                <input
                                  type="date"
                                  value={entry.entry_date}
                                  onChange={(e) => handleEntryChange(entry.id, 'entry_date', e.target.value)}
                                  className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                                />
                              ) : null}
                            </td>
                            <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                              <input
                                type="time"
                                value={entry.start_time}
                                onChange={(e) => handleEntryChange(entry.id, 'start_time', e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                              />
                            </td>
                            <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                              <input
                                type="text"
                                value={entry.initial_location}
                                onChange={(e) => handleEntryChange(entry.id, 'initial_location', e.target.value)}
                                placeholder="e.g. PSI Caloocan"
                                className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                              />
                            </td>
                            <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                              <input
                                type="time"
                                value={entry.stop_time}
                                onChange={(e) => handleEntryChange(entry.id, 'stop_time', e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                              />
                            </td>
                            <td className="border border-gray-300 px-1 py-1 align-top" rowSpan={rowSpan}>
                              <input
                                type="text"
                                value={entry.final_location}
                                onChange={(e) => handleEntryChange(entry.id, 'final_location', e.target.value)}
                                placeholder="e.g. Philex"
                                className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
                              />
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-center align-top" rowSpan={rowSpan}>
                              <input
                                type="text"
                                value={entry.total_hours}
                                readOnly
                                className="w-full bg-gray-100 border border-gray-300 rounded-md text-sm p-1 text-center font-semibold"
                              />
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-center align-top" rowSpan={rowSpan}>
                              <input
                                type="checkbox"
                                checked={entry.is_travel}
                                onChange={(e) => handleEntryChange(entry.id, 'is_travel', e.target.checked)}
                                className="h-4 w-4"
                                title="Mark this entry as Travel time"
                              />
                            </td>
                            {entry.expense_items[0] ? (
                              <ExpenseCells
                                entryId={entry.id}
                                item={entry.expense_items[0]}
                                onChange={updateExpenseItem}
                                onRemove={removeExpenseItem}
                              />
                            ) : (
                              <td className="border border-gray-300 px-2 py-2 italic text-gray-400" colSpan={4}>
                                No expenses — click "Add Expense" below
                              </td>
                            )}
                            <td className="border border-gray-300 px-1 py-1 text-center align-top" rowSpan={rowSpan}>
                              {entries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeEntry(entry.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="Remove this time row"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                          {entry.expense_items.slice(1).map((item) => (
                            <tr key={item.id}>
                              <ExpenseCells
                                entryId={entry.id}
                                item={item}
                                onChange={updateExpenseItem}
                                onRemove={removeExpenseItem}
                              />
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={11} className="border border-gray-300 px-2 py-1 bg-orange-50">
                              <button
                                type="button"
                                onClick={() => addExpenseItem(entry.id, 'breakfast')}
                                className="text-orange-700 hover:text-orange-900 text-xs font-semibold"
                              >
                                + Add Expense to this time entry
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md"
                  >
                    <PlusIcon className="h-4 w-4" /> Add New Time
                  </button>
                  <button
                    type="button"
                    onClick={addDateRow}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
                  >
                    <CalendarDaysIcon className="h-4 w-4" /> Add New Date
                  </button>
                </div>
              </div>
            </div>

            {/* Summary (locked) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">
                Summary <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(auto-calculated, locked)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <SummaryTile label="Total Overtime"        value={formatHours(summary.totalOvertimeHours)} />
                <SummaryTile label="Total Regular Hours"   value={formatHours(summary.totalRegularHours)} />
                <SummaryTile label="Total Travel Hours"    value={formatHours(summary.totalTravelHours)} />
                <SummaryTile label="Grand Total Manhours"  value={formatHours(summary.grandTotalManhours)} highlight />
                <SummaryTile label="Total Meal Allowance"  value={formatPeso(summary.totalMealAllowance)} />
                <SummaryTile label="Total Fare Expense"    value={formatPeso(summary.totalFareExpense)} />
                <SummaryTile label="Total Hotel & Others"  value={formatPeso(summary.totalHotelOthers)} />
                <SummaryTile label="Grand Total Expense"   value={formatPeso(summary.grandTotalExpense)} highlight />
                <SummaryTile label="Total Distance Travel" value={`${summary.totalDistanceTravelKm.toFixed(0)} km`} />
              </div>
            </div>

            {/* Signatories */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">Signatories</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SignatorySelect
                  label="Prepared By"
                  name="performed_by_name"
                  value={formData.performed_by_name || ''}
                  signatureValue={formData.performed_by_signature || ''}
                  onChange={handleSignatoryChange}
                  onSignatureChange={(sig) => handleFieldChange("performed_by_signature", sig)}
                  users={users as FormUser[]}
                  subtitle="Logged-in User"
                  autoFillForPositions={["User 1", "User 2"]}
                  lockIfDifferentUser
                />
                <SignatorySelect
                  label="Checked By"
                  name="checked_by"
                  value={formData.checked_by || ''}
                  signatureValue={formData.checked_by_signature || ''}
                  onChange={handleSignatoryChange}
                  onSignatureChange={(sig) => handleFieldChange("checked_by_signature", sig)}
                  users={users as FormUser[]}
                  showAllUsers
                  subtitle="Admin 2"
                  disabled={!canEditCheckedBy}
                  filterByPermission={isSuperAdmin ? undefined : "dts_service_office.checked_by"}
                  autoFillForPositions={["Super Admin"]}
                />
                <SignatorySelect
                  label="Approved By"
                  name="approved_by_service"
                  value={formData.approved_by_service || ''}
                  signatureValue={formData.approved_by_service_signature || ''}
                  onChange={handleSignatoryChange}
                  onSignatureChange={(sig) => handleFieldChange("approved_by_service_signature", sig)}
                  users={users as FormUser[]}
                  showAllUsers
                  subtitle="Admin 1 or Super Admin"
                  disabled={!canEditApprovedBy}
                  filterByPermission={isSuperAdmin ? undefined : "dts_service_office.approved_by"}
                  autoFillForPositions={["Super Admin"]}
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 uppercase">
                Attachments <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(max 20 photos only)</span>
              </h4>
              <div className="space-y-4">
                {/* Existing Attachments */}
                {existingAttachments.map((attachment) => {
                  const isImage = attachment.file_type?.startsWith('image/') ||
                    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.file_name || '');
                  return (
                    <div key={attachment.id} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {isImage ? (
                            <img src={attachment.file_url} alt={attachment.file_name} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200" />
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
                                  const updated = existingAttachments.map((att) =>
                                    att.id === attachment.id ? { ...att, description: e.target.value } : att
                                  );
                                  setExistingAttachments(updated);
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
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
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
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {isImage ? (
                            <img src={previewUrl} alt={attachment.file.name} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200" onLoad={() => URL.revokeObjectURL(previewUrl)} />
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
                              <p className="text-sm font-medium text-gray-900 truncate mb-2">{attachment.file.name}</p>
                              <input
                                type="text"
                                placeholder="Enter description"
                                value={attachment.description}
                                onChange={(e) => {
                                  const updated = [...newAttachments];
                                  updated[index].description = e.target.value;
                                  setNewAttachments(updated);
                                }}
                                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== index))}
                              className="ml-4 text-red-600 hover:text-red-800 transition-colors shrink-0"
                              title="Remove attachment"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Upload */}
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="attachment-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                        <span>Upload a file</span>
                        <input
                          id="attachment-upload"
                          name="attachment-upload"
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          className="sr-only"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              const files = Array.from(e.target.files);
                              if (existingAttachments.length + newAttachments.length + files.length > 20) {
                                toast.error('Maximum 20 photos allowed');
                                e.target.value = '';
                                return;
                              }
                              const processed = [];
                              for (const file of files) {
                                if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                                  toast.error('Please select image or PDF files');
                                  continue;
                                }
                                const compressed = file.type.startsWith('image/') ? await compressImageIfNeeded(file) : file;
                                processed.push({ file: compressed, description: '' });
                              }
                              if (processed.length > 0) setNewAttachments([...newAttachments, ...processed]);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className={`text-xs ${existingAttachments.length + newAttachments.length >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>Any file type up to 10MB ({existingAttachments.length + newAttachments.length}/20 photos)</p>
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

interface InputProps {
  label: string;
  name: string;
  value: any;
  type?: string;
  className?: string;
  step?: string;
  disabled?: boolean;
  onChange: (name: string, value: any) => void;
}

const Input = ({ label, name, value, type = "text", className = "", step, disabled, onChange }: InputProps) => (
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

interface ExpenseCellsProps {
  entryId: string;
  item: ExpenseItem;
  onChange: (entryId: string, itemId: string, data: Partial<ExpenseItem>) => void;
  onRemove: (entryId: string, itemId: string) => void;
}

const ExpenseCells = ({ entryId, item, onChange, onRemove }: ExpenseCellsProps) => (
  <>
    <td className="border border-gray-300 px-1 py-1 align-top">
      <select
        value={item.type}
        onChange={(e) => onChange(entryId, item.id, { type: e.target.value as ExpenseItemType })}
        className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
      >
        {EXPENSE_TYPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </td>
    <td className="border border-gray-300 px-1 py-1 align-top">
      {item.type === 'car_odo' ? (
        <div className="grid grid-cols-2 gap-1">
          <input
            type="number"
            value={item.departure_odo}
            onChange={(e) => onChange(entryId, item.id, { departure_odo: e.target.value })}
            placeholder="Departure"
            className="w-full bg-white border border-gray-300 rounded-md text-xs p-1"
          />
          <input
            type="number"
            value={item.arrival_odo}
            onChange={(e) => onChange(entryId, item.id, { arrival_odo: e.target.value })}
            placeholder="Arrival"
            className="w-full bg-white border border-gray-300 rounded-md text-xs p-1"
          />
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₱</span>
          <input
            type="number"
            step="0.01"
            value={item.amount}
            onChange={(e) => onChange(entryId, item.id, { amount: e.target.value })}
            placeholder="0.00"
            className="w-full bg-white border border-gray-300 rounded-md text-sm p-1 pl-5"
          />
        </div>
      )}
    </td>
    <td className="border border-gray-300 px-1 py-1 align-top">
      <input
        type="text"
        value={item.job_description}
        onChange={(e) => onChange(entryId, item.id, { job_description: e.target.value })}
        placeholder="e.g. Travel from PSI Caloocan to Philex"
        className="w-full bg-white border border-gray-300 rounded-md text-sm p-1"
      />
    </td>
    <td className="border border-gray-300 px-1 py-1 text-center align-top">
      <button
        type="button"
        onClick={() => onRemove(entryId, item.id)}
        className="p-1 text-red-500 hover:bg-red-50 rounded"
        title="Remove this expense"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </td>
  </>
);

interface SummaryTileProps {
  label: string;
  value: string;
  highlight?: boolean;
}

const SummaryTile = ({ label, value, highlight }: SummaryTileProps) => (
  <div className={`flex flex-col rounded-md border p-3 ${highlight ? 'bg-blue-100 border-blue-300' : 'bg-white border-blue-100'}`}>
    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{label}</span>
    <span className={`mt-1 ${highlight ? 'text-lg font-bold text-blue-900' : 'text-base font-semibold text-gray-900'}`}>{value}</span>
  </div>
);
