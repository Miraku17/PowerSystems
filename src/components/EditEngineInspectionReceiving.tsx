"use client";

import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { useSupabaseUpload } from "@/hooks/useSupabaseUpload";
import { useUploadLoadingStore } from "@/stores/uploadLoadingStore";
import { useCurrentUser } from "@/stores/authStore";
import { useUsers } from "@/hooks/useSharedQueries";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";
import { usePermissions } from "@/hooks/usePermissions";
import SignatorySelect from "./SignatorySelect";
import SignaturePad from "./SignaturePad";
import {
  SECTION_DEFINITIONS,
  type SectionDefinition,
  type SectionItem,
  type InspectionItemData,
} from "@/stores/engineInspectionReceivingFormStore";

interface EditEngineInspectionReceivingProps {
  data: any;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  description: string;
  created_at: string;
}

const Input = ({ label, name, value, disabled = false, onChange }: { label: string; name: string; value: any; disabled?: boolean; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type="text"
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      disabled={disabled}
      className={`w-full border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
    />
  </div>
);

const DateInput = ({ label, name, value, onChange }: { label: string; name: string; value: any; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type="date"
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    />
  </div>
);

const TextArea = ({ label, name, value, rows = 3, onChange }: { label: string; name: string; value: any; rows?: number; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      rows={rows}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
    />
  </div>
);

const SectionHeader = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <div className="flex items-center mb-4">
      <div className="w-1 h-6 bg-blue-600 mr-2"></div>
      <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">{title}</h4>
    </div>
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">{children}</div>
  </div>
);

export default function EditEngineInspectionReceiving({ data, recordId, onClose, onSaved, onSignatoryChange }: EditEngineInspectionReceivingProps) {
  const currentUser = useCurrentUser();
  const { data: users = [] } = useUsers();
  const { hasPermission } = usePermissions();
  const canEditServiceTechnician = hasPermission('service_report_signatory', 'service_technician');
  const canEditApprovedBy = hasPermission('service_report_signatory', 'approved_by');
  const canEditNotedBy = hasPermission('service_report_signatory', 'noted_by');
  const { uploadFiles } = useSupabaseUpload();
  const { showUploadLoading, hideUploadLoading } = useUploadLoadingStore();
  const [isSaving, setIsSaving] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; description: string }[]>([]);
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
  } = useSignatoryApproval({ table: "engine_inspection_receiving_report", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const response = await apiClient.get('/forms/engine-inspection-receiving/attachments', { params: { report_id: recordId } });
        setExistingAttachments(response.data.data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      }
    };
    fetchAttachments();
  }, [recordId]);

  // Initialize form state from data
  const [formState, setFormState] = useState(() => {
    // Build inspectionItems map from engine_inspection_items array
    const items: Record<string, InspectionItemData> = {};
    if (data.engine_inspection_items && Array.isArray(data.engine_inspection_items)) {
      for (const item of data.engine_inspection_items) {
        items[item.item_key] = {
          field_status: item.field_status || '',
          field_remarks: item.field_remarks || '',
          shop_status: item.shop_status || '',
          shop_remarks: item.shop_remarks || '',
        };
      }
    }

    return {
      customer: data.customer || '',
      jo_date: data.jo_date || '',
      jo_number: data.jo_number || '',
      address: data.address || '',
      err_no: data.err_no || '',
      engine_maker: data.engine_maker || '',
      application: data.application || '',
      engine_model: data.engine_model || '',
      engine_serial_number: data.engine_serial_number || '',
      date_received: data.date_received || '',
      date_inspected: data.date_inspected || '',
      engine_rpm: data.engine_rpm || '',
      engine_kw: data.engine_kw || '',
      modification_of_engine: data.modification_of_engine || '',
      missing_parts: data.missing_parts || '',
      service_technician_name: data.service_technician_name || '',
      service_technician_signature: data.service_technician_signature || '',
      noted_by_name: data.noted_by_name || '',
      noted_by_signature: data.noted_by_signature || '',
      approved_by_name: data.approved_by_name || '',
      approved_by_signature: data.approved_by_signature || '',
      acknowledged_by_name: data.acknowledged_by_name || '',
      acknowledged_by_signature: data.acknowledged_by_signature || '',
      inspectionItems: items,
    };
  });

  const handleFieldChange = (name: string, value: any) => {
    const updates: Record<string, any> = { [name]: value };
    if (name === 'noted_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'approved_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const handleInspectionItemChange = (itemKey: string, field: keyof InspectionItemData, value: string) => {
    setFormState((prev) => ({
      ...prev,
      inspectionItems: {
        ...prev.inspectionItems,
        [itemKey]: {
          ...(prev.inspectionItems[itemKey] || { field_status: '', field_remarks: '', shop_status: '', shop_remarks: '' }),
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!formState.jo_number || formState.jo_number.trim() === '') {
      toast.error('JO Number is required');
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');

    try {
      await apiClient.patch(`/forms/engine-inspection-receiving?id=${recordId}`, formState);

      // Save attachments
      if (newAttachments.length > 0 || attachmentsToDelete.length > 0 || existingAttachments.length > 0) {
        showUploadLoading();
        try {
          let uploadedNewAttachments: any[] = [];
          if (newAttachments.length > 0) {
            const results = await uploadFiles(
              newAttachments.map(a => a.file),
              { bucket: 'service-reports', pathPrefix: 'engine-inspection-receiving' }
            );
            uploadedNewAttachments = results
              .filter(r => r.success && r.url)
              .map((r, i) => ({
                url: r.url,
                title: newAttachments[i]?.description || '',
                fileName: r.fileName,
                fileType: newAttachments[i]?.file.type,
                fileSize: newAttachments[i]?.file.size,
              }));
          }
          await apiClient.post('/forms/engine-inspection-receiving/attachments', {
            report_id: recordId,
            attachments_to_delete: attachmentsToDelete,
            existing_attachments: existingAttachments,
            uploaded_new_attachments: uploadedNewAttachments,
          });
        } catch (error) {
          console.error('Error saving attachments:', error);
        } finally {
          hideUploadLoading();
        }
      }

      toast.success('Report updated successfully!', { id: loadingToast });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      const errMsg = error.response?.data?.error;
      const errorMessage = typeof errMsg === 'string' ? errMsg : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : (error.message || 'Failed to save changes.'));
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const renderItemRow = (item: SectionItem) => {
    const itemData = formState.inspectionItems[item.item_key] || { field_status: '', field_remarks: '', shop_status: '', shop_remarks: '' };

    return (
      <tr key={item.item_key} className="border-b border-gray-200 hover:bg-gray-50/50">
        <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">
          {item.label}
        </td>
        {/* FIELD: S */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`edit_field_status_${item.item_key}`}
            checked={itemData.field_status === 's'}
            onChange={() => handleInspectionItemChange(item.item_key, 'field_status', 's')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
        </td>
        {/* FIELD: NS */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`edit_field_status_${item.item_key}`}
            checked={itemData.field_status === 'ns'}
            onChange={() => handleInspectionItemChange(item.item_key, 'field_status', 'ns')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
        </td>
        {/* FIELD: Remarks */}
        <td className="px-2 py-2 border-r border-gray-200">
          <input
            type="text"
            value={itemData.field_remarks}
            onChange={(e) => handleInspectionItemChange(item.item_key, 'field_remarks', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Remarks"
          />
        </td>
        {/* SHOP: S */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`edit_shop_status_${item.item_key}`}
            checked={itemData.shop_status === 's'}
            onChange={() => handleInspectionItemChange(item.item_key, 'shop_status', 's')}
            className="w-4 h-4 text-green-600 focus:ring-green-500"
          />
        </td>
        {/* SHOP: NS */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`edit_shop_status_${item.item_key}`}
            checked={itemData.shop_status === 'ns'}
            onChange={() => handleInspectionItemChange(item.item_key, 'shop_status', 'ns')}
            className="w-4 h-4 text-green-600 focus:ring-green-500"
          />
        </td>
        {/* SHOP: Remarks */}
        <td className="px-2 py-2">
          <input
            type="text"
            value={itemData.shop_remarks}
            onChange={(e) => handleInspectionItemChange(item.item_key, 'shop_remarks', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Remarks"
          />
        </td>
      </tr>
    );
  };

  const renderSectionTable = (sectionDef: SectionDefinition) => {
    return (
      <div key={sectionDef.sectionKey} className="mb-6">
        <h4 className="text-sm font-bold text-gray-700 mb-2">
          {sectionDef.section}. {sectionDef.title}
        </h4>
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase border-r border-gray-300 w-[30%]">Item Description</th>
                <th colSpan={3} className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase border-r border-gray-300 w-[35%]">FIELD</th>
                <th colSpan={3} className="px-3 py-2 text-center text-xs font-bold text-green-700 uppercase w-[35%]">SHOP</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-3 py-1 border-r border-gray-300"></th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 w-[5%]">S</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 w-[5%]">NS</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-300 w-[25%]">REMARKS</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 w-[5%]">S</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 w-[5%]">NS</th>
                <th className="px-2 py-1 text-center text-xs font-semibold text-gray-500 w-[25%]">REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {sectionDef.subSections
                ? sectionDef.subSections.map((sub) => (
                    <React.Fragment key={sub.label || 'general'}>
                      {sub.label && (
                        <tr className="bg-blue-50">
                          <td colSpan={7} className="px-3 py-2 text-sm font-semibold text-blue-800">
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
            <h3 className="text-xl font-bold text-gray-900">Edit Engine Inspection / Receiving Report</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto space-y-6">

            {/* Header Information */}
            <SectionHeader title="Header Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Customer" name="customer" value={formState.customer} onChange={handleFieldChange} />
                <DateInput label="JO Date" name="jo_date" value={formState.jo_date} onChange={handleFieldChange} />
                <Input label="JO Number *" name="jo_number" value={formState.jo_number} onChange={handleFieldChange} disabled />
                <Input label="Address" name="address" value={formState.address} onChange={handleFieldChange} />
                <Input label="ERR No." name="err_no" value={formState.err_no} onChange={handleFieldChange} />
              </div>
            </SectionHeader>

            {/* Engine Details */}
            <SectionHeader title="Engine Details">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input label="Engine Maker" name="engine_maker" value={formState.engine_maker} onChange={handleFieldChange} />
                <Input label="Application" name="application" value={formState.application} onChange={handleFieldChange} />
                <Input label="Engine Model" name="engine_model" value={formState.engine_model} onChange={handleFieldChange} />
                <Input label="Engine Serial Number" name="engine_serial_number" value={formState.engine_serial_number} onChange={handleFieldChange} />
                <DateInput label="Date Received" name="date_received" value={formState.date_received} onChange={handleFieldChange} />
                <DateInput label="Date Inspected" name="date_inspected" value={formState.date_inspected} onChange={handleFieldChange} />
                <Input label="Engine RPM" name="engine_rpm" value={formState.engine_rpm} onChange={handleFieldChange} />
                <Input label="Engine KW" name="engine_kw" value={formState.engine_kw} onChange={handleFieldChange} />
              </div>
            </SectionHeader>

            {/* Inspection Items */}
            <SectionHeader title="Inspection Items">
              {SECTION_DEFINITIONS.map(renderSectionTable)}
            </SectionHeader>

            {/* Modification of Engine */}
            <SectionHeader title="XII. Modification of the Engine">
              <TextArea
                label="Details"
                name="modification_of_engine"
                value={formState.modification_of_engine}
                rows={4}
                onChange={handleFieldChange}
              />
            </SectionHeader>

            {/* Missing Parts */}
            <SectionHeader title="XIII. Missing Parts">
              <TextArea
                label="Details"
                name="missing_parts"
                value={formState.missing_parts}
                rows={4}
                onChange={handleFieldChange}
              />
            </SectionHeader>

            {/* Signatures */}
            <SectionHeader title="Signatures">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <SignatorySelect
                    label="Service Technician"
                    name="service_technician_name"
                    value={formState.service_technician_name}
                    signatureValue={formState.service_technician_signature}
                    onChange={handleFieldChange}
                    onSignatureChange={(sig) => handleFieldChange("service_technician_signature", sig)}
                    users={users}
                    subtitle="Signed by Technician"
                    showAllUsers
                    disabled={!canEditServiceTechnician}
                   autoFillForPositions={["User 1", "User 2"]}
                   lockIfDifferentUser/>
                </div>

                <div className="space-y-4">
                  <SignatorySelect
                    label="Approved By"
                    name="approved_by_name"
                    value={formState.approved_by_name}
                    signatureValue={formState.approved_by_signature}
                    onChange={handleFieldChange}
                    onSignatureChange={(sig) => handleFieldChange("approved_by_signature", sig)}
                    users={users}
                    subtitle="Authorized Signature"
                    disabled={!canEditApprovedBy}
                    lockIfDifferentUser
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <SignatorySelect
                    label="Noted By"
                    name="noted_by_name"
                    value={formState.noted_by_name}
                    signatureValue={formState.noted_by_signature}
                    onChange={handleFieldChange}
                    onSignatureChange={(sig) => handleFieldChange("noted_by_signature", sig)}
                    users={users}
                    subtitle="Service Manager"
                    disabled={!canEditNotedBy}
                    lockIfDifferentUser
                  />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                    <span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <SignatorySelect
                    label="Acknowledged By"
                    name="acknowledged_by_name"
                    value={formState.acknowledged_by_name}
                    onChange={handleFieldChange}
                    onSignatureChange={() => {}}
                    users={users}
                    showAllUsers
                    hideSignature
                  allowTyping
                  lockIfDifferentUser
                  />
                  <SignaturePad
                    label="Acknowledged By Signature"
                    value={formState.acknowledged_by_signature}
                    onChange={(sig) => handleFieldChange("acknowledged_by_signature", sig)}
                    subtitle="Customer Signature"
                  />
                </div>
              </div>
            </SectionHeader>

            {/* Attachments */}
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200 uppercase">Attachments</h3>
              <span className="text-xs text-gray-400 mb-3 block">(max 20 photos only)</span>

              {existingAttachments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {existingAttachments.map((attachment) => {
                    const isImage = attachment.file_type?.startsWith('image/') || attachment.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    return (
                      <div key={attachment.id} className="px-4 py-3 border-2 border-gray-200 rounded-md bg-white shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {isImage ? (
                              <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                                <img src={attachment.file_url} alt={attachment.file_name} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200" />
                              </a>
                            ) : (
                              <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" className="w-24 h-24 bg-gray-100 rounded-md border-2 border-gray-200 flex items-center justify-center">
                                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </a>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">{attachment.file_name}</p>
                              <button type="button" onClick={() => { setAttachmentsToDelete([...attachmentsToDelete, attachment.id]); setExistingAttachments(existingAttachments.filter(a => a.id !== attachment.id)); }} className="ml-4 text-red-600 hover:text-red-800 flex-shrink-0">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <input type="text" placeholder="Enter description" value={attachment.description || ''} onChange={(e) => setExistingAttachments(existingAttachments.map(a => a.id === attachment.id ? { ...a, description: e.target.value } : a))} className="mt-2 w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {newAttachments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {newAttachments.map((attachment, index) => {
                    const isImage = attachment.file.type.startsWith('image/');
                    const previewUrl = isImage ? URL.createObjectURL(attachment.file) : null;
                    return (
                      <div key={index} className="px-4 py-3 border-2 border-blue-200 rounded-md bg-blue-50 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {isImage && previewUrl ? (
                              <img src={previewUrl} alt={attachment.file.name} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200" onLoad={() => URL.revokeObjectURL(previewUrl)} />
                            ) : (
                              <div className="w-24 h-24 bg-gray-100 rounded-md border-2 border-gray-200 flex items-center justify-center">
                                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div><p className="text-sm font-medium text-gray-900 truncate">{attachment.file.name}</p><p className="text-xs text-gray-500">{(attachment.file.size / 1024).toFixed(2)} KB · New</p></div>
                              <button type="button" onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== index))} className="ml-4 text-red-600 hover:text-red-800 flex-shrink-0">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <input type="text" placeholder="Enter description" value={attachment.description} onChange={(e) => { const updated = [...newAttachments]; updated[index].description = e.target.value; setNewAttachments(updated); }} className="mt-2 w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="edit-file-upload-engine-inspection" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Upload a file</span>
                      <input id="edit-file-upload-engine-inspection" type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={async (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const files = Array.from(e.target.files);
                          const totalCount = existingAttachments.length + newAttachments.length + files.length;
                          if (totalCount > 20) { toast.error('Maximum 20 files allowed'); e.target.value = ''; return; }
                          const processed = [];
                          for (const file of files) {
                            const isImg = file.type.startsWith('image/');
                            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                            if (!isImg && !isPdf) { toast.error('Only images or PDFs are allowed'); continue; }
                            const final = isImg ? await compressImageIfNeeded(file) : file;
                            processed.push({ file: final, description: '' });
                          }
                          if (processed.length > 0) setNewAttachments([...newAttachments, ...processed]);
                          e.target.value = '';
                        }
                      }} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className={`text-xs ${(existingAttachments.length + newAttachments.length) >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>PNG, JPG, GIF, PDF up to 10MB ({existingAttachments.length + newAttachments.length}/20 files)</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
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

