"use client";

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from './SignaturePad';
import ConfirmationModal from './ConfirmationModal';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import {
  useEngineInspectionReceivingFormStore,
  SECTION_DEFINITIONS,
  type SectionDefinition,
  type SectionItem,
} from '@/stores/engineInspectionReceivingFormStore';
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';

interface User {
  id: string;
  fullName: string;
}

export default function EngineInspectionReceivingForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, setInspectionItem, resetFormData } = useEngineInspectionReceivingFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const approvedJOs = useApprovedJobOrders();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users');
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };

    const fetchCustomers = async () => {
      try {
        const response = await apiClient.get('/customers');
        if (response.data.success) {
          setCustomers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch customers", error);
      }
    };

    fetchUsers();
    fetchCustomers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData({ [name]: signature });
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
            {/* Service Technician */}
            <div className="space-y-4">
              <UserSelect
                label="Service Technician"
                name="service_technician_name"
                value={formData.service_technician_name}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
                placeholder="Select technician"
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.service_technician_signature}
                onChange={(sig) => handleSignatureChange('service_technician_signature', sig)}
                subtitle="Signed by Technician"
              />
            </div>

            {/* Noted By */}
            <div className="space-y-4">
              <UserSelect
                label="Noted By"
                name="noted_by_name"
                value={formData.noted_by_name}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
                placeholder="Select manager"
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.noted_by_signature}
                onChange={(sig) => handleSignatureChange('noted_by_signature', sig)}
                subtitle="Service Manager"
              />
            </div>

            {/* Approved By */}
            <div className="space-y-4">
              <UserSelect
                label="Approved By"
                name="approved_by_name"
                value={formData.approved_by_name}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
                placeholder="Select approver"
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.approved_by_signature}
                onChange={(sig) => handleSignatureChange('approved_by_signature', sig)}
                subtitle="Authorized Signature"
              />
            </div>

            {/* Acknowledged By */}
            <div className="space-y-4">
              <UserSelect
                label="Acknowledged By"
                name="acknowledged_by_name"
                value={formData.acknowledged_by_name}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
                placeholder="Select customer rep"
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.acknowledged_by_signature}
                onChange={(sig) => handleSignatureChange('acknowledged_by_signature', sig)}
                subtitle="Customer Signature"
              />
            </div>
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

// Custom Select component that allows typing or selecting from dropdown
interface UserSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  options: string[];
  placeholder?: string;
}

function UserSelect({ label, name, value, onChange, options, placeholder = "Select or type a name" }: UserSelectProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (option: string) => {
    const syntheticEvent = {
      target: { name, value: option }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
  };

  // Filter options based on current input
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors pr-10"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
        >
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`}
          />
        </button>
        {showDropdown && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full px-4 py-2 text-left transition-colors hover:bg-blue-600 hover:text-white ${
                  opt === value ? "bg-blue-600 text-white font-medium" : "text-gray-900"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
