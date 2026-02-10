"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from './SignaturePad';
import ConfirmationModal from "./ConfirmationModal";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useElectricSurfacePumpServiceFormStore } from "@/stores/electricSurfacePumpServiceFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';

interface User {
  id: string;
  fullName: string;
}

export default function ElectricSurfacePumpServiceForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, resetFormData } = useElectricSurfacePumpServiceFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();

  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);
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

  const handleBooleanChange = (name: string, value: boolean | null) => {
    setFormData({ [name]: value });
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      reporting_person_name: customer.name || "",
      customer: customer.customer || "",
      contact_person: customer.contactPerson || "",
      address: customer.address || "",
      email_or_contact: customer.email || customer.phone || "",
    });
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData({ [name]: signature });
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    await submit({
      formType: 'electric-surface-pump-service',
      formData: formData as unknown as Record<string, unknown>,
      attachments,
      onSuccess: () => {
        setAttachments([]);
        resetFormData();
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_order || formData.job_order.trim() === '') {
      toast.error('Job Order is required');
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Incorporated</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">2nd Floor TOPY&apos;s Place #3 Calle Industria cor. Economia Street, Bagumbayan, Libis, Quezon City</p>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
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
            Service Report
          </h2>
          <p className="text-sm text-gray-600 mt-2">(Electric Driven Surface Pump)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Job Reference */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Job Reference</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <JobOrderAutocomplete
              label="Job Order"
              value={formData.job_order}
              onChange={(value) => setFormData({ job_order: value })}
              onSelect={(jo) => setFormData({
                job_order: jo.shop_field_jo_number || "",
                customer: jo.full_customer_name || "",
                address: jo.address || "",
              })}
              jobOrders={approvedJOs}
              required
            />
            <Input label="J.O Date" name="jo_date" type="date" value={formData.jo_date} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Basic Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <CustomerAutocomplete
              label="Name of Reporting Person"
              name="reporting_person_name"
              value={formData.reporting_person_name}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="name"
            />
            <Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} />
            <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
            <Input label="Servicing Date" name="servicing_date" type="date" value={formData.servicing_date} onChange={handleChange} />
            <CustomerAutocomplete
              label="Customer"
              name="customer"
              value={formData.customer}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="customer"
            />
            <CustomerAutocomplete
              label="Contact Person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="contactPerson"
            />
            <div className="lg:col-span-2">
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
            <div className="lg:col-span-2">
              <Input label="Email or Contact Number" name="email_or_contact" value={formData.email_or_contact} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Section: Pump Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Pump Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="Pump Maker" name="pump_maker" value={formData.pump_maker} onChange={handleChange} />
            <Input label="Pump Type" name="pump_type" value={formData.pump_type} onChange={handleChange} />
            <Input label="Product Number" name="product_number" value={formData.product_number} onChange={handleChange} />
            <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
            <Input label="Pump Serial Number" name="pump_serial_number" value={formData.pump_serial_number} onChange={handleChange} />
            <Input label="Impeller Material" name="impeller_material" value={formData.impeller_material} onChange={handleChange} />
            <Input label="RPM" name="pump_rpm" value={formData.pump_rpm} onChange={handleChange} />
            <Input label="HMAX (Head)" name="hmax_head" value={formData.hmax_head} onChange={handleChange} />
            <Input label="QMAX (Flow)" name="qmax_flow" value={formData.qmax_flow} onChange={handleChange} />
            <Input label="Suction Size" name="suction_size" value={formData.suction_size} onChange={handleChange} />
            <Input label="Suction Connection" name="suction_connection" value={formData.suction_connection} onChange={handleChange} />
            <Input label="Suction Strainer P.N" name="suction_strainer_pn" value={formData.suction_strainer_pn} onChange={handleChange} />
            <Input label="Discharge Size" name="discharge_size" value={formData.discharge_size} onChange={handleChange} />
            <Input label="Discharge Connection" name="discharge_connection" value={formData.discharge_connection} onChange={handleChange} />
            <Input label="Configuration" name="configuration" value={formData.configuration} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Electric Motor Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Electric Motor Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="Maker" name="motor_maker" value={formData.motor_maker} onChange={handleChange} />
            <Input label="Model" name="motor_model" value={formData.motor_model} onChange={handleChange} />
            <Input label="HP" name="motor_hp" value={formData.motor_hp} onChange={handleChange} />
            <Input label="Phase" name="motor_phase" value={formData.motor_phase} onChange={handleChange} />
            <Input label="RPM" name="motor_rpm" value={formData.motor_rpm} onChange={handleChange} />
            <Input label="Voltage" name="motor_voltage" value={formData.motor_voltage} onChange={handleChange} />
            <Input label="Frequency" name="motor_frequency" value={formData.motor_frequency} onChange={handleChange} />
            <Input label="Amps" name="motor_amps" value={formData.motor_amps} onChange={handleChange} />
            <Input label="Max Amb Temperature" name="motor_max_amb_temperature" value={formData.motor_max_amb_temperature} onChange={handleChange} />
            <Input label="Insulation Class" name="motor_insulation_class" value={formData.motor_insulation_class} onChange={handleChange} />
            <Input label="No. of Leads" name="motor_no_of_leads" value={formData.motor_no_of_leads} onChange={handleChange} />
            <Input label="Connection" name="motor_connection" value={formData.motor_connection} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Service Dates & Location */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Service Dates & Location</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="Date In Service" name="date_in_service_commissioning" type="date" value={formData.date_in_service_commissioning} onChange={handleChange} />
            <Input label="Date Failed" name="date_failed" type="date" value={formData.date_failed} onChange={handleChange} />
            <Input label="Running Hours" name="running_hours" value={formData.running_hours} onChange={handleChange} />
            <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Service Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Service Information</h3>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <TextArea label="Customer's Complaints" name="customers_complaints" value={formData.customers_complaints} onChange={handleChange} rows={3} />
            <TextArea label="Possible Cause" name="possible_cause" value={formData.possible_cause} onChange={handleChange} rows={3} />
          </div>
        </div>

        {/* Section: Warranty Coverage */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Warranty Coverage</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <BooleanSelect
              label="Is the unit within the coverage?"
              name="is_unit_within_coverage"
              value={formData.is_unit_within_coverage}
              onChange={(value) => handleBooleanChange('is_unit_within_coverage', value)}
            />
            <BooleanSelect
              label="If yes, is this a warrantable failure?"
              name="is_warrantable_failure"
              value={formData.is_warrantable_failure}
              onChange={(value) => handleBooleanChange('is_warrantable_failure', value)}
            />
            <div className="md:col-span-2">
              <TextArea label="Summary Details" name="warranty_summary_details" value={formData.warranty_summary_details} onChange={handleChange} rows={3} />
            </div>
          </div>
        </div>

        {/* Section: Service Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Service Details</h3>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <TextArea label="Action Taken" name="action_taken" value={formData.action_taken} onChange={handleChange} rows={3} />
            <TextArea label="Observation" name="observation" value={formData.observation} onChange={handleChange} rows={3} />
            <TextArea label="Findings" name="findings" value={formData.findings} onChange={handleChange} rows={3} />
            <TextArea label="Recommendation" name="recommendation" value={formData.recommendation} onChange={handleChange} rows={3} />
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
              Photos
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
                              placeholder="Enter image title"
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
                  <label htmlFor="file-upload-electric-service" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload an image</span>
                    <input
                      id="file-upload-electric-service"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (!file.type.startsWith('image/')) {
                            toast.error('Please select only image files');
                            return;
                          }
                          setAttachments([...attachments, { file, title: '' }]);
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

        {/* Section: Signatures */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Signatures</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50 p-4 md:p-8 rounded-lg border border-gray-100">
            <div className="flex flex-col space-y-4">
              <Select label="Service Technician" name="performed_by_name" value={formData.performed_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.performed_by_signature}
                onChange={(signature: string) => handleSignatureChange('performed_by_signature', signature)}
                subtitle="Svc Engineer/Technician"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select label="Noted By" name="noted_by_name" value={formData.noted_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.noted_by_signature}
                onChange={(signature: string) => handleSignatureChange('noted_by_signature', signature)}
                subtitle="Svc. Manager"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select label="Approved By" name="checked_approved_by_name" value={formData.checked_approved_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.checked_approved_by_signature}
                onChange={(signature: string) => handleSignatureChange('checked_approved_by_signature', signature)}
                subtitle="Svc. Supvr. / Supt."
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select label="Acknowledged By" name="acknowledged_by_name" value={formData.acknowledged_by_name} onChange={handleChange} options={users.map(user => user.fullName)} />
              <SignaturePad
                label="Draw Signature"
                value={formData.acknowledged_by_signature}
                onChange={(signature: string) => handleSignatureChange('acknowledged_by_signature', signature)}
                subtitle="Customer Representative"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
          <button type="button" onClick={resetFormData} className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base">
            Clear Form
          </button>
          <button type="submit" className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base" disabled={isSubmitting}>
            <span className="mr-2">Submit Service Report</span>
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
        message="Are you sure you want to submit this Electric Driven Surface Pump Service Report?"
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
}

const Input = ({ label, name, value, onChange, type = "text" }: InputProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
      placeholder={`Enter ${label.toLowerCase()}`}
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

interface BooleanSelectProps {
  label: string;
  name: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}

const BooleanSelect = ({ label, name, value, onChange }: BooleanSelectProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={value === true}
          onChange={() => onChange(true)}
          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Yes</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={value === false}
          onChange={() => onChange(false)}
          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">No</span>
      </label>
    </div>
  </div>
);

interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  options: string[];
}

const Select = ({ label, name, value, onChange, options }: SelectProps) => {
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

  const handleSelectOption = (option: string) => {
    const syntheticEvent = { target: { name, value: option } } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors pr-10"
          placeholder="Select or type a name"
        />
        <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
          <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full px-4 py-2 text-left transition-colors ${opt === value ? "bg-[#2B4C7E] text-white font-medium" : "text-gray-900 hover:bg-[#2B4C7E] hover:text-white"}`}
              >
                {opt}
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
