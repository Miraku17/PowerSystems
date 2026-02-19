"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/stores/authStore";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";

interface ViewSubmersiblePumpTeardownProps {
  data: Record<string, any>;
  onClose: () => void;
  onExportPDF?: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  attachment_category: string;
  created_at: string;
}

export default function ViewSubmersiblePumpTeardown({ data, onClose, onExportPDF, onSignatoryChange }: ViewSubmersiblePumpTeardownProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [auditInfo, setAuditInfo] = useState<{
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
  }>({});
  const currentUser = useCurrentUser();
  const { hasPermission } = usePermissions();
  const canApproveSignatory = hasPermission("signatory_approval", "approve");
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
  } = useSignatoryApproval({ table: "submersible_pump_teardown_report", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const { data: attachmentsData, error } = await supabase
          .from('submersible_pump_teardown_attachments')
          .select('*')
          .eq('report_id', data.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching attachments:', error);
        } else {
          setAttachments(attachmentsData || []);
        }
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
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const formatBoolean = (value: boolean | null) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '-';
  };

  const preTeardownAttachments = attachments.filter(a => a.attachment_category === 'pre_teardown');
  const wetEndAttachments = attachments.filter(a => a.attachment_category === 'wet_end');
  const motorAttachments = attachments.filter(a => a.attachment_category === 'motor');

  const renderAttachments = (attachmentList: Attachment[], title: string) => {
    if (attachmentList.length === 0) return null;
    return (
      <div>
        <div className="flex items-center mb-4">
          <div className="w-1 h-6 bg-blue-600 mr-2"></div>
          <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">{title}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachmentList.map((attachment) => (
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
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Submersible Pump Teardown Report</h3>
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
                  Teardown Report
                </h2>
                <p className="text-sm text-gray-600 mt-2">(Submersible Pump)</p>
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
                  <div></div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  <Field label="Pump Model" value={data.pump_model} />
                  <Field label="Serial Number" value={data.serial_number} />
                  <Field label="Part Number" value={data.part_number} />
                  <div></div>
                  <Field label="KW Rating P1" value={data.kw_rating_p1} />
                  <Field label="KW Rating P2" value={data.kw_rating_p2} />
                  <Field label="Voltage" value={data.voltage} />
                  <Field label="Phase" value={data.phase} />
                  <Field label="Frequency" value={data.frequency} />
                  <Field label="RPM" value={data.rpm} />
                  <Field label="HMAX (Head)" value={data.hmax_head} />
                  <Field label="QMAX (Flow)" value={data.qmax_flow} />
                  <Field label="TMAX" value={data.tmax} />
                  <Field label="Running Hrs" value={data.running_hrs} />
                  <Field label="Date of Failure" value={formatDate(data.date_of_failure)} />
                  <Field label="Teardown Date" value={formatDate(data.teardown_date)} />
                  <div className="lg:col-span-4">
                    <Field label="Reason for Teardown" value={data.reason_for_teardown} />
                  </div>
                </div>
              </div>

              {/* Section: Warranty Coverage */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Coverage</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Is the unit within the coverage?" value={formatBoolean(data.is_within_warranty)} />
                  <Field label="Is this a warrantable failure?" value={formatBoolean(data.is_warrantable_failure)} />
                </div>
              </div>

              {/* Section: External Condition Before Teardown */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">External Condition Before Teardown</h4>
                </div>
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
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">1</td><td className="py-2 px-3">Discharge</td><td className="py-2 px-3">{data.ext_discharge_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">2</td><td className="py-2 px-3">Power cable</td><td className="py-2 px-3">{data.ext_power_cable_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">3</td><td className="py-2 px-3">Signal cable</td><td className="py-2 px-3">{data.ext_signal_cable_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">4</td><td className="py-2 px-3">Lifting eye</td><td className="py-2 px-3">{data.ext_lifting_eye_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">5</td><td className="py-2 px-3">Terminal Cover</td><td className="py-2 px-3">{data.ext_terminal_cover_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">6</td><td className="py-2 px-3">Outer casing</td><td className="py-2 px-3">{data.ext_outer_casing_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">7</td><td className="py-2 px-3">Oil plug</td><td className="py-2 px-3">{data.ext_oil_plug_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">8</td><td className="py-2 px-3">Strainer</td><td className="py-2 px-3">{data.ext_strainer_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">9</td><td className="py-2 px-3">Motor inspection plug</td><td className="py-2 px-3">{data.ext_motor_inspection_plug_findings || '-'}</td></tr>
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

              {/* Pre-Teardown Photos */}
              {renderAttachments(preTeardownAttachments, "Pre-Teardown Photos")}

              {/* Section: Components Condition During Teardown */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Components Condition During Teardown</h4>
                </div>
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
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">1</td><td className="py-2 px-3">Discharge Unit</td><td className="py-2 px-3">{data.comp_discharge_unit_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">2</td><td className="py-2 px-3">Cable unit</td><td className="py-2 px-3">{data.comp_cable_unit_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">3</td><td className="py-2 px-3">Top housing unit</td><td className="py-2 px-3">{data.comp_top_housing_unit_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">4</td><td className="py-2 px-3">Starter unit</td><td className="py-2 px-3">{data.comp_starter_unit_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">5</td><td className="py-2 px-3">Motor unit</td><td className="py-2 px-3">{data.comp_motor_unit_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">6</td><td className="py-2 px-3">Shaft rotor unit</td><td className="py-2 px-3">{data.comp_shaft_rotor_unit_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">7</td><td className="py-2 px-3">Seal unit</td><td className="py-2 px-3">{data.comp_seal_unit_findings || '-'}</td></tr>
                        <tr className="border-b border-gray-200"><td className="py-2 px-3">8</td><td className="py-2 px-3">Wet end unit</td><td className="py-2 px-3">{data.comp_wet_end_unit_findings || '-'}</td></tr>
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
                {data.teardown_comments && (
                  <div className="mt-4">
                    <Field label="Comments" value={data.teardown_comments} />
                  </div>
                )}
              </div>

              {/* Wet End Teardown Photos */}
              {renderAttachments(wetEndAttachments, "Wet End Teardown Photos")}

              {/* Section: Motor Condition */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Motor Condition</h4>
                </div>
                <div className="space-y-6">
                  {/* Stator Winding Resistance */}
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase mb-3">Stator Winding Resistance</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Field label="L1 - L2" value={data.stator_l1_l2} />
                        <Field label="L1 - L3" value={data.stator_l1_l3} />
                        <Field label="L2 - L3" value={data.stator_l2_l3} />
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
                  <div>
                    <h5 className="text-xs font-bold text-gray-700 uppercase mb-3">Insulation Resistance</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Field label="U1 - Ground" value={data.insulation_u1_ground} />
                        <Field label="U2 - Ground" value={data.insulation_u2_ground} />
                        <Field label="V1 - Ground" value={data.insulation_v1_ground} />
                        <Field label="V2 - Ground" value={data.insulation_v2_ground} />
                        <Field label="W1 - Ground" value={data.insulation_w1_ground} />
                        <Field label="W2 - Ground" value={data.insulation_w2_ground} />
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
                  {data.motor_comments && (
                    <div>
                      <Field label="Comments" value={data.motor_comments} />
                    </div>
                  )}
                </div>
              </div>

              {/* Motor Teardown Photos */}
              {renderAttachments(motorAttachments, "Motor Teardown Photos")}

              {/* Section: Signatures */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {data.teardowned_by_signature ? (
                        <img src={data.teardowned_by_signature} alt="Service Technician Signature" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                      )}
                    </div>
                    <Field label="Service Technician" value={data.teardowned_by_name} />
                    <p className="text-xs text-gray-400 mt-1 italic">Svc Engineer/Technician</p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {data.checked_approved_by_signature ? (
                        <img src={data.checked_approved_by_signature} alt="Checked & Approved By Signature" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                      )}
                    </div>
                    <Field label="Checked & Approved By" value={data.checked_approved_by_name} />
                    <p className="text-xs text-gray-400 mt-1 italic">Svc. Supvr. / Supt.</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                      <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                    </label>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {data.noted_by_signature ? (
                        <img src={data.noted_by_signature} alt="Noted By Signature" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                      )}
                    </div>
                    <Field label="Noted By" value={data.noted_by_name} />
                    <p className="text-xs text-gray-400 mt-1 italic">Svc. Manager</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (!canApproveSignatory && currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                      <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
                    </label>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                      {data.acknowledged_by_signature ? (
                        <img src={data.acknowledged_by_signature} alt="Acknowledged By Signature" className="max-h-20 max-w-full object-contain" />
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
