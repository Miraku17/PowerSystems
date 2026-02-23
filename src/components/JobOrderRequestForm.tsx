"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignatorySelect from './SignatorySelect';
import ConfirmationModal from "./ConfirmationModal";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useJobOrderRequestFormStore } from "@/stores/jobOrderRequestFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import { useUsers, useCustomers, FormUser } from '@/hooks/useSharedQueries';

export default function JobOrderRequestForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, resetFormData } = useJobOrderRequestFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();

  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();
  const [nextJoNumber, setNextJoNumber] = useState<string>("Loading...");

  useEffect(() => {
    const fetchNextJoNumber = async () => {
      try {
        const response = await apiClient.get('/forms/job-order-request/next-number');
        if (response.data.success) {
          setNextJoNumber(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch next JO number", error);
        setNextJoNumber("—");
      }
    };

    fetchNextJoNumber();
  }, []);

  // Auto-calculate total cost when parts, labor, or other cost changes
  useEffect(() => {
    const parts = parseFloat(formData.parts_cost) || 0;
    const labor = parseFloat(formData.labor_cost) || 0;
    const other = parseFloat(formData.other_cost) || 0;
    const total = (parts + labor + other).toFixed(2);
    if (formData.total_cost !== total) {
      setFormData({ total_cost: total });
    }
  }, [formData.parts_cost, formData.labor_cost, formData.other_cost]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      full_customer_name: customer.customer || "",
      contact_person: customer.contactPerson || "",
      address: customer.address || "",
      telephone_numbers: customer.phone || "",
    });
  };

  const handleSignatoryChange = (name: string, value: string) => {
    setFormData({ [name]: value });
  };

  const verifiedByUsers = React.useMemo<FormUser[]>(() =>
    users.filter(user => {
      const posName = (user.position?.name || '').toLowerCase();
      return posName === 'admin 1' || posName === 'admin 2' || posName === 'accounting';
    }), [users]);

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    await submit({
      formType: 'job-order-request',
      formData: formData as unknown as Record<string, unknown>,
      attachments,
      onSuccess: async () => {
        setAttachments([]);
        resetFormData();
        // Refresh next JO number for the next submission
        try {
          const response = await apiClient.get('/forms/job-order-request/next-number');
          if (response.data.success) {
            setNextJoNumber(response.data.data);
          }
        } catch (error) {
          console.error("Failed to refresh next JO number", error);
        }
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_customer_name || formData.full_customer_name.trim() === '') {
      toast.error('Customer Name is required');
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Inc.</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">C-3 Road corner Torsillo Street, Dagat-Dagatan, Caloocan City</p>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Tel. Nos.:</span> 287-89-16; 285-09-23
        </p>
        <div className="mt-6">
          <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Job Order Request Form
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Header Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Job Order Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="flex flex-col w-full">
              <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                SHOP/FIELD J.O. NO.
              </label>
              <input
                type="text"
                value={nextJoNumber}
                disabled
                className="w-full bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-md block p-2.5 cursor-not-allowed font-semibold"
              />
            </div>
            <Input label="Date Prepared" name="date_prepared" type="date" value={formData.date_prepared} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Customer Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Customer Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="md:col-span-2">
              <CustomerAutocomplete
                label="Full Customer's Name"
                name="full_customer_name"
                value={formData.full_customer_name}
                onChange={handleChange}
                onSelect={handleCustomerSelect}
                customers={customers}
                searchKey="customer"
              />
            </div>
            <div className="md:col-span-2">
              <CustomerAutocomplete
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onSelect={handleCustomerSelect}
                customers={customers}
                searchKey="address"
              />
            </div>
            <div className="md:col-span-2">
              <Input label="Location of Unit" name="location_of_unit" value={formData.location_of_unit} onChange={handleChange} />
            </div>
            <CustomerAutocomplete
              label="Contact Person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="contactPerson"
            />
            <Input label="Tel No/s." name="telephone_numbers" value={formData.telephone_numbers} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Equipment Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Equipment Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="md:col-span-2">
              <TextArea label="Particulars" name="particulars" value={formData.particulars} onChange={handleChange} rows={2} />
            </div>
            <Input label="Equipment Model" name="equipment_model" value={formData.equipment_model} onChange={handleChange} />
            <Input label="Equipment No." name="equipment_number" value={formData.equipment_number} onChange={handleChange} />
            <Input label="Engine Model" name="engine_model" value={formData.engine_model} onChange={handleChange} />
            <Input label="ESN (Engine Serial Number)" name="esn" value={formData.esn} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Service Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Service Details</h3>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <TextArea label="Complaints" name="complaints" value={formData.complaints} onChange={handleChange} rows={3} />
            <TextArea label="Work To Be Done" name="work_to_be_done" value={formData.work_to_be_done} onChange={handleChange} rows={3} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <Input label="Preferred Service Date" name="preferred_service_date" type="date" value={formData.preferred_service_date} onChange={handleChange} />
              <Input label="Time" name="preferred_service_time" type="time" value={formData.preferred_service_time} onChange={handleChange} />
              <SelectDropdown
                label="Charges Absorbed By"
                name="charges_absorbed_by"
                value={formData.charges_absorbed_by}
                onChange={handleChange}
                options={[
                  "Local warranty",
                  "Factory warranty",
                  "Customers acct",
                  "Cost of sales",
                  "Admin",
                  "Facility maint. & repair",
                  "Leasehold improvement"
                ]}
              />
            </div>
          </div>
        </div>

        {/* Section: Attached References */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Attached References</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="QTN. REF" name="qtn_ref" value={formData.qtn_ref} onChange={handleChange} />
            <Input label="Customer's P.O/WTY Claim No." name="customers_po_wty_claim_no" value={formData.customers_po_wty_claim_no} onChange={handleChange} />
            <Input label="D.R. Number" name="dr_number" value={formData.dr_number} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Request and Approval */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Request & Approval</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <SignatorySelect
              label="Requested By (Sales/Service Engineer)"
              name="requested_by_name"
              value={formData.requested_by_name}
              signatureValue={formData.requested_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ requested_by_signature: sig })}
              users={users}
              subtitle="Sales/Service Engineer"
            />
            <SignatorySelect
              label="Approved By (Department Head)"
              name="approved_by_name"
              value={formData.approved_by_name}
              signatureValue={formData.approved_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ approved_by_signature: sig })}
              users={users}
              subtitle="Department Head"
            />
          </div>
        </div>

        {/* Section: Request Received By */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Request Received By</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <SignatorySelect
              label="Service Dept."
              name="received_by_service_dept_name"
              value={formData.received_by_service_dept_name}
              signatureValue={formData.received_by_service_dept_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ received_by_service_dept_signature: sig })}
              users={users}
              subtitle="Service Department"
            />
            <SignatorySelect
              label="Credit & Collection"
              name="received_by_credit_collection_name"
              value={formData.received_by_credit_collection_name}
              signatureValue={formData.received_by_credit_collection_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ received_by_credit_collection_signature: sig })}
              users={users}
              subtitle="Credit & Collection"
            />
          </div>
        </div>

        {/* Section: Service Use Only */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-red-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Service Use Only</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 bg-red-50 p-6 rounded-lg border border-red-200">
            <Input label="Estimated No. of Repairs Days" name="estimated_repair_days" type="number" value={formData.estimated_repair_days} onChange={handleChange} />
            <div className="lg:col-span-2">
              <Input label="Technicians Involved" name="technicians_involved" value={formData.technicians_involved} onChange={handleChange} placeholder="Comma-separated names" />
            </div>
            <Input label="Date Job Started" name="date_job_started" type="date" value={formData.date_job_started} onChange={handleChange} />
            <Input label="Date Job Completed/Closed" name="date_job_completed_closed" type="date" value={formData.date_job_completed_closed} onChange={handleChange} />
            <SelectDropdown
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={["Pending", "In-Progress", "Close", "Cancelled"]}
            />
            <Input label="Parts Cost" name="parts_cost" type="number" step="0.01" value={formData.parts_cost} onChange={handleChange} />
            <Input label="Labor Cost" name="labor_cost" type="number" step="0.01" value={formData.labor_cost} onChange={handleChange} />
            <Input label="Other Cost" name="other_cost" type="number" step="0.01" value={formData.other_cost} onChange={handleChange} />
            <Input label="Total Cost" name="total_cost" type="number" step="0.01" value={formData.total_cost} onChange={handleChange} disabled />
            <Input label="Date of Invoice" name="date_of_invoice" type="date" value={formData.date_of_invoice} onChange={handleChange} />
            <Input label="Invoice Number" name="invoice_number" value={formData.invoice_number} onChange={handleChange} />
            <div className="lg:col-span-3">
              <TextArea label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} rows={3} />
            </div>
            <div className="lg:col-span-3">
              <SignatorySelect
                label="Verified By"
                name="verified_by_name"
                value={formData.verified_by_name}
                signatureValue={formData.verified_by_signature}
                onChange={handleSignatoryChange}
                onSignatureChange={(sig) => setFormData({ verified_by_signature: sig })}
                users={verifiedByUsers}
                subtitle="Verified By"
              />
            </div>
          </div>
        </div>

        {/* Section: Attachments */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Attachments</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
              Supporting Documents / Photos
            </label>

            {attachments.length > 0 && (
              <div className="space-y-3 mb-4">
                {attachments.map((attachment, index) => {
                  const previewUrl = URL.createObjectURL(attachment.file);
                  return (
                    <div key={index} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src={previewUrl}
                            alt={attachment.file.name}
                            className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{attachment.file.name}</p>
                              <p className="text-xs text-gray-500">{(attachment.file.size / 1024).toFixed(2)} KB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                              className="ml-4 text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-3">
                            <input
                              type="text"
                              placeholder="Enter document title/description"
                              value={attachment.title}
                              onChange={(e) => {
                                const newAttachments = [...attachments];
                                newAttachments[index].title = e.target.value;
                                setAttachments(newAttachments);
                              }}
                              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                            />
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
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload-job-order" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input
                      id="file-upload-job-order"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (!file.type.startsWith('image/')) {
                            toast.error('Please select only image files');
                            return;
                          }
                          const compressed = await compressImageIfNeeded(file);
                          setAttachments([...attachments, { file: compressed, title: '' }]);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
          <button type="button" onClick={resetFormData} className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base">
            Clear Form
          </button>
          <button type="submit" className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base" disabled={isSubmitting}>
            <span className="mr-2">Submit Job Order Request</span>
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </form>
      <ConfirmationModal
        isOpen={isModalOpen}
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Submission"
        message="Are you sure you want to submit this Job Order Request Form?"
      />
    </div>
  );
}

// Helper Components
interface InputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  step?: string;
}

const Input = ({ label, name, value, onChange, type = "text", required = false, disabled = false, placeholder, step }: InputProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      step={step}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      placeholder={placeholder || `Enter ${label.toLowerCase()}`}
    />
  </div>
);

interface TextAreaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  rows?: number;
}

const TextArea = ({ label, name, value, onChange, rows = 3 }: TextAreaProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm resize-none"
      placeholder={`Enter ${label.toLowerCase()}`}
    />
  </div>
);

interface SelectDropdownOption {
  label: string;
  subtitle?: string;
  value: string;
}

interface SelectDropdownProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  options: string[] | SelectDropdownOption[];
  placeholder?: string;
}

const SelectDropdown = ({ label, name, value, onChange, options, placeholder }: SelectDropdownProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize options to always be SelectDropdownOption[]
  const normalizedOptions: SelectDropdownOption[] = options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : '';

  const handleSelectOption = (optValue: string) => {
    const syntheticEvent = { target: { name, value: optValue } } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-left text-sm text-gray-900 transition-colors pr-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {displayText || <span className="text-gray-400">{placeholder || `Select ${label.toLowerCase()}`}</span>}
        </button>
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
          <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </div>
        {showDropdown && normalizedOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {normalizedOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOption(opt.value)}
                className={`w-full px-4 py-2.5 text-left transition-colors ${opt.value === value ? "bg-[#2B4C7E] text-white" : "text-gray-900 hover:bg-[#2B4C7E] hover:text-white"}`}
              >
                <span className="font-medium text-sm">{opt.label}</span>
                {opt.subtitle && (
                  <span className={`ml-2 text-xs ${opt.value === value ? "text-blue-200" : "text-gray-400"}`}>
                    — {opt.subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CustomerAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSelect: (customer: any) => void;
  customers: any[];
  searchKey?: string;
}

const CustomerAutocomplete = ({ label, name, value, onChange, onSelect, customers, searchKey = "customer" }: CustomerAutocompleteProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: any) => {
    onSelect(customer);
    setShowDropdown(false);
  };

  const filteredCustomers = customers.filter((c) =>
    (c[searchKey] || "").toLowerCase().includes((value || "").toLowerCase())
  );

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => { onChange(e); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
        />
        {showDropdown && filteredCustomers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-xs text-gray-500">{customer.customer}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
