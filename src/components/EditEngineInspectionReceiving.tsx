"use client";

import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignaturePad from "./SignaturePad";
import {
  SECTION_DEFINITIONS,
  type SectionDefinition,
  type SectionItem,
  type InspectionItemData,
} from "@/stores/engineInspectionReceivingFormStore";

interface User {
  id: string;
  fullName: string;
}

interface EditEngineInspectionReceivingProps {
  data: any;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
}

const Input = ({ label, name, value, onChange }: { label: string; name: string; value: any; onChange: (name: string, value: any) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type="text"
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
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

export default function EditEngineInspectionReceiving({ data, recordId, onClose, onSaved }: EditEngineInspectionReceivingProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
    fetchUsers();
  }, []);

  const handleFieldChange = (name: string, value: any) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
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
      toast.success('Report updated successfully!', { id: loadingToast });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save changes.';
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
                <Input label="JO Number *" name="jo_number" value={formState.jo_number} onChange={handleFieldChange} />
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
                  <UserSelect
                    label="Service Technician"
                    value={formState.service_technician_name}
                    onChange={(value) => handleFieldChange('service_technician_name', value)}
                    options={users.map((user) => user.fullName)}
                    placeholder="Select technician"
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formState.service_technician_signature}
                    onChange={(sig) => handleFieldChange('service_technician_signature', sig)}
                    subtitle="Signed by Technician"
                  />
                </div>

                <div className="space-y-4">
                  <UserSelect
                    label="Noted By"
                    value={formState.noted_by_name}
                    onChange={(value) => handleFieldChange('noted_by_name', value)}
                    options={users.map((user) => user.fullName)}
                    placeholder="Select manager"
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formState.noted_by_signature}
                    onChange={(sig) => handleFieldChange('noted_by_signature', sig)}
                    subtitle="Service Manager"
                  />
                </div>

                <div className="space-y-4">
                  <UserSelect
                    label="Approved By"
                    value={formState.approved_by_name}
                    onChange={(value) => handleFieldChange('approved_by_name', value)}
                    options={users.map((user) => user.fullName)}
                    placeholder="Select approver"
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formState.approved_by_signature}
                    onChange={(sig) => handleFieldChange('approved_by_signature', sig)}
                    subtitle="Authorized Signature"
                  />
                </div>

                <div className="space-y-4">
                  <UserSelect
                    label="Acknowledged By"
                    value={formState.acknowledged_by_name}
                    onChange={(value) => handleFieldChange('acknowledged_by_name', value)}
                    options={users.map((user) => user.fullName)}
                    placeholder="Select customer rep"
                  />
                  <SignaturePad
                    label="Draw Signature"
                    value={formState.acknowledged_by_signature}
                    onChange={(sig) => handleFieldChange('acknowledged_by_signature', sig)}
                    subtitle="Customer Signature"
                  />
                </div>
              </div>
            </SectionHeader>
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
    </div>
  );
}

// Custom Select component that allows typing or selecting from dropdown
interface UserSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

function UserSelect({ label, value, onChange, options, placeholder = "Select or type a name" }: UserSelectProps) {
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
    onChange(option);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Filter options based on current input
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide block">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm pr-10"
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
