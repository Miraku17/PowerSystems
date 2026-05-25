"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import SignatorySelect from './SignatorySelect';
import ConfirmationModal from "./ConfirmationModal";
import ReportHeader from "./ReportHeader";
import { PlusIcon, TrashIcon, CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  useDailyTimeSheetFormStore,
  TimeSheetEntry,
  ExpenseItem,
  ExpenseItemType,
  computeSummary,
} from "@/stores/dailyTimeSheetFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import { useUploadLoadingStore } from "@/stores/uploadLoadingStore";
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useUsers, FormUser } from "@/hooks/useSharedQueries";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/stores/authStore";

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

export default function DailyTimeSheetForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    formData, setFormData, resetFormData, addRow, addDateRow,
    updateEntry, removeEntry,
    addExpenseItem, updateExpenseItem, removeExpenseItem,
  } = useDailyTimeSheetFormStore();

  const { submit, isSubmitting } = useOfflineSubmit();
  const { uploadFiles } = useSupabaseUpload();
  const { showUploadLoading, hideUploadLoading } = useUploadLoadingStore();

  const { data: users = [] } = useUsers();
  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);

  const { hasPermission } = usePermissions();
  const canEditCheckedBy  = hasPermission('dts_service_office', 'checked_by');
  const canEditApprovedBy = hasPermission('dts_service_office', 'approved_by');

  const currentUser = useCurrentUser();
  const currentUserPosition = (
    users.find((u) => u.id === currentUser?.id)?.position?.name || ''
  ).toLowerCase();
  const isSuperAdmin = currentUserPosition === 'super admin';

  const summary = React.useMemo(() => computeSummary(formData.entries), [formData.entries]);

  // Push the two totals into form state for API submission.
  useEffect(() => {
    const tm  = (summary.totalRegularHours + summary.totalTravelHours).toFixed(2);
    const gtm = summary.grandTotalManhours.toFixed(2);
    if (formData.total_manhours !== tm) setFormData({ total_manhours: tm });
    if (formData.grand_total_manhours !== gtm) setFormData({ grand_total_manhours: gtm });
  }, [summary.totalRegularHours, summary.totalTravelHours, summary.grandTotalManhours]);

  const handleEntryChange = (entryId: string, field: keyof TimeSheetEntry, value: any) => {
    updateEntry(entryId, { [field]: value });
    if (field === 'start_time' || field === 'stop_time') {
      const entry = formData.entries.find(e => e.id === entryId);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleJobOrderSelect = (jo: any) => {
    setFormData({
      job_number: jo.shop_field_jo_number || "",
      customer: jo.full_customer_name || "",
      address: jo.location_of_unit || "",
      job_order_request_id: jo.id || "",
    });
  };

  const handleSignatoryChange = (name: string, value: string) => {
    setFormData({ [name]: value });
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    const entriesData = formData.entries.map(({ id, has_date, expense_items, ...rest }, idx) => ({
      ...rest,
      sort_order: idx,
      expense_items: expense_items.map(({ id: _id, ...item }, i) => ({
        ...item,
        sort_order: i,
      })),
    }));

    try {
      const uploadedData: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }> = [];

      if (attachments.length > 0) {
        showUploadLoading('Uploading images...');
        const results = await uploadFiles(
          attachments.map(a => a.file),
          { bucket: 'service-reports', pathPrefix: 'daily-time-sheet' }
        );

        const failedUploads = results.filter(r => !r.success);
        if (failedUploads.length > 0) {
          console.error('Some files failed to upload:', failedUploads);
          hideUploadLoading();
          toast.error(`Failed to upload ${failedUploads.length} file(s)`, { duration: 5000 });
        }

        results.forEach((r, i) => {
          if (r.success && r.url) {
            uploadedData.push({
              url: r.url,
              title: attachments[i].title,
              fileName: attachments[i].file.name,
              fileType: attachments[i].file.type,
              fileSize: attachments[i].file.size,
            });
          }
        });

        hideUploadLoading();
      }

      const sanitizedServiceOffice = {
        ...(canEditCheckedBy  ? {} : { checked_by: "",          checked_by_signature: "" }),
        ...(canEditApprovedBy ? {} : { approved_by_service: "", approved_by_service_signature: "" }),
      };

      await submit({
        formType: 'daily-time-sheet' as any,
        formData: {
          ...formData,
          ...sanitizedServiceOffice,
          entries: JSON.stringify(entriesData),
          uploaded_attachments: JSON.stringify(uploadedData),
        } as unknown as Record<string, unknown>,
        onSuccess: () => {
          setAttachments([]);
          resetFormData();
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      hideUploadLoading();
      toast.error('Failed to upload images. Please try again.');
    }
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
      <ReportHeader title="Daily Time Sheet" />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Basic Information */}
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
              required
            />
            <Input label="Date" name="date" type="date" value={formData.date} onChange={handleChange} />
            <div className="md:col-span-2">
              <Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} disabled required />
            </div>
            <div className="md:col-span-2">
              <Input label="Location of Unit" name="address" value={formData.address} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Section: Manhours & Expenses */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2" />
            <h3 className="text-lg font-bold text-gray-800 uppercase">Manhours & Expenses</h3>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 overflow-x-auto">
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
                {formData.entries.map((entry) => {
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
                          {formData.entries.length > 1 && (
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

        {/* Section: Summary (locked) */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2" />
            <h3 className="text-lg font-bold text-gray-800 uppercase">Summary</h3>
            <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(auto-calculated, locked)</span>
          </div>
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

        {/* Section: Signatories */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2" />
            <h3 className="text-lg font-bold text-gray-800 uppercase">Signatories</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <SignatorySelect
              label="Prepared By"
              name="performed_by_name"
              value={formData.performed_by_name}
              signatureValue={formData.performed_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ performed_by_signature: sig })}
              users={users as FormUser[]}
              subtitle="Logged-in User"
              autoFillForPositions={["User 1", "User 2"]}
            />
            <SignatorySelect
              label="Checked By"
              name="checked_by"
              value={formData.checked_by}
              signatureValue={formData.checked_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ checked_by_signature: sig })}
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
              value={formData.approved_by_service}
              signatureValue={formData.approved_by_service_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ approved_by_service_signature: sig })}
              users={users as FormUser[]}
              showAllUsers
              subtitle="Admin 1 or Super Admin"
              disabled={!canEditApprovedBy}
              filterByPermission={isSuperAdmin ? undefined : "dts_service_office.approved_by"}
              autoFillForPositions={["Super Admin"]}
            />
          </div>
        </div>

        {/* Section: Attachments */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Attachments</h3>
            <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(max 20 photos only)</span>
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
                      multiple
                      className="sr-only"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const files = Array.from(e.target.files);
                          if (attachments.length + files.length > 20) { toast.error('Maximum 20 photos allowed'); e.target.value = ''; return; }
                          const newFiles = [];
                          for (const file of files) {
                            if (!file.type.startsWith('image/')) {
                              toast.error('Please select only image files');
                              continue;
                            }
                            const compressed = await compressImageIfNeeded(file);
                            newFiles.push({ file: compressed, title: '' });
                          }
                          if (newFiles.length > 0) setAttachments([...attachments, ...newFiles]);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className={`text-xs ${attachments.length >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>PNG, JPG, GIF up to 10MB ({attachments.length}/20 photos)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
          <button type="button" onClick={() => { resetFormData(); setAttachments([]); }} className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base">
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
