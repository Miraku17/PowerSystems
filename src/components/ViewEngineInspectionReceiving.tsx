"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/stores/authStore";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import {
  SECTION_DEFINITIONS,
  type SectionDefinition,
  type SectionItem,
  type InspectionItemData,
} from "@/stores/engineInspectionReceivingFormStore";

interface ViewEngineInspectionReceivingProps {
  data: any;
  onClose: () => void;
  onExportPDF: () => void;
}

export default function ViewEngineInspectionReceiving({ data, onClose, onExportPDF }: ViewEngineInspectionReceivingProps) {
  const [auditInfo, setAuditInfo] = useState<{
    createdBy?: string;
    updatedBy?: string;
  }>({});

  const currentUser = useCurrentUser();
  const [notedByChecked, setNotedByChecked] = useState(data.noted_by_checked || false);
  const [approvedByChecked, setApprovedByChecked] = useState(data.approved_by_checked || false);

  const handleApprovalToggle = async (field: 'noted_by' | 'approved_by', checked: boolean) => {
    try {
      await apiClient.patch('/forms/signatory-approval', {
        table: 'engine_inspection_receiving_report',
        recordId: data.id,
        field,
        checked,
      });
      if (field === 'noted_by') setNotedByChecked(checked);
      else setApprovedByChecked(checked);
      toast.success(`${field === 'noted_by' ? 'Noted' : 'Approved'} status updated`);
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Failed to update approval';
      toast.error(message);
    }
  };

  // Build inspectionItems map from the joined engine_inspection_items array
  const inspectionItemsMap: Record<string, InspectionItemData> = {};
  if (data.engine_inspection_items && Array.isArray(data.engine_inspection_items)) {
    for (const item of data.engine_inspection_items) {
      inspectionItemsMap[item.item_key] = {
        field_status: item.field_status || '',
        field_remarks: item.field_remarks || '',
        shop_status: item.shop_status || '',
        shop_remarks: item.shop_remarks || '',
      };
    }
  }

  useEffect(() => {
    const fetchAuditInfo = async () => {
      const userIds = new Set<string>();
      if (data.created_by) userIds.add(data.created_by);
      if (data.updated_by) userIds.add(data.updated_by);

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
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchAuditInfo();
  }, [data.created_by, data.updated_by]);

  const formatToPHTime = (utcDateString: any) => {
    if (!utcDateString) return 'N/A';
    try {
      const dateString = typeof utcDateString === 'string' ? utcDateString : String(utcDateString);
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
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month}/${day}/${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return 'Error';
    }
  };

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
      <div className="text-sm text-gray-900 font-medium break-words">{value || "-"}</div>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <div className="flex items-center mb-4">
        <div className="w-1 h-6 bg-blue-600 mr-2"></div>
        <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">{title}</h4>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">{children}</div>
    </div>
  );

  const formatStatus = (status: string) => {
    if (!status) return '-';
    if (status === 's') return 'S';
    if (status === 'ns') return 'NS';
    return status.toUpperCase();
  };

  const renderItemRow = (item: SectionItem) => {
    const itemData = inspectionItemsMap[item.item_key] || { field_status: '', field_remarks: '', shop_status: '', shop_remarks: '' };

    return (
      <tr key={item.item_key} className="border-b border-gray-200">
        <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">{item.label}</td>
        <td className="px-2 py-2 text-center text-sm border-r border-gray-200">
          <span className={itemData.field_status === 's' ? 'text-green-600 font-bold' : itemData.field_status === 'ns' ? 'text-red-600 font-bold' : 'text-gray-400'}>
            {formatStatus(itemData.field_status)}
          </span>
        </td>
        <td className="px-2 py-2 text-sm text-gray-600 border-r border-gray-300">{itemData.field_remarks || '-'}</td>
        <td className="px-2 py-2 text-center text-sm border-r border-gray-200">
          <span className={itemData.shop_status === 's' ? 'text-green-600 font-bold' : itemData.shop_status === 'ns' ? 'text-red-600 font-bold' : 'text-gray-400'}>
            {formatStatus(itemData.shop_status)}
          </span>
        </td>
        <td className="px-2 py-2 text-sm text-gray-600">{itemData.shop_remarks || '-'}</td>
      </tr>
    );
  };

  const renderSectionTable = (sectionDef: SectionDefinition) => {
    return (
      <div key={sectionDef.sectionKey} className="mb-6">
        <h4 className="text-sm font-bold text-gray-700 mb-2">
          {sectionDef.section}. {sectionDef.title}
        </h4>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase border-r border-gray-300 w-[30%]">Item Description</th>
                <th colSpan={2} className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase border-r border-gray-300 w-[35%]">FIELD</th>
                <th colSpan={2} className="px-3 py-2 text-center text-xs font-bold text-green-700 uppercase w-[35%]">SHOP</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-3 py-1 border-r border-gray-300"></th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 w-[8%]">Status</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-300 w-[27%]">Remarks</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 w-[8%]">Status</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 w-[27%]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {sectionDef.subSections
                ? sectionDef.subSections.map((sub) => (
                    <React.Fragment key={sub.label || 'general'}>
                      {sub.label && (
                        <tr className="bg-blue-50">
                          <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-blue-800">
                            {sub.label}
                          </td>
                        </tr>
                      )}
                      {sub.items.map(renderItemRow)}
                    </React.Fragment>
                  ))
                : sectionDef.items?.map(renderItemRow)
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Engine Inspection / Receiving Report</h3>
              {(data.created_at || data.updated_at) && (
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
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onExportPDF}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Export PDF"
              >
                <PrinterIcon className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto">

            {/* Company Header */}
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
              <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Inc.</h1>
              <p className="text-sm text-gray-600 mt-2">C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City</p>
              <p className="text-sm text-gray-600 mt-1"><span className="font-bold">Tel No.:</span> 287.8916, 285.0923</p>
              <div className="mt-6">
                <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
                  Engine Inspection / Receiving Report
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              {/* Header Information */}
              <Section title="Header Information">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Customer" value={data.customer} />
                  <Field label="JO Date" value={data.jo_date} />
                  <Field label="JO Number" value={data.jo_number} />
                  <Field label="Address" value={data.address} />
                  <Field label="ERR No." value={data.err_no} />
                </div>
              </Section>

              {/* Engine Details */}
              <Section title="Engine Details">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Engine Maker" value={data.engine_maker} />
                  <Field label="Application" value={data.application} />
                  <Field label="Engine Model" value={data.engine_model} />
                  <Field label="Engine Serial Number" value={data.engine_serial_number} />
                  <Field label="Date Received" value={data.date_received} />
                  <Field label="Date Inspected" value={data.date_inspected} />
                  <Field label="Engine RPM" value={data.engine_rpm} />
                  <Field label="Engine KW" value={data.engine_kw} />
                </div>
              </Section>

              {/* Inspection Items */}
              <Section title="Inspection Items">
                {SECTION_DEFINITIONS.map(renderSectionTable)}
              </Section>

              {/* Modification of Engine */}
              <Section title="XII. Modification of the Engine">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.modification_of_engine || '-'}</p>
              </Section>

              {/* Missing Parts */}
              <Section title="XIII. Missing Parts">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.missing_parts || '-'}</p>
              </Section>

              {/* Signatures */}
              <Section title="Signatures">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Service Technician</p>
                    {data.service_technician_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img src={data.service_technician_signature} alt="Service Technician Signature" className="h-24 w-auto object-contain" />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">No signature</div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.service_technician_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Signed by Technician</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Noted By</p>
                    {data.noted_by_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img src={data.noted_by_signature} alt="Noted By Signature" className="h-24 w-auto object-contain" />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">No signature</div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.noted_by_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Service Manager</p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={notedByChecked} disabled={!currentUser || currentUser.id !== data.noted_by_user_id} onChange={(e) => handleApprovalToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <span className="text-xs font-medium text-gray-600">Noted</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Approved By</p>
                    {data.approved_by_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img src={data.approved_by_signature} alt="Approved By Signature" className="h-24 w-auto object-contain" />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">No signature</div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.approved_by_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Authorized Signature</p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={approvedByChecked} disabled={!currentUser || currentUser.id !== data.approved_by_user_id} onChange={(e) => handleApprovalToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                        <span className="text-xs font-medium text-gray-600">Approved</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Acknowledged By</p>
                    {data.acknowledged_by_signature ? (
                      <div className="border border-gray-200 rounded-lg p-2 bg-white mb-2">
                        <img src={data.acknowledged_by_signature} alt="Acknowledged By Signature" className="h-24 w-auto object-contain" />
                      </div>
                    ) : (
                      <div className="h-24 w-full border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-2">No signature</div>
                    )}
                    <div className="border-t border-gray-400 w-48 pt-2 text-center">
                      <p className="text-sm font-medium text-gray-900">{data.acknowledged_by_name || "________________________"}</p>
                      <p className="text-xs text-gray-500">Customer Signature</p>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
