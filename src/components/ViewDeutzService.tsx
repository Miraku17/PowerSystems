"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/stores/authStore";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import { useResolveSignature } from "@/hooks/useSharedQueries";
import ConfirmationModal from "@/components/ConfirmationModal";

interface Attachment {
  id: string;
  file_url: string;
  file_title: string;
  created_at: string;
}

interface ViewDeutzServiceProps {
  data: Record<string, any>;
  onClose: () => void;
  onExportPDF?: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

export default function ViewDeutzService({ data, onClose, onExportPDF, onSignatoryChange }: ViewDeutzServiceProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [auditInfo, setAuditInfo] = useState<{
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
  }>({});
  const currentUser = useCurrentUser();
  const resolveSignature = useResolveSignature();
  const {
    notedByChecked,
    approvedByChecked,
    isLoading: approvalLoading,
    showConfirm,
    confirmTitle,
    confirmMessage,
    initCheckedState,
    requestToggle,
    cancelToggle,
    confirmToggle,
  } = useSignatoryApproval({ table: "deutz_service_report", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);

  useEffect(() => {
    const fetchAttachments = async () => {
      if (!data.id) return;

      try {
        const attachmentResponse = await apiClient.get('/forms/deutz-service/attachments', { params: { report_id: data.id } });
        setAttachments(attachmentResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      } finally {
        setLoadingAttachments(false);
      }
    };

    fetchAttachments();
  }, [data.id]);

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

  const Field = ({ label, value, className = "" }: { label: string; value: any; className?: string }) => (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <div className="text-sm text-gray-900 font-medium break-words">
        {value || "-"}
      </div>
    </div>
  );

  const TextField = ({ label, value, className = "" }: { label: string; value: any; className?: string }) => (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <div className="text-sm text-gray-900 font-medium whitespace-pre-wrap break-words">
        {value || "-"}
      </div>
    </div>
  );

  // Helper function to format UTC time to Philippine Time
  const formatToPHTime = (utcDateString: any) => {
    if (!utcDateString) {
      return 'N/A';
    }

    // Convert to string if it's not already
    const dateString = typeof utcDateString === 'string' ? utcDateString : String(utcDateString);

    try {
      // Check if the string already has timezone info (+00:00, -05:00, or Z)
      const hasTimezone = dateString.match(/[+-]\d{2}:\d{2}$/) || dateString.endsWith('Z');

      // Only append 'Z' if there's no timezone information
      const utcString = hasTimezone ? dateString : dateString + 'Z';
      const date = new Date(utcString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'Invalid Date';
      }

      // Add 8 hours for Philippine Time (UTC+8)
      const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));

      const month = String(phDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(phDate.getUTCDate()).padStart(2, '0');
      const year = phDate.getUTCFullYear();

      let hours = phDate.getUTCHours();
      const minutes = String(phDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(phDate.getUTCSeconds()).padStart(2, '0');

      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const hoursStr = String(hours).padStart(2, '0');

      return `${month}/${day}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'Error';
    }
  };

  const resolvedTechSig = resolveSignature(data.attending_technician_signature, data.service_technician);
  const resolvedApprovedSig = resolveSignature(data.approved_by_signature, data.approved_by);
  const resolvedNotedSig = resolveSignature(data.noted_by_signature, data.noted_by);
  const resolvedAcknowledgedSig = resolveSignature(data.acknowledged_by_signature, data.acknowledged_by);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Deutz Service Report</h3>
              {/* Audit Log */}
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

            <div className="space-y-8">
              {/* Section: Job Reference */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Job Reference</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Job Order No." value={data.job_order} />
                  <Field label="Date" value={data.report_date} />
                </div>
              </div>

              {/* Section 1: General Information */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">General Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Field label="Reporting Person" value={data.reporting_person_name} />
                  <Field label="Customer Name" value={data.customer_name} className="lg:col-span-2" />
                  <Field label="Contact Person" value={data.contact_person} />
                  <Field label="Address" value={data.address} className="lg:col-span-3" />
                  <Field label="Email Address" value={data.email_address} />
                  <Field label="Phone Number" value={data.phone_number} />
                  <Field label="Equipment Manufacturer" value={data.equipment_manufacturer} />
                </div>
              </div>

              {/* Section 2: Equipment & Engine Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Equipment & Engine Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Field label="Equipment Model" value={data.equipment_model} />
                  <Field label="Equipment Serial No." value={data.equipment_serial_no} />
                  <Field label="Engine Model" value={data.engine_model} />
                  <Field label="Engine Serial No." value={data.engine_serial_no} />
                  <Field label="Alternator Brand/Model" value={data.alternator_brand_model} />
                  <Field label="Alternator Serial No." value={data.alternator_serial_no} />
                </div>
              </div>

              {/* Section 3: Operational Data */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Operational Data</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Field label="Location" value={data.location} />
                  <Field label="Date in Service" value={data.date_in_service} />
                  <Field label="Date Failed" value={data.date_failed} />
                  <Field label="Rating" value={data.rating} />
                  <Field label="Revolution (RPM)" value={data.revolution} />
                  <Field label="Starting Voltage" value={data.starting_voltage} />
                  <Field label="Running Hours" value={data.running_hours} />
                  <Field label="Lube Oil Type" value={data.lube_oil_type} />
                  <Field label="Fuel Type" value={data.fuel_type} />
                  <Field label="Fuel Pump Code" value={data.fuel_pump_code} />
                  <Field label="Fuel Pump Serial No." value={data.fuel_pump_serial_no} />
                  <Field label="Cooling Water Additives" value={data.cooling_water_additives} className="lg:col-span-2" />
                  <Field label="Turbo Model" value={data.turbo_model} />
                  <Field label="Turbo Serial No." value={data.turbo_serial_no} />
                </div>
              </div>

              {/* Section 4: Customer Complaint */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Customer Complaint</h4>
                </div>
                <div>
                  <Field label="Customer Complaint" value={data.customer_complaint} />
                </div>
              </div>

              {/* Section 5: Possible Cause */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Possible Cause</h4>
                </div>
                <div>
                  <Field label="Possible Cause" value={data.possible_cause} />
                </div>
              </div>

              {/* Section 6: Warranty Coverage */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Coverage</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="Within Coverage Period?"
                    value={data.within_coverage_period === true || data.within_coverage_period === "true" || data.within_coverage_period === "Yes" ? "Yes" : "No"}
                  />
                  <Field
                    label="Warrantable Failure?"
                    value={data.warrantable_failure === true || data.warrantable_failure === "true" || data.warrantable_failure === "Yes" ? "Yes" : "No"}
                  />
                </div>
              </div>

              {/* Section 7: Service Report Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Service Report Details</h4>
                </div>
                <div className="space-y-6">
                  <TextField label="Summary Details" value={data.summary_details} />
                  <TextField label="Action Taken" value={data.action_taken} />
                  <TextField label="Observation" value={data.observation} />
                  <TextField label="Findings" value={data.findings} />
                  <TextField label="Recommendations" value={data.recommendations} />
                </div>
              </div>

              {/* Section: Attachments */}
              {!loadingAttachments && attachments.length > 0 && (
                <div>
                  <div className="flex items-center mb-4">
                    <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                    <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Image Attachments</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="relative aspect-video bg-gray-100">
                          <img
                            src={attachment.file_url}
                            alt={attachment.file_title || 'Attachment'}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {attachment.file_title && (
                          <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-900">{attachment.file_title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 8: Signatures */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {resolvedTechSig ? (
                             <img src={resolvedTechSig} alt="Technician Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Service Technician" value={data.service_technician} />
                    <p className="text-xs text-gray-400 mt-1 italic">Signed by Technician</p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {resolvedApprovedSig ? (
                             <img src={resolvedApprovedSig} alt="Approved By Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Approved By" value={data.approved_by} />
                    <p className="text-xs text-gray-400 mt-1 italic">Authorized Signature</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                      <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                    </label>
                  </div>
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {resolvedNotedSig ? (
                             <img src={resolvedNotedSig} alt="Noted By Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Noted By" value={data.noted_by} />
                    <p className="text-xs text-gray-400 mt-1 italic">Service Manager</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                      <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
                    </label>
                  </div>
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {resolvedAcknowledgedSig ? (
                             <img src={resolvedAcknowledgedSig} alt="Acknowledged By Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Acknowledged By" value={data.acknowledged_by} />
                    <p className="text-xs text-gray-400 mt-1 italic">Customer Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="flex items-center px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              Export PDF
            </button>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={cancelToggle}
        onConfirm={confirmToggle}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Yes, proceed"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}
