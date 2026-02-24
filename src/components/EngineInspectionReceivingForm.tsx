"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import SignatorySelect from './SignatorySelect';
import ConfirmationModal from './ConfirmationModal';
import {
  useEngineInspectionReceivingFormStore,
  SECTION_DEFINITIONS,
  type SectionDefinition,
  type SectionItem,
} from '@/stores/engineInspectionReceivingFormStore';
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';
import { useUsers, useCustomers } from '@/hooks/useSharedQueries';

export default function EngineInspectionReceivingForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, setInspectionItem, resetFormData } = useEngineInspectionReceivingFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();
  const approvedJOs = useApprovedJobOrders();

  const approvedByUsers = users
    .filter(user => {
      const posName = (user.position?.name || '').toLowerCase();
      return posName === 'super admin' || posName === 'admin 1' || posName === 'admin 2';
    });
  const notedByUsers = users
    .filter(user => {
      const posName = (user.position?.name || '').toLowerCase();
      return posName === 'super admin' || posName === 'admin 1';
    });

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

    // Prepare form data with inspection items as JSON string
    const submissionData: Record<string, unknown> = { ...formData };
    submissionData.inspectionItems = JSON.stringify(formData.inspectionItems);

    await submit({
      formType: 'engine-inspection-receiving',
      formData: submissionData,
      onSuccess: () => {
        resetFormData();
      },
    });
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
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">
          Power Systems, Inc.
        </h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">
          C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City
        </p>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Tel No.:</span> 287.8916, 285.0923
        </p>
        <div className="mt-6">
          <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Engine Inspection / Receiving Report
          </h2>
        </div>
      </div>

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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                onChange={(value) => setFormData({ jo_number: value })}
                onSelect={(jo) => setFormData({
                  jo_number: jo.shop_field_jo_number || "",
                  customer: jo.full_customer_name || "",
                  address: jo.address || "",
                })}
                jobOrders={approvedJOs}
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
              showAllUsers
            />
            <SignatorySelect
              label="Approved By"
              name="approved_by_name"
              value={formData.approved_by_name}
              signatureValue={formData.approved_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ approved_by_signature: sig })}
              users={approvedByUsers}
              subtitle="Authorized Signature"
            />
            <SignatorySelect
              label="Noted By"
              name="noted_by_name"
              value={formData.noted_by_name}
              signatureValue={formData.noted_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ noted_by_signature: sig })}
              users={notedByUsers}
              subtitle="Service Manager"
            />
            <SignatorySelect
              label="Acknowledged By"
              name="acknowledged_by_name"
              value={formData.acknowledged_by_name}
              signatureValue={formData.acknowledged_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ acknowledged_by_signature: sig })}
              users={users}
              subtitle="Customer Signature"
              showAllUsers
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
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

