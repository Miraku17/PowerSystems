"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import SignatorySelect from './SignatorySelect';
import SignaturePad from './SignaturePad';
import ConfirmationModal from './ConfirmationModal';
import ReportHeader from './ReportHeader';
import {
  useEngineInspectionReceivingFormStore,
  SECTION_DEFINITIONS,
  type SectionDefinition,
  type SectionItem,
} from '@/stores/engineInspectionReceivingFormStore';
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import { useUploadLoadingStore } from '@/stores/uploadLoadingStore';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useUsers, useCustomers } from '@/hooks/useSharedQueries';
import { usePermissions } from '@/hooks/usePermissions';

const Input = ({ label, name, value, onChange, type = "text" }: { label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void; type?: string; }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm" placeholder={`Enter ${label.toLowerCase()}`} />
  </div>
);

export default function EngineInspectionReceivingForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, setInspectionItem, resetFormData } = useEngineInspectionReceivingFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();
  const { uploadFiles } = useSupabaseUpload();
  const { showUploadLoading, hideUploadLoading } = useUploadLoadingStore();

  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);
  const { data: users = [] } = useUsers();

  const { data: customers = [] } = useCustomers();

  const { hasPermission } = usePermissions();
  const canEditServiceTechnician = hasPermission('service_report_signatory', 'service_technician');
  const canEditApprovedBy = hasPermission('service_report_signatory', 'approved_by');
  const canEditNotedBy = hasPermission('service_report_signatory', 'noted_by');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updates: Record<string, any> = { [name]: value };

    if (name === 'noted_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'approved_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }

    setFormData(updates);
  };

  const handleSignatoryChange = (name: string, value: string) => {
    const updates: Record<string, any> = { [name]: value };
    if (name === 'noted_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'approved_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }
    setFormData(updates);
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    try {
      // Prepare form data with inspection items as JSON string
      const submissionData: Record<string, unknown> = { ...formData };
      submissionData.inspectionItems = JSON.stringify(formData.inspectionItems);

      // Upload attachments if any
      const uploadedData: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }> = [];

      if (attachments.length > 0) {
        showUploadLoading('Uploading images...');
        const results = await uploadFiles(
          attachments.map(a => a.file),
          { bucket: 'service-reports', pathPrefix: 'engine-inspection-receiving' }
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

      submissionData.uploaded_attachments = JSON.stringify(uploadedData);

      await submit({
        formType: 'engine-inspection-receiving',
        formData: submissionData,
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

    if (!formData.jo_number || formData.jo_number.trim() === '') {
      toast.error('JO Number is required');
      return;
    }

    setIsModalOpen(true);
  };

  // --- Helper: Render inspection items table for a section ---
  const renderItemRow = (item: SectionItem) => {
    const data = formData.inspectionItems[item.item_key] || { field_status: '', field_remarks: '', shop_status: '', shop_remarks: '' };

    return (
      <tr key={item.item_key} className="border-b border-gray-200 hover:bg-gray-50/50">
        <td className="px-3 py-2 text-sm text-gray-700 border-r border-gray-200">
          {item.label}
        </td>
        {/* FIELD: S */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`field_status_${item.item_key}`}
            checked={data.field_status === 's'}
            onChange={() => setInspectionItem(item.item_key, 'field_status', 's')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
        </td>
        {/* FIELD: NS */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`field_status_${item.item_key}`}
            checked={data.field_status === 'ns'}
            onChange={() => setInspectionItem(item.item_key, 'field_status', 'ns')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
        </td>
        {/* FIELD: Remarks */}
        <td className="px-2 py-2 border-r border-gray-200">
          <input
            type="text"
            value={data.field_remarks}
            onChange={(e) => setInspectionItem(item.item_key, 'field_remarks', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Remarks"
          />
        </td>
        {/* SHOP: S */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`shop_status_${item.item_key}`}
            checked={data.shop_status === 's'}
            onChange={() => setInspectionItem(item.item_key, 'shop_status', 's')}
            className="w-4 h-4 text-green-600 focus:ring-green-500"
          />
        </td>
        {/* SHOP: NS */}
        <td className="px-2 py-2 text-center border-r border-gray-200">
          <input
            type="radio"
            name={`shop_status_${item.item_key}`}
            checked={data.shop_status === 'ns'}
            onChange={() => setInspectionItem(item.item_key, 'shop_status', 'ns')}
            className="w-4 h-4 text-green-600 focus:ring-green-500"
          />
        </td>
        {/* SHOP: Remarks */}
        <td className="px-2 py-2">
          <input
            type="text"
            value={data.shop_remarks}
            onChange={(e) => setInspectionItem(item.item_key, 'shop_remarks', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Remarks"
          />
        </td>
      </tr>
    );
  };

  const renderSectionTable = (sectionDef: SectionDefinition) => {
    return (
      <div key={sectionDef.sectionKey} className="mb-8">
        {/* Section Header */}
        <div className="flex items-center mb-3">
          <div className="w-1 h-6 bg-blue-600 mr-2"></div>
          <h3 className="text-base font-bold text-gray-800 uppercase">
            {sectionDef.section}. {sectionDef.title}
          </h3>
        </div>

        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase border-r border-gray-300 w-[30%]">
                  Item Description
                </th>
                <th colSpan={3} className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase border-r border-gray-300 w-[35%]">
                  FIELD
                </th>
                <th colSpan={3} className="px-3 py-2 text-center text-xs font-bold text-green-700 uppercase w-[35%]">
                  SHOP
                </th>
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
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Company Header */}
      <ReportHeader title="Engine Inspection / Receiving Report" />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Header Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Customer</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">JO Date</label>
              <input
                type="date"
                name="jo_date"
                value={formData.jo_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <JobOrderAutocomplete
                label="JO Number"
                value={formData.jo_number}
                onChange={(value) => setFormData({ jo_number: value, customer: "", address: "" })}
                onSelect={(jo) => setFormData({
                  jo_number: jo.shop_field_jo_number || "",
                  customer: jo.full_customer_name || "",
                  address: jo.address || "",
                  // Spec #14: auto-populate engine identifiers from the JO.
                  engine_model: jo.engine_model || "",
                  engine_serial_number: jo.esn || "",
                })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ERR No.</label>
              <input
                type="text"
                name="err_no"
                value={formData.err_no}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Engine Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Engine Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Engine Maker</label>
              <input
                type="text"
                name="engine_maker"
                value={formData.engine_maker}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Application</label>
              <input
                type="text"
                name="application"
                value={formData.application}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Engine Model</label>
              <input
                type="text"
                name="engine_model"
                value={formData.engine_model}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Engine Serial Number</label>
              <input
                type="text"
                name="engine_serial_number"
                value={formData.engine_serial_number}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date Received</label>
              <input
                type="date"
                name="date_received"
                value={formData.date_received}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date Inspected</label>
              <input
                type="date"
                name="date_inspected"
                value={formData.date_inspected}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Engine RPM</label>
              <input
                type="text"
                name="engine_rpm"
                value={formData.engine_rpm}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Engine KW</label>
              <input
                type="text"
                name="engine_kw"
                value={formData.engine_kw}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Inspection Sections (I - XI) */}
        <div>
          <div className="flex items-center mb-6">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Inspection Items</h3>
          </div>
          {SECTION_DEFINITIONS.map(renderSectionTable)}
        </div>

        {/* Section XII: Modification of Engine */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-base font-bold text-gray-800 uppercase">XII. Modification of the Engine</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <textarea
              name="modification_of_engine"
              value={formData.modification_of_engine}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              placeholder="Describe any modifications to the engine..."
            />
          </div>
        </div>

        {/* Section XIII: Missing Parts */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-base font-bold text-gray-800 uppercase">XIII. Missing Parts</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <textarea
              name="missing_parts"
              value={formData.missing_parts}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              placeholder="List any missing parts..."
            />
          </div>
        </div>

        {/* Signatures */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Signatures</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50 p-4 md:p-8 rounded-lg border border-gray-100">
            <SignatorySelect
              label="Service Technician"
              name="service_technician_name"
              value={formData.service_technician_name}
              signatureValue={formData.service_technician_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ service_technician_signature: sig })}
              users={users}
              subtitle="Signed by Technician"
              disabled={!canEditServiceTechnician}
             autoFillForPositions={["User 1", "User 2"]}/>
            <SignatorySelect
              label="Approved By"
              name="approved_by_name"
              value={formData.approved_by_name}
              signatureValue={formData.approved_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ approved_by_signature: sig })}
              users={users}
              subtitle="Authorized Signature"
              disabled={!canEditApprovedBy}
            />
            <SignatorySelect
              label="Noted By"
              name="noted_by_name"
              value={formData.noted_by_name}
              signatureValue={formData.noted_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ noted_by_signature: sig })}
              users={users}
              subtitle="Service Manager"
              disabled={!canEditNotedBy}
            />
            <Input
              label="Acknowledged By"
              name="acknowledged_by_name"
              value={formData.acknowledged_by_name}
              onChange={handleChange}
            />
            <SignaturePad
              label="Acknowledged By Signature"
              value={formData.acknowledged_by_signature}
              onChange={(sig) => setFormData({ acknowledged_by_signature: sig })}
              subtitle="Customer Signature"
            />
          </div>
        </div>

        {/* Section: Attachments */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Attachments</h3>
            <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(max 20 files: images or PDFs)</span>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Supporting Documents / Photos</label>
            {attachments.length > 0 && (
              <div className="space-y-3 mb-4">
                {attachments.map((attachment, index) => {
                  const isImage = attachment.file.type.startsWith('image/');
                  const previewUrl = isImage ? URL.createObjectURL(attachment.file) : null;
                  return (
                    <div key={index} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
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
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{attachment.file.name}</p>
                              <p className="text-xs text-gray-500">{(attachment.file.size / 1024).toFixed(2)} KB</p>
                            </div>
                            <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== index))} className="ml-4 text-red-600 hover:text-red-800 transition-colors flex-shrink-0">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <div className="mt-3">
                            <input type="text" placeholder="Enter document title/description" value={attachment.title} onChange={(e) => { const newAttachments = [...attachments]; newAttachments[index].title = e.target.value; setAttachments(newAttachments); }} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5" />
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
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload-engine-inspection" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload-engine-inspection" type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files);
                        if (attachments.length + files.length > 20) { toast.error('Maximum 20 files allowed'); e.target.value = ''; return; }
                        const newFiles = [];
                        for (const file of files) {
                          const isImage = file.type.startsWith('image/');
                          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                          if (!isImage && !isPdf) { toast.error('Only images or PDFs are allowed'); continue; }
                          const processed = isImage ? await compressImageIfNeeded(file) : file;
                          newFiles.push({ file: processed, title: '' });
                        }
                        if (newFiles.length > 0) setAttachments([...attachments, ...newFiles]);
                        e.target.value = '';
                      }
                    }} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className={`text-xs ${attachments.length >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>PNG, JPG, GIF, PDF up to 10MB ({attachments.length}/20 files)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => { resetFormData(); setAttachments([]); }}
            className="px-6 py-3 bg-white text-gray-700 font-bold rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={isModalOpen}
        title="Submit Engine Inspection / Receiving Report"
        message="Are you sure you want to submit this Engine Inspection / Receiving Report? Please make sure all information is correct."
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsModalOpen(false)}
        confirmText="Submit"
        type="info"
      />
    </div>
  );
}

