"use client";

import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import SignaturePad from "./SignaturePad";
import { supabase } from "@/lib/supabase";
import ConfirmationModal from "./ConfirmationModal";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useDeutzServiceFormStore } from "@/stores/deutzServiceFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';
import { useUsers, useCustomers, useEngines } from "@/hooks/useSharedQueries";

export default function DeutzServiceForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use Zustand store for persistent form data
  const { formData, setFormData, resetFormData } = useDeutzServiceFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();

  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();
  const approvedJOs = useApprovedJobOrders();
  const { data: engines = [] } = useEngines();

  const allUserOptions = useMemo(() => users.map(u => u.fullName), [users]);
  const approvedByUsers = useMemo(() =>
    users.filter(u => ['super admin','admin 1','admin 2'].includes((u.position?.name||'').toLowerCase()))
         .map(u => u.fullName),
    [users]
  );
  const notedByUsers = useMemo(() =>
    users.filter(u => ['super admin','admin 1'].includes((u.position?.name||'').toLowerCase()))
         .map(u => u.fullName),
    [users]
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    const updates: Record<string, any> = { [name]: value };

    if (name === 'noted_by') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'approved_by') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }

    setFormData(updates);
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      reporting_person_name: customer.name || "",
      customer_name: customer.customer || "",
      contact_person: customer.contactPerson || "",
      address: customer.address || "",
      email_address: customer.email || "",
      phone_number: customer.phone || "",
      equipment_manufacturer: customer.equipment || "",
    });
  };

  const handleEngineSelect = (engine: any) => {
    setFormData({
      engine_model: engine.model || "",
      engine_serial_no: engine.serialNo || "",
      alternator_brand_model: engine.altBrandModel || "",
      alternator_serial_no: engine.altSerialNo || "",
      equipment_model: engine.equipModel || "",
      equipment_serial_no: engine.equipSerialNo || "",
      fuel_pump_serial_no: engine.fuelPumpSN || "",
      fuel_pump_code: engine.fuelPumpCode || "",
      turbo_model: engine.turboModel || "",
      turbo_serial_no: engine.turboSN || "",
      // Add more fields if they map directly
      rating: engine.rating || formData.rating,
      revolution: engine.rpm || formData.revolution,
      starting_voltage: engine.startVoltage || formData.starting_voltage,
      running_hours: engine.runHours || formData.running_hours,
      lube_oil_type: engine.lubeOil || formData.lube_oil_type,
      fuel_type: engine.fuelType || formData.fuel_type,
      cooling_water_additives: engine.coolantAdditive || formData.cooling_water_additives,
      location: engine.location || formData.location,
    });
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData({ [name]: signature });
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    await submit({
      formType: 'deutz-service',
      formData: formData as unknown as Record<string, unknown>,
      attachments,
      onSuccess: () => {
        resetFormData();
        setAttachments([]);
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate job order number
    if (!formData.job_order || formData.job_order.trim() === '') {
      toast.error('Job Order Number is required');
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">
          Power Systems, Incorporated
        </h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">
          2nd Floor TOPY&apos;s Place #3 Calle Industria cor. Economia Street,
          Bagumbayan, Libis, Quezon City
        </p>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Tel:</span> (+63-2) 687-9275
          to 78 <span className="mx-2">|</span>{" "}
          <span className="font-bold text-gray-700">Fax:</span> (+63-2) 687-9279
        </p>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Email:</span>{" "}
          sales@psi-deutz.com
        </p>
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-[10px] md:text-xs font-bold text-gray-500 tracking-widest uppercase">
            NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA •
            ILO-ILO • SURIGAO
          </p>
        </div>
        <div className="mt-6">
          <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Deutz Service Form
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Job Reference */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Job Reference
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <JobOrderAutocomplete
              label="Job Order No."
              value={formData.job_order}
              onChange={(value) => setFormData({ job_order: value })}
              onSelect={(jo) => setFormData({
                job_order: jo.shop_field_jo_number || "",
                customer_name: jo.full_customer_name || "",
                address: jo.address || "",
              })}
              jobOrders={approvedJOs}
              required
            />
            <Input
              label="Date"
              name="report_date"
              type="date"
              value={formData.report_date}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 1: General Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              General Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <CustomerAutocomplete
              label="Reporting Person"
              name="reporting_person_name"
              value={formData.reporting_person_name}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="name"
            />

            <div className="lg:col-span-2">
              <CustomerAutocomplete
                label="Customer Name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                onSelect={handleCustomerSelect}
                customers={customers}
                searchKey="customer"
              />
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

            <div className="lg:col-span-3">
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
            <CustomerAutocomplete
              label="Email Address"
              name="email_address"
              value={formData.email_address}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="email"
            />
            <CustomerAutocomplete
              label="Phone Number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="phone"
            />
            <CustomerAutocomplete
              label="Equipment Manufacturer"
              name="equipment_manufacturer"
              value={formData.equipment_manufacturer}
              onChange={handleChange}
              onSelect={handleCustomerSelect}
              customers={customers}
              searchKey="equipment"
            />
          </div>
        </div>

        {/* Section 2: Equipment & Engine Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Equipment & Engine Details
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <EngineAutocomplete
              label="Equipment Model"
              name="equipment_model"
              value={formData.equipment_model}
              onChange={handleChange}
              onSelect={handleEngineSelect}
              engines={engines}
              searchKey="equipModel"
            />
            <EngineAutocomplete
              label="Equipment Serial No."
              name="equipment_serial_no"
              value={formData.equipment_serial_no}
              onChange={handleChange}
              onSelect={handleEngineSelect}
              engines={engines}
              searchKey="equipSerialNo"
            />

            <EngineAutocomplete
              label="Engine Model"
              name="engine_model"
              value={formData.engine_model}
              onChange={handleChange}
              onSelect={handleEngineSelect}
              engines={engines}
              searchKey="model"
            />
            <EngineAutocomplete
              label="Engine Serial No."
              name="engine_serial_no"
              value={formData.engine_serial_no}
              onChange={handleChange}
              onSelect={handleEngineSelect}
              engines={engines}
              searchKey="serialNo"
            />

            <EngineAutocomplete
              label="Alternator Brand/Model"
              name="alternator_brand_model"
              value={formData.alternator_brand_model}
              onChange={handleChange}
              onSelect={handleEngineSelect}
              engines={engines}
              searchKey="altBrandModel"
            />
            <EngineAutocomplete
              label="Alternator Serial No."
              name="alternator_serial_no"
              value={formData.alternator_serial_no}
              onChange={handleChange}
              onSelect={handleEngineSelect}
              engines={engines}
              searchKey="altSerialNo"
            />
          </div>
        </div>

        {/* Section 3: Operational Data */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Operational Data
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
            <Input
              label="Date in Service"
              name="date_in_service"
              type="date"
              value={formData.date_in_service}
              onChange={handleChange}
            />
            <Input
              label="Date Failed"
              name="date_failed"
              type="date"
              value={formData.date_failed}
              onChange={handleChange}
            />
            <Input
              label="Rating"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
            />
            <Input
              label="Revolution (RPM)"
              name="revolution"
              value={formData.revolution}
              onChange={handleChange}
            />

            <Input
              label="Starting Voltage"
              name="starting_voltage"
              value={formData.starting_voltage}
              onChange={handleChange}
            />
            <Input
              label="Running Hours"
              name="running_hours"
              value={formData.running_hours}
              onChange={handleChange}
            />
            <Input
              label="Lube Oil Type"
              name="lube_oil_type"
              value={formData.lube_oil_type}
              onChange={handleChange}
            />
            <Input
              label="Fuel Type"
              name="fuel_type"
              value={formData.fuel_type}
              onChange={handleChange}
            />

            <Input
              label="Fuel Pump Code"
              name="fuel_pump_code"
              value={formData.fuel_pump_code}
              onChange={handleChange}
            />
            <Input
              label="Fuel Pump Serial No."
              name="fuel_pump_serial_no"
              value={formData.fuel_pump_serial_no}
              onChange={handleChange}
            />

            <div className="lg:col-span-2">
              <Input
                label="Cooling Water Additives"
                name="cooling_water_additives"
                value={formData.cooling_water_additives}
                onChange={handleChange}
              />
            </div>
            <Input
              label="Turbo Model"
              name="turbo_model"
              value={formData.turbo_model}
              onChange={handleChange}
            />
            <Input
              label="Turbo Serial No."
              name="turbo_serial_no"
              value={formData.turbo_serial_no}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 4: Customer Complaint */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Customer Complaint
            </h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <TextArea
              label="Customer Complaint"
              name="customer_complaint"
              value={formData.customer_complaint}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 5: Possible Cause */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Possible Cause
            </h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <TextArea
              label="Possible Cause"
              name="possible_cause"
              value={formData.possible_cause}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 6: Warranty Coverage */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Warranty Coverage
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <RadioGroup
              label="Within Coverage Period?"
              name="within_coverage_period"
              value={formData.within_coverage_period}
              onChange={handleChange}
              options={["Yes", "No"]}
            />
            <RadioGroup
              label="Warrantable Failure?"
              name="warrantable_failure"
              value={formData.warrantable_failure}
              onChange={handleChange}
              options={["Yes", "No"]}
            />
          </div>
        </div>

        {/* Section 7: Service Report Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Service Report Details
            </h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
            <TextArea
              label="Summary Details"
              name="summary_details"
              value={formData.summary_details}
              onChange={handleChange}
            />
            <TextArea
              label="Action Taken"
              name="action_taken"
              value={formData.action_taken}
              onChange={handleChange}
            />
            <TextArea
              label="Observation"
              name="observation"
              value={formData.observation}
              onChange={handleChange}
            />
            <TextArea
              label="Findings"
              name="findings"
              value={formData.findings}
              onChange={handleChange}
            />
            <TextArea
              label="Recommendations"
              name="recommendations"
              value={formData.recommendations}
              onChange={handleChange}
            />

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Image Attachments
              </label>

              {/* Display existing attachments with preview */}
              {attachments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {attachments.map((attachment, index) => {
                    const previewUrl = URL.createObjectURL(attachment.file);
                    return (
                      <div key={index} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-start gap-4">
                            {/* Image Preview */}
                            <div className="flex-shrink-0">
                              <img
                                src={previewUrl}
                                alt={attachment.file.name}
                                className="w-24 h-24 object-cover rounded-md border-2 border-gray-200"
                                onLoad={() => URL.revokeObjectURL(previewUrl)}
                              />
                            </div>

                            {/* File Info and Remove Button */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {attachment.file.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(attachment.file.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAttachments = attachments.filter((_, i) => i !== index);
                                    setAttachments(newAttachments);
                                  }}
                                  className="ml-4 text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                                  title="Remove image"
                                >
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>

                              {/* Title Input */}
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
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload new image */}
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload an image</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            // Validate that it's an image
                            if (!file.type.startsWith('image/')) {
                              toast.error('Please select only image files (PNG, JPG, etc.)');
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
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 8: Signatures */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Signatures
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50 p-4 md:p-8 rounded-lg border border-gray-100">
            <div className="flex flex-col space-y-4">
              <Select
                label="Service Technician"
                name="service_technician"
                value={formData.service_technician}
                onChange={handleChange}
                options={allUserOptions}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.service_technician_signature}
                onChange={(signature: string) => handleSignatureChange('service_technician_signature', signature)}
                subtitle="Signed by Technician"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select
                label="Noted By"
                name="noted_by"
                value={formData.noted_by}
                onChange={handleChange}
                options={notedByUsers}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.noted_by_signature}
                onChange={(signature: string) => handleSignatureChange('noted_by_signature', signature)}
                subtitle="Service Manager"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select
                label="Approved By"
                name="approved_by"
                value={formData.approved_by}
                onChange={handleChange}
                options={approvedByUsers}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.approved_by_signature}
                onChange={(signature: string) => handleSignatureChange('approved_by_signature', signature)}
                subtitle="Authorized Signature"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select
                label="Acknowledged By"
                name="acknowledged_by"
                value={formData.acknowledged_by}
                onChange={handleChange}
                options={allUserOptions}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.acknowledged_by_signature}
                onChange={(signature: string) => handleSignatureChange('acknowledged_by_signature', signature)}
                subtitle="Customer Signature"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
          <button
            type="button"
            className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base"
            disabled={isSubmitting}
          >
            <span className="mr-2">Submit Service Report</span>
            {isSubmitting ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
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
        message="Are you sure you want to submit this Deutz Service Report?"
      />
    </div>
  );
}

// Helper Components
interface InputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  type?: string;
}

const Input = ({ label, name, value, onChange, type = "text" }: InputProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
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
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
}

const TextArea = ({ label, name, value, onChange }: TextAreaProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={4}
      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
      placeholder={`Enter ${label.toLowerCase()}`}
    />
  </div>
);

interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
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
    const syntheticEvent = {
      target: { name, value: option }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          readOnly
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors pr-16 cursor-pointer"
          placeholder="Select a name"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              const syntheticEvent = { target: { name, value: '' } } as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }}
            className="absolute inset-y-0 right-10 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
        >
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${
              showDropdown ? "rotate-180" : ""
            }`}
          />
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className={`w-full px-4 py-2 text-left transition-colors ${
                  opt === value
                    ? "text-white font-medium"
                    : "text-gray-900 hover:text-white"
                }`}
                style={{
                  backgroundColor: opt === value ? "#2B4C7E" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (opt !== value) {
                    e.currentTarget.style.backgroundColor = "#2B4C7E";
                  }
                }}
                onMouseLeave={(e) => {
                  if (opt !== value) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
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

interface RadioGroupProps {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  options: string[];
}

const RadioGroup = ({ label, name, value, onChange, options }: RadioGroupProps) => {
  const handleChange = (option: string) => {
    const syntheticEvent = {
      target: { name, value: option }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="flex flex-col w-full">
      <label className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex gap-6">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => handleChange(option)}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

interface CustomerAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onSelect: (customer: any) => void;
  customers: any[];
  searchKey?: string;
}

const CustomerAutocomplete = ({
  label,
  name,
  value,
  onChange,
  onSelect,
  customers,
  searchKey = "customer",
}: CustomerAutocompleteProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            onChange(e);
            setShowDropdown(true);
          }}
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
                                <div className="text-xs text-gray-500">
                                  {customer.customer}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };
                
                interface EngineAutocompleteProps {
                  label: string;
                  name: string;
                  value: string;
                  onChange: (
                    e: React.ChangeEvent<
                      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                    >
                  ) => void;
                  onSelect: (engine: any) => void;
                  engines: any[];
                  searchKey?: string;
                }
                
                const EngineAutocomplete = ({
                  label,
                  name,
                  value,
                  onChange,
                  onSelect,
                  engines,
                  searchKey = "model",
                }: EngineAutocompleteProps) => {
                  const [showDropdown, setShowDropdown] = React.useState(false);
                  const dropdownRef = React.useRef<HTMLDivElement>(null);
                
                  React.useEffect(() => {
                    const handleClickOutside = (event: MouseEvent) => {
                      if (
                        dropdownRef.current &&
                        !dropdownRef.current.contains(event.target as Node)
                      ) {
                        setShowDropdown(false);
                      }
                    };
                
                    document.addEventListener("mousedown", handleClickOutside);
                    return () => document.removeEventListener("mousedown", handleClickOutside);
                  }, []);
                
                  const handleSelectEngine = (engine: any) => {
                    onSelect(engine);
                    setShowDropdown(false);
                  };
                
                  const filteredEngines = engines.filter((e) =>
                    (e[searchKey] || "").toLowerCase().includes((value || "").toLowerCase())
                  );
                
                  return (
                    <div className="flex flex-col w-full" ref={dropdownRef}>
                      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name={name}
                          value={value}
                          onChange={(e) => {
                            onChange(e);
                            setShowDropdown(true);
                          }}
                          onFocus={() => setShowDropdown(true)}
                          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
                          placeholder={`Enter ${label.toLowerCase()}`}
                          autoComplete="off"
                        />
                        {showDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredEngines.map((engine) => (
                              <div
                                key={engine.id}
                                onClick={() => handleSelectEngine(engine)}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
                              >
                                <div className="font-medium">{engine.model}</div>
                                <div className="text-xs text-gray-500">
                                  S/N: {engine.serialNo} • {engine.company?.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                };
                
