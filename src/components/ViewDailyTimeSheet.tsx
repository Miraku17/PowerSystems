"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import apiClient from "@/lib/axios";

interface ViewDailyTimeSheetProps {
  data: Record<string, any>;
  onClose: () => void;
  onExportPDF?: () => void;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  description: string;
  created_at: string;
}

interface TimeSheetEntry {
  id: string;
  entry_date: string;
  start_time: string;
  stop_time: string;
  total_hours: number;
  job_description: string;
  sort_order: number;
  expense_breakfast: number;
  expense_lunch: number;
  expense_dinner: number;
  expense_transport: number;
  expense_lodging: number;
  expense_others: number;
  expense_total: number;
  expense_remarks: string;
  travel_hours: number;
}

export default function ViewDailyTimeSheet({ data, onClose, onExportPDF }: ViewDailyTimeSheetProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [entries, setEntries] = useState<TimeSheetEntry[]>([]);
  const [auditInfo, setAuditInfo] = useState<{
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
  }>({});

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const attachmentResponse = await apiClient.get('/forms/daily-time-sheet/attachments', { params: { daily_time_sheet_id: data.id } });
        setAttachments(attachmentResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };

    const fetchEntries = async () => {
      try {
        const { data: entriesData, error } = await supabase
          .from('daily_time_sheet_entries')
          .select('*')
          .eq('daily_time_sheet_id', data.id)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching entries:', error);
        } else {
          setEntries(entriesData || []);
        }
      } catch (error) {
        console.error('Error fetching entries:', error);
      }
    };

    if (data.id) {
      fetchAttachments();
      fetchEntries();
    }

    // Also check if entries are included in the data object (from API response)
    if (data.daily_time_sheet_entries) {
      setEntries(data.daily_time_sheet_entries);
    }
  }, [data.id, data.daily_time_sheet_entries]);

  useEffect(() => {
    const fetchAuditInfo = async () => {
      const userIds = new Set<string>();
      if (data.created_by) userIds.add(data.created_by);
      if (data.updated_by) userIds.add(data.updated_by);
      if (data.deleted_by) userIds.add(data.deleted_by);

      if (userIds.size === 0) return;

      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('id, firstname, lastname')
          .in('id', Array.from(userIds));

        if (error) {
          console.error('Error fetching user info:', error);
          return;
        }

        const userMap = new Map(users?.map(u => [u.id, `${u.firstname} ${u.lastname}`.trim()]) || []);
        setAuditInfo({
          createdBy: data.created_by ? userMap.get(data.created_by) : undefined,
          updatedBy: data.updated_by ? userMap.get(data.updated_by) : undefined,
          deletedBy: data.deleted_by ? userMap.get(data.deleted_by) : undefined,
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchAuditInfo();
  }, [data.created_by, data.updated_by, data.deleted_by]);

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <div className="text-sm text-gray-900 font-medium break-words">
        {value || "-"}
      </div>
    </div>
  );

  const formatToPHTime = (utcDateString: any) => {
    if (!utcDateString) return 'N/A';
    const dateString = typeof utcDateString === 'string' ? utcDateString : String(utcDateString);
    try {
      const hasTimezone = dateString.match(/[+-]\d{2}:\d{2}$/) || dateString.endsWith('Z');
      const utcString = hasTimezone ? dateString : dateString + 'Z';
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      const month = String(phDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(phDate.getUTCDate()).padStart(2, '0');
      const year = phDate.getUTCFullYear();
      let hours = phDate.getUTCHours();
      const minutes = String(phDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(phDate.getUTCSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = String(hours).padStart(2, '0');
      return `${month}/${day}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
    } catch (error) {
      return 'Error';
    }
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '-';
    }
  };

  const formatTime = (timeString: any) => {
    if (!timeString) return '-';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const formatNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Daily Time Sheet</h3>
              {(data.created_at || data.updated_at || data.deleted_at) && (
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  {data.created_at && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Created:</span>
                      <span>{formatToPHTime(data.created_at)}</span>
                      {auditInfo.createdBy && <span className="text-gray-400">by {auditInfo.createdBy}</span>}
                    </div>
                  )}
                  {data.updated_at && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Updated:</span>
                      <span>{formatToPHTime(data.updated_at)}</span>
                      {auditInfo.updatedBy && <span className="text-gray-400">by {auditInfo.updatedBy}</span>}
                    </div>
                  )}
                  {data.deleted_at && (
                    <div className="flex items-center gap-1 text-red-600">
                      <span className="font-semibold">Deleted:</span>
                      <span>{formatToPHTime(data.deleted_at)}</span>
                      {auditInfo.deletedBy && <span className="text-red-400">by {auditInfo.deletedBy}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto">

            {/* Company Header */}
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
              <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Incorporated</h1>
              <p className="text-sm text-gray-600 mt-2">C-3 Road corner Torsillo Street, Dagat-Dagatan, Caloocan City</p>
              <div className="mt-6">
                <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
                  Daily Time Sheet
                </h2>
              </div>
            </div>

            {/* Basic Information */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Customer" value={data.customer} />
                <Field label="Job No." value={data.job_number} />
                <Field label="Address" value={data.address} />
                <Field label="Date" value={formatDate(data.date)} />
              </div>
            </div>

            {/* Manhours & Job Descriptions Table */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Manhours & Job Descriptions</h3>
              <div>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Start</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Stop</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Total</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Travel Hrs</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Job Descriptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length > 0 ? (
                      entries.map((entry, index) => (
                        <React.Fragment key={entry.id || index}>
                          <tr className="hover:bg-gray-50">
                            <td className="border-l border-r border-t border-gray-300 px-3 py-2 text-sm">{formatDate(entry.entry_date)}</td>
                            <td className="border-l border-r border-t border-gray-300 px-3 py-2 text-sm">{formatTime(entry.start_time)}</td>
                            <td className="border-l border-r border-t border-gray-300 px-3 py-2 text-sm">{formatTime(entry.stop_time)}</td>
                            <td className="border-l border-r border-t border-gray-300 px-3 py-2 text-sm font-medium">{formatNumber(entry.total_hours)}</td>
                            <td className="border-l border-r border-t border-gray-300 px-3 py-2 text-sm">{formatNumber(entry.travel_hours)}</td>
                            <td className="border-l border-r border-t border-gray-300 px-3 py-2 text-sm">{entry.job_description || '-'}</td>
                          </tr>
                          <tr className="bg-gray-50/50">
                            <td colSpan={6} className="border border-gray-300 px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expenses</span>
                                <div className="flex-1 border-t border-gray-200"></div>
                              </div>
                              <div className="grid grid-cols-8 gap-3 text-sm">
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Breakfast</span>
                                  <span className="text-gray-900">{formatNumber(entry.expense_breakfast)}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Lunch</span>
                                  <span className="text-gray-900">{formatNumber(entry.expense_lunch)}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Dinner</span>
                                  <span className="text-gray-900">{formatNumber(entry.expense_dinner)}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Transport</span>
                                  <span className="text-gray-900">{formatNumber(entry.expense_transport)}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Lodging</span>
                                  <span className="text-gray-900">{formatNumber(entry.expense_lodging)}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Others</span>
                                  <span className="text-gray-900">{formatNumber(entry.expense_others)}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Total</span>
                                  <span className="text-gray-900 font-bold">₱{formatNumber(entry.expense_total)}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] font-semibold text-gray-500 uppercase">Remarks</span>
                                  <span className="text-gray-900">{entry.expense_remarks || '-'}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-gray-300 px-3 py-4 text-sm text-center text-gray-500">
                          No time entries recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50 font-bold">
                      <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right text-sm uppercase">Total Manhours</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{formatNumber(data.total_manhours)}</td>
                      <td className="border border-gray-300 px-3 py-2" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Regular Hours (8AM - 5PM)" value={formatNumber(data.total_manhours)} />
                <div>
                  <label className="block text-xs font-semibold text-orange-600 uppercase mb-1">Overtime Hours</label>
                  <div className="text-sm text-gray-900 font-bold">{formatNumber((parseFloat(data.grand_total_manhours || '0') - parseFloat(data.total_manhours || '0')))}</div>
                </div>
                <Field label="Grand Total Manhours (REG. + O.T.)" value={formatNumber(data.grand_total_manhours)} />
              </div>
            </div>

            {/* Performed By */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Performed By</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Field label="Print Name" value={data.performed_by_name} />
                  {data.performed_by_signature && (
                    <div className="mt-2">
                      <img src={data.performed_by_signature} alt="Performed By Signature" className="h-16 border border-gray-300 rounded" />
                    </div>
                  )}
                </div>
                <div>
                  <Field label="Supervisor" value={data.approved_by_name} />
                  {data.approved_by_signature && (
                    <div className="mt-2">
                      <img src={data.approved_by_signature} alt="Approved By Signature" className="h-16 border border-gray-300 rounded" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* For Service Office Only */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-red-700 mb-3 pb-2 border-b border-red-300 uppercase">For Service Office Only</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-red-50 p-4 rounded-lg">
                <Field label="Total SRT" value={formatNumber(data.total_srt)} />
                <Field label="Actual Manhour" value={formatNumber(data.actual_manhour)} />
                <Field label="Performance (%)" value={data.performance ? `${formatNumber(data.performance)}%` : '-'} />
                <div></div>
                <Field label="CHK. BY" value={data.checked_by} />
                <Field label="SVC. CO'RDNTR" value={data.service_coordinator} />
                <Field label="APVD. BY" value={data.approved_by_service} />
                <Field label="SVC. MANAGER" value={data.service_manager} />
                <div className="md:col-span-4">
                  <Field label="Note" value={data.service_office_note} />
                </div>
                <div className="md:col-span-4 text-xs text-gray-600 italic">
                  <p>ACTUAL MANHOUR = REGULAR + OVERTIME</p>
                  <p>PERFORMANCE = SRT / ACTUAL MANHOUR</p>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Attachments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attachments.map((attachment) => {
                    const isImage = attachment.file_type?.startsWith('image/') ||
                      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment.file_name || '');

                    return (
                      <div
                        key={attachment.id}
                        className="border border-gray-200 rounded-lg overflow-hidden group hover:border-blue-500 hover:shadow-md transition-all"
                      >
                        {isImage ? (
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="w-full h-48 bg-gray-50 flex items-center justify-center p-2">
                              <img
                                src={attachment.file_url}
                                alt={attachment.file_name}
                                className="max-w-full max-h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          </a>
                        ) : (
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 flex items-center gap-2"
                          >
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </a>
                        )}
                        <div className="p-3 bg-white border-t border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                          {attachment.description && (
                            <p className="text-xs text-gray-500 truncate mt-1">{attachment.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Export PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
