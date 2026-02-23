"use client";

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import SignatorySelect from './SignatorySelect';
import { supabase } from '@/lib/supabase';
import ConfirmationModal from "./ConfirmationModal";
import { useDeutzCommissioningFormStore } from "@/stores/deutzCommissioningFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { compressImageIfNeeded } from '@/lib/imageCompression';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';
import { useUsers, useCustomers, useEngines, FormUser } from "@/hooks/useSharedQueries";

export default function DeutzCommissioningReport() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use Zustand store for persistent form data
  const { formData, setFormData, resetFormData } = useDeutzCommissioningFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();

  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();
  const { data: engines = [] } = useEngines();
  const approvedJOs = useApprovedJobOrders();

  const approvedByUsers = useMemo(() =>
    users.filter(u => ['super admin','admin 1','admin 2'].includes((u.position?.name||'').toLowerCase())),
    [users]
  );
  const notedByUsers = useMemo(() =>
    users.filter(u => ['super admin','admin 1'].includes((u.position?.name||'').toLowerCase())),
    [users]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      equipment_name: customer.equipment || "",
    });
  };

  const handleEngineSelect = (engine: any) => {
    setFormData({
      equipment_manufacturer: engine.company?.name || formData.equipment_manufacturer,
      equipment_type: engine.equipModel || "",
      equipment_no: engine.equipSerialNo || "",
      engine_model: engine.model || "",
      engine_serial_no: engine.serialNo || "",
      output: engine.rating || "",
      revolutions: engine.rpm || "",
      running_hours: engine.runHours || "",
      lube_oil_type: engine.lubeOil || "",
      fuel_type: engine.fuelType || "",
      cooling_water_additives: engine.coolantAdditive || "",
      fuel_pump_serial_no: engine.fuelPumpSN || "",
      fuel_pump_code: engine.fuelPumpCode || "",
      turbo_model: engine.turboModel || "",
      turbo_serial_no: engine.turboSN || "",
    });
  };

  const handleSignatoryChange = (name: string, value: string) => {
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

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    await submit({
      formType: 'deutz-commissioning',
      formData: formData as unknown as Record<string, unknown>,
      attachments,
      additionalFields: {
        summary: formData.inspection_summary,
        comments_action: formData.inspection_comments,
      },
      onSuccess: () => {
        setAttachments([]);
        resetFormData();
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate job order number
    if (!formData.job_order_no || formData.job_order_no.trim() === '') {
      toast.error('Job Order Number is required');
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
            NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA • ILO-ILO • SURIGAO
          </p>
        </div>
        <div className="mt-6">
             <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Deutz Commissioning Report
            </h2>
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
                  label="Job Order No."
                  value={formData.job_order_no}
                  onChange={(value) => setFormData({ job_order_no: value })}
                  onSelect={(jo) => setFormData({
                    job_order_no: jo.shop_field_jo_number || "",
                    customer_name: jo.full_customer_name || "",
                    address: jo.address || "",
                  })}
                  jobOrders={approvedJOs}
                  required
                />
                <Input label="Commissioning Date" name="commissioning_date" type="date" value={formData.commissioning_date} onChange={handleChange} />
            </div>
        </div>

        {/* Section 1: General Information */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">General Information</h3>
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
                <Input label="Commissioning No." name="commissioning_no" value={formData.commissioning_no} onChange={handleChange} />
                <CustomerAutocomplete
                  label="Equipment Name"
                  name="equipment_name"
                  value={formData.equipment_name}
                  onChange={handleChange}
                  onSelect={handleCustomerSelect}
                  customers={customers}
                  searchKey="equipment"
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
                     <Input label="Commissioning Location" name="commissioning_location" value={formData.commissioning_location} onChange={handleChange} />
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
            </div>
        </div>

        {/* Section 2: Equipment & Engine Details */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Equipment & Engine Data</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <EngineAutocomplete
                  label="Engine Model"
                  name="engine_model"
                  value={formData.engine_model}
                  onChange={handleChange}
                  onSelect={handleEngineSelect}
                  engines={engines}
                  searchKey="model"
                />
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
                <Input label="Equipment Type" name="equipment_type" value={formData.equipment_type} onChange={handleChange} />
                
                <EngineAutocomplete
                  label="Equipment No."
                  name="equipment_no"
                  value={formData.equipment_no}
                  onChange={handleChange}
                  onSelect={handleEngineSelect}
                  engines={engines}
                  searchKey="equipSerialNo"
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
                
                <Input label="Output (kW/HP)" name="output" value={formData.output} onChange={handleChange} />
                <Input label="Revolutions (RPM)" name="revolutions" value={formData.revolutions} onChange={handleChange} />
                <Input label="Main Effective Pressure" name="main_effective_pressure" value={formData.main_effective_pressure} onChange={handleChange} />

                 <Input label="Running Hours" name="running_hours" value={formData.running_hours} onChange={handleChange} />
            </div>
        </div>

         {/* Section 3: Technical Specifications */}
         <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Technical Specifications</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="Lube Oil Type" name="lube_oil_type" value={formData.lube_oil_type} onChange={handleChange} />
                <Input label="Fuel Type" name="fuel_type" value={formData.fuel_type} onChange={handleChange} />
                <div className="md:col-span-2">
                     <Input label="Cooling Water Additives" name="cooling_water_additives" value={formData.cooling_water_additives} onChange={handleChange} />
                </div>
                
                <Input label="Fuel Pump Code" name="fuel_pump_code" value={formData.fuel_pump_code} onChange={handleChange} />
                <Input label="Fuel Pump Serial No." name="fuel_pump_serial_no" value={formData.fuel_pump_serial_no} onChange={handleChange} />
                <Input label="Turbo Model" name="turbo_model" value={formData.turbo_model} onChange={handleChange} />
                <Input label="Turbo Serial No." name="turbo_serial_no" value={formData.turbo_serial_no} onChange={handleChange} />
            </div>
        </div>

        {/* Section 4: Inspection Prior Test */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Inspection Prior Test</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
                <TextArea label="Summary" name="inspection_summary" value={formData.inspection_summary} onChange={handleChange} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Input label="1. Check Oil Level" name="check_oil_level" value={formData.check_oil_level} onChange={handleChange} />
                    <Input label="2. Check Air Filter Element" name="check_air_filter" value={formData.check_air_filter} onChange={handleChange} />
                    <Input label="3. Check Hoses and Clamps if Properly Tightened" name="check_hoses_clamps" value={formData.check_hoses_clamps} onChange={handleChange} />
                    <Input label="4. Check Engine Support if Properly Tightened" name="check_engine_support" value={formData.check_engine_support} onChange={handleChange} />
                    <Input label="5. Check V-Belt" name="check_v_belt" value={formData.check_v_belt} onChange={handleChange} />
                    <Input label="6. Check Water Level (for Water Cooled)" name="check_water_level" value={formData.check_water_level} onChange={handleChange} />
                    <Input label="7. Crankshaft End Play" name="crankshaft_end_play" value={formData.crankshaft_end_play} onChange={handleChange} />
                    <Input label="Inspector" name="inspector" value={formData.inspector} onChange={handleChange} />
                </div>

                <TextArea label="Comments / Action" name="inspection_comments" value={formData.inspection_comments} onChange={handleChange} />
            </div>
        </div>

        {/* Section 5: Operational Readings */}
        <div>
            <div className="flex items-center mb-1">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Operational Readings (Test Run)</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4 ml-3">Description: Test run engine with load.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="RPM (Idle Speed)" name="rpm_idle_speed" value={formData.rpm_idle_speed} onChange={handleChange} />
                <Input label="RPM (Full Speed)" name="rpm_full_speed" value={formData.rpm_full_speed} onChange={handleChange} />
                <Input label="Oil Press. (Idle)" name="oil_pressure_idle" value={formData.oil_pressure_idle} onChange={handleChange} />
                <Input label="Oil Press. (Full)" name="oil_pressure_full" value={formData.oil_pressure_full} onChange={handleChange} />
                
                <Input label="Oil Temperature" name="oil_temperature" value={formData.oil_temperature} onChange={handleChange} />
                <Input label="Engine Smoke" name="engine_smoke" value={formData.engine_smoke} onChange={handleChange} />
                <Input label="Engine Vibration" name="engine_vibration" value={formData.engine_vibration} onChange={handleChange} />
                
                <Input label="Engine Leakage" name="check_engine_leakage" value={formData.check_engine_leakage} onChange={handleChange} />
            </div>
        </div>

         {/* Section 6: Cylinder */}
         <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Cylinder</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Input label="Cyl. Head Temp" name="cylinder_head_temp" value={formData.cylinder_head_temp} onChange={handleChange} />
                    <Input label="Cylinder No." name="cylinder_no" value={formData.cylinder_no} onChange={handleChange} />
                </div>
                
                {/* Cylinder A */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">A1</label>
                        <input name="cylinder_a1" value={formData.cylinder_a1} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">A2</label>
                        <input name="cylinder_a2" value={formData.cylinder_a2} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">A3</label>
                        <input name="cylinder_a3" value={formData.cylinder_a3} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">A4</label>
                        <input name="cylinder_a4" value={formData.cylinder_a4} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">A5</label>
                        <input name="cylinder_a5" value={formData.cylinder_a5} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">A6</label>
                        <input name="cylinder_a6" value={formData.cylinder_a6} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                </div>

                {/* Cylinder B */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">B1</label>
                        <input name="cylinder_b1" value={formData.cylinder_b1} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">B2</label>
                        <input name="cylinder_b2" value={formData.cylinder_b2} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">B3</label>
                        <input name="cylinder_b3" value={formData.cylinder_b3} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">B4</label>
                        <input name="cylinder_b4" value={formData.cylinder_b4} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">B5</label>
                        <input name="cylinder_b5" value={formData.cylinder_b5} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-bold text-center text-gray-600 text-sm">B6</label>
                        <input name="cylinder_b6" value={formData.cylinder_b6} onChange={handleChange} className="text-center border rounded p-2 text-sm w-full" placeholder="Temp" />
                    </div>
                </div>
            </div>
        </div>

        {/* Section 7: Parts Reference & Controller */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Parts Reference & Controller</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="Starter Part No." name="starter_part_no" value={formData.starter_part_no} onChange={handleChange} />
                <Input label="Alternator Part No." name="alternator_part_no" value={formData.alternator_part_no} onChange={handleChange} />
                <Input label="V-Belt Part No." name="v_belt_part_no" value={formData.v_belt_part_no} onChange={handleChange} />

                <Input label="Air Filter Part No." name="air_filter_part_no" value={formData.air_filter_part_no} onChange={handleChange} />
                <Input label="Oil Filter Part No." name="oil_filter_part_no" value={formData.oil_filter_part_no} onChange={handleChange} />
                <Input label="Fuel Filter Part No." name="fuel_filter_part_no" value={formData.fuel_filter_part_no} onChange={handleChange} />

                <Input label="Pre-Fuel Filter Part No." name="pre_fuel_filter_part_no" value={formData.pre_fuel_filter_part_no} onChange={handleChange} />
                <Input label="Controller Brand" name="controller_brand" value={formData.controller_brand} onChange={handleChange} />
                <Input label="Controller Model" name="controller_model" value={formData.controller_model} onChange={handleChange} />
            </div>
        </div>

        {/* Section 8: Remarks & Findings */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Remarks & Recommendations</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
                <TextArea label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
                <TextArea label="Recommendation" name="recommendation" value={formData.recommendation} onChange={handleChange} />

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
                          <div
                            key={index}
                            className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm"
                          >
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
                                        const newAttachments = attachments.filter(
                                          (_, i) => i !== index
                                        );
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
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                // Validate that it's an image
                                if (!file.type.startsWith('image/')) {
                                  toast.error('Please select only image files (PNG, JPG, etc.)');
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
        </div>

        {/* Section 9: Signatures */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Signatures</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50 p-4 md:p-8 rounded-lg border border-gray-100">
                <SignatorySelect
                    label="Attending Technician"
                    name="attending_technician"
                    value={formData.attending_technician}
                    signatureValue={formData.attending_technician_signature}
                    onChange={handleSignatoryChange}
                    onSignatureChange={(sig) => setFormData({ attending_technician_signature: sig })}
                    users={users}
                    subtitle="Technician"
                />
                <SignatorySelect
                    label="Approved By"
                    name="approved_by"
                    value={formData.approved_by}
                    signatureValue={formData.approved_by_signature}
                    onChange={handleSignatoryChange}
                    onSignatureChange={(sig) => setFormData({ approved_by_signature: sig })}
                    users={approvedByUsers}
                    subtitle="Authorized Signature"
                />
                <SignatorySelect
                    label="Noted By"
                    name="noted_by"
                    value={formData.noted_by}
                    signatureValue={formData.noted_by_signature}
                    onChange={handleSignatoryChange}
                    onSignatureChange={(sig) => setFormData({ noted_by_signature: sig })}
                    users={notedByUsers}
                    subtitle="Service Manager"
                />
                <SignatorySelect
                    label="Acknowledged By"
                    name="acknowledged_by"
                    value={formData.acknowledged_by}
                    signatureValue={formData.acknowledged_by_signature}
                    onChange={handleSignatoryChange}
                    onSignatureChange={(sig) => setFormData({ acknowledged_by_signature: sig })}
                    users={users}
                    subtitle="Customer Signature"
                />
            </div>
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
            <button type="button" className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base">
                Cancel
            </button>
            <button type="submit" className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base" disabled={isSubmitting}>
                <span className="mr-2">Submit Commissioning Report</span>
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
        message="Are you sure you want to submit this Deutz Commissioning Report?"
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
}

const TextArea = ({ label, name, value, onChange }: TextAreaProps) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
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
        {showDropdown && filteredEngines.length > 0 && (
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
