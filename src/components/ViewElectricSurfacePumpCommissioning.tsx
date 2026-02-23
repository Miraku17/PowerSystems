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

interface ViewElectricSurfacePumpCommissioningProps {
  data: Record<string, any>;
  onClose: () => void;
  onExportPDF?: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export default function ViewElectricSurfacePumpCommissioning({ data, onClose, onExportPDF, onSignatoryChange }: ViewElectricSurfacePumpCommissioningProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [auditInfo, setAuditInfo] = useState<{
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
  }>({});
  const currentUser = useCurrentUser();
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
  } = useSignatoryApproval({ table: "electric_surface_pump_commissioning_report", recordId: data.id, onChanged: onSignatoryChange });
  const resolveSignature = useResolveSignature();

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const attachmentResponse = await apiClient.get('/forms/electric-surface-pump-commissioning/attachments', { params: { report_id: data.id } });
        setAttachments(attachmentResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };

    if (data.id) {
      fetchAttachments();
    }
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

  // Helper function to format UTC time to Philippine Time
  const formatToPHTime = (utcDateString: any) => {
    if (!utcDateString) {
      return 'N/A';
    }

    const dateString = typeof utcDateString === 'string' ? utcDateString : String(utcDateString);

    try {
      const hasTimezone = dateString.match(/[+-]\d{2}:\d{2}$/) || dateString.endsWith('Z');
      const utcString = hasTimezone ? dateString : dateString + 'Z';
      const date = new Date(utcString);

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
      hours = hours ? hours : 12;
      const hoursStr = String(hours).padStart(2, '0');

      return `${month}/${day}/${year}, ${hoursStr}:${minutes}:${seconds} ${ampm}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'Error';
    }
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const resolvedCommissionedBySig = resolveSignature(data.commissioned_by_signature, data.commissioned_by_name);
  const resolvedCheckedApprovedBySig = resolveSignature(data.checked_approved_by_signature, data.checked_approved_by_name);
  const resolvedNotedBySig = resolveSignature(data.noted_by_signature, data.noted_by_name);
  const resolvedAcknowledgedBySig = resolveSignature(data.acknowledged_by_signature, data.acknowledged_by_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Electric Driven Surface Pump Commissioning Report</h3>
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
                  NAVOTAS * BACOLOD * CEBU * CAGAYAN * DAVAO * GEN SAN * ZAMBOANGA * ILO-ILO * SURIGAO
                </p>
              </div>
              <div className="mt-6">
                <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
                  Commissioning Report
                </h2>
                <p className="text-sm text-gray-600 mt-2">(Electric Driven Surface Pump)</p>
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
                  <Field label="Job Order" value={data.job_order} />
                  <Field label="J.O Date" value={formatDate(data.jo_date)} />
                </div>
              </div>

              {/* Section: Basic Information */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Basic Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Field label="Reporting Person" value={data.reporting_person_name} />
                  <Field label="Contact Number" value={data.reporting_person_contact} />
                  <Field label="Equipment Manufacturer" value={data.equipment_manufacturer} />
                  <Field label="Commissioning Date" value={formatDate(data.commissioning_date)} />
                  <div className="lg:col-span-2">
                    <Field label="Customer" value={data.customer} />
                  </div>
                  <Field label="Contact Person" value={data.contact_person} />
                  <Field label="Email/Contact" value={data.email_or_contact} />
                  <div className="lg:col-span-4">
                    <Field label="Address" value={data.address} />
                  </div>
                </div>
              </div>

              {/* Section: Pump Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Pump Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <Field label="Pump Maker" value={data.pump_maker} />
                  <Field label="Pump Type" value={data.pump_type} />
                  <Field label="Impeller Material" value={data.impeller_material} />
                  <Field label="Pump Model" value={data.pump_model} />
                  <Field label="Pump Serial Number" value={data.pump_serial_number} />
                  <Field label="RPM" value={data.pump_rpm} />
                  <Field label="Product Number" value={data.product_number} />
                  <Field label="HMAX (Head)" value={data.hmax_head} />
                  <Field label="QMAX (Flow)" value={data.qmax_flow} />
                  <Field label="Suction Size" value={data.suction_size} />
                  <Field label="Suction Connection" value={data.suction_connection} />
                  <Field label="Suction Strainer P.N" value={data.suction_strainer_pn} />
                  <Field label="Discharge Size" value={data.discharge_size} />
                  <Field label="Discharge Connection" value={data.discharge_connection} />
                  <Field label="Configuration" value={data.configuration} />
                </div>
              </div>

              {/* Section: Electric Motor Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Electric Motor Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  <Field label="Maker" value={data.motor_maker} />
                  <Field label="Model" value={data.motor_model} />
                  <Field label="HP" value={data.motor_hp} />
                  <Field label="Phase" value={data.motor_phase} />
                  <Field label="RPM" value={data.motor_rpm} />
                  <Field label="Voltage" value={data.motor_voltage} />
                  <Field label="Frequency" value={data.motor_frequency} />
                  <Field label="Amps" value={data.motor_amps} />
                  <Field label="Max Amb Temperature" value={data.motor_max_amb_temperature} />
                  <Field label="Insulation Class" value={data.motor_insulation_class} />
                  <Field label="No. of Leads" value={data.motor_no_of_leads} />
                </div>
              </div>

              {/* Section: Installation Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Installation Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  <Field label="Location" value={data.location} />
                  <Field label="Static Head" value={data.static_head} />
                  <Field label="Suction Pipe Size" value={data.suction_pipe_size} />
                  <Field label="Suction Pipe Length" value={data.suction_pipe_length} />
                  <Field label="Suction Pipe Type" value={data.suction_pipe_type} />
                  <Field label="Discharge Pipe Size" value={data.discharge_pipe_size} />
                  <Field label="Discharge Pipe Length" value={data.discharge_pipe_length} />
                  <Field label="Discharge Pipe Type" value={data.discharge_pipe_type} />
                  <Field label="Check Valve Size/Type" value={data.check_valve_size_type} />
                  <Field label="No. of Elbows/Size" value={data.no_of_elbows_size} />
                  <Field label="Media to be Pump" value={data.media_to_be_pump} />
                </div>
              </div>

              {/* Section: Operational Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Operational Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Field label="RPM" value={data.actual_rpm} />
                  <Field label="Voltage" value={data.actual_voltage} />
                  <Field label="Amps" value={data.actual_amps} />
                  <Field label="Frequency" value={data.actual_frequency} />
                  <Field label="Motor Temperature" value={data.motor_temperature} />
                  <Field label="Amb Temperature" value={data.amb_temperature} />
                  <Field label="Discharge Pressure" value={data.discharge_pressure} />
                  <Field label="Discharge Flow" value={data.discharge_flow} />
                  <Field label="Test Duration" value={data.test_duration} />
                </div>
              </div>

              {/* Image Attachments */}
              {attachments.length > 0 && (
                <div>
                  <div className="flex items-center mb-4">
                    <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                    <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Image Attachments</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <div className="aspect-video bg-gray-100 relative">
                          <img
                            src={attachment.file_url}
                            alt={attachment.file_name || 'Attachment'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {attachment.file_name && (
                          <div className="p-3 bg-white">
                            <p className="text-sm font-medium text-gray-900">{attachment.file_name}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Signatures */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {resolvedCommissionedBySig ? (
                        <img src={resolvedCommissionedBySig} alt="Service Technician Signature" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                      )}
                    </div>
                    <Field label="Service Technician" value={data.commissioned_by_name} />
                    <p className="text-xs text-gray-400 mt-1 italic">Svc Engineer/Technician</p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {resolvedCheckedApprovedBySig ? (
                        <img src={resolvedCheckedApprovedBySig} alt="Checked & Approved By Signature" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                      )}
                    </div>
                    <Field label="Checked & Approved By" value={data.checked_approved_by_name} />
                    <p className="text-xs text-gray-400 mt-1 italic">Svc. Supvr. / Supt.</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                      <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                    </label>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {resolvedNotedBySig ? (
                        <img src={resolvedNotedBySig} alt="Noted By Signature" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                      )}
                    </div>
                    <Field label="Noted By" value={data.noted_by_name} />
                    <p className="text-xs text-gray-400 mt-1 italic">Svc. Manager</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                      <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
                    </label>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {resolvedAcknowledgedBySig ? (
                        <img src={resolvedAcknowledgedBySig} alt="Acknowledged By Signature" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                      )}
                    </div>
                    <Field label="Acknowledged By" value={data.acknowledged_by_name} />
                    <p className="text-xs text-gray-400 mt-1 italic">Customer Representative</p>
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
