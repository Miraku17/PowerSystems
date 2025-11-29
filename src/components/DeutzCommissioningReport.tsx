"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';
import SignaturePad from './SignaturePad';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  fullName: string;
}

export default function DeutzCommissioningReport() {
  const [formData, setFormData] = useState({
    reporting_person_name: '',
    telephone_fax: '',
    equipment_name: '',
    running_hours: '',
    customer_name: '',
    contact_person: '',
    address: '',
    email_address: '',
    commissioning_location: '',
    commissioning_date: '',
    engine_model: '',
    engine_serial_no: '',
    commissioning_no: '',
    equipment_manufacturer: '',
    equipment_no: '',
    equipment_type: '',
    output: '',
    revolutions: '',
    main_effective_pressure: '',
    lube_oil_type: '',
    fuel_type: '',
    cooling_water_additives: '',
    fuel_pump_serial_no: '',
    fuel_pump_code: '',
    turbo_model: '',
    turbo_serial_no: '',
    // Inspection Prior Test
    inspection_summary: '',
    check_oil_level: '',
    check_air_filter: '',
    check_hoses_clamps: '',
    check_engine_support: '',
    check_v_belt: '',
    check_water_level: '',
    crankshaft_end_play: '',
    inspector: '',
    inspection_comments: '',
    // Operational Readings
    rpm_idle_speed: '',
    rpm_full_speed: '',
    oil_pressure_idle: '',
    oil_pressure_full: '',
    oil_temperature: '',
    engine_smoke: '',
    engine_vibration: '',
    check_engine_leakage: '',
    // Cylinder
    cylinder_head_temp: '',
    cylinder_no: '',
    cylinder_a1: '',
    cylinder_a2: '',
    cylinder_a3: '',
    cylinder_a4: '',
    cylinder_a5: '',
    cylinder_a6: '',
    cylinder_b1: '',
    cylinder_b2: '',
    cylinder_b3: '',
    cylinder_b4: '',
    cylinder_b5: '',
    cylinder_b6: '',
    // Parts Reference
    starter_part_no: '',
    alternator_part_no: '',
    v_belt_part_no: '',
    air_filter_part_no: '',
    oil_filter_part_no: '',
    fuel_filter_part_no: '',
    pre_fuel_filter_part_no: '',
    controller_brand: '',
    controller_model: '',
    remarks: '',
    recommendation: '',
    attending_technician: '',
    attending_technician_signature: '',
    approved_by: '',
    approved_by_signature: '',
    acknowledged_by: '',
    acknowledged_by_signature: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users');
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
        toast.error("Failed to load users for signature fields.");
      }
    };

    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData(prev => ({ ...prev, [name]: signature }));
  };

  const uploadSignatureToStorage = async (base64Signature: string, fileName: string): Promise<string | null> => {
    if (!base64Signature) return null;

    try {
      // Convert base64 to blob
      const base64Response = await fetch(base64Signature);
      const blob = await base64Response.blob();

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) {
        console.error('Error uploading signature:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error processing signature:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const loadingToastId = toast.loading('Submitting report...');

    try {
      // Upload signatures to Supabase storage
      const timestamp = Date.now();
      const attendingTechSignatureUrl = await uploadSignatureToStorage(
        formData.attending_technician_signature,
        `commissioning-attending-technician-${timestamp}.png`
      );
      const approvedBySignatureUrl = await uploadSignatureToStorage(
        formData.approved_by_signature,
        `commissioning-approved-by-${timestamp}.png`
      );
      const acknowledgedBySignatureUrl = await uploadSignatureToStorage(
        formData.acknowledged_by_signature,
        `commissioning-acknowledged-by-${timestamp}.png`
      );

      // Map form state to API schema with signature URLs
      const payload = {
        ...formData,
        attending_technician_signature: attendingTechSignatureUrl || '',
        approved_by_signature: approvedBySignatureUrl || '',
        acknowledged_by_signature: acknowledgedBySignatureUrl || '',
        summary: formData.inspection_summary,
        comments_action: formData.inspection_comments,
      };

      const response = await fetch('/api/forms/deutz-commissioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Success:', result);
        toast.success('Commissioning Report submitted successfully!', { id: loadingToastId });
        setFormData({
          reporting_person_name: '',
          telephone_fax: '',
          equipment_name: '',
          running_hours: '',
          customer_name: '',
          contact_person: '',
          address: '',
          email_address: '',
          commissioning_location: '',
          commissioning_date: '',
          engine_model: '',
          engine_serial_no: '',
          commissioning_no: '',
          equipment_manufacturer: '',
          equipment_no: '',
          equipment_type: '',
          output: '',
          revolutions: '',
          main_effective_pressure: '',
          lube_oil_type: '',
          fuel_type: '',
          cooling_water_additives: '',
          fuel_pump_serial_no: '',
          fuel_pump_code: '',
          turbo_model: '',
          turbo_serial_no: '',
          // Inspection Prior Test
          inspection_summary: '',
          check_oil_level: '',
          check_air_filter: '',
          check_hoses_clamps: '',
          check_engine_support: '',
          check_v_belt: '',
          check_water_level: '',
          crankshaft_end_play: '',
          inspector: '',
          inspection_comments: '',
          // Operational Readings
          rpm_idle_speed: '',
          rpm_full_speed: '',
          oil_pressure_idle: '',
          oil_pressure_full: '',
          oil_temperature: '',
          engine_smoke: '',
          engine_vibration: '',
          check_engine_leakage: '',
          // Cylinder
          cylinder_head_temp: '',
          cylinder_no: '',
          cylinder_a1: '',
          cylinder_a2: '',
          cylinder_a3: '',
          cylinder_a4: '',
          cylinder_a5: '',
          cylinder_a6: '',
          cylinder_b1: '',
          cylinder_b2: '',
          cylinder_b3: '',
          cylinder_b4: '',
          cylinder_b5: '',
          cylinder_b6: '',
          // Parts Reference
          starter_part_no: '',
          alternator_part_no: '',
          v_belt_part_no: '',
          air_filter_part_no: '',
          oil_filter_part_no: '',
          fuel_filter_part_no: '',
          pre_fuel_filter_part_no: '',
          controller_brand: '',
          controller_model: '',
          remarks: '',
          recommendation: '',
          attending_technician: '',
          attending_technician_signature: '',
          approved_by: '',
          approved_by_signature: '',
          acknowledged_by: '',
          acknowledged_by_signature: '',
        });
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData);
        toast.error(`Failed to submit report: ${errorData.error || 'Unknown error'}`, { id: loadingToastId });
      }
    } catch (error) {
      console.error('Network error:', error);
      toast.error('A network error occurred. Please try again.', { id: loadingToastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
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
        {/* Section 1: General Information */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">General Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} />
                <Input label="Commissioning Date" name="commissioning_date" type="date" value={formData.commissioning_date} onChange={handleChange} />
                <Input label="Commissioning No." name="commissioning_no" value={formData.commissioning_no} onChange={handleChange} />
                <Input label="Equipment Name" name="equipment_name" value={formData.equipment_name} onChange={handleChange} />
                
                <div className="lg:col-span-2">
                   <Input label="Customer Name" name="customer_name" value={formData.customer_name} onChange={handleChange} />
                </div>
                <Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
                <Input label="Telephone / Fax" name="telephone_fax" value={formData.telephone_fax} onChange={handleChange} />
                
                <div className="lg:col-span-2">
                    <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
                </div>
                <div className="lg:col-span-2">
                     <Input label="Commissioning Location" name="commissioning_location" value={formData.commissioning_location} onChange={handleChange} />
                </div>
                <Input label="Email Address" name="email_address" type="email" value={formData.email_address} onChange={handleChange} />
            </div>
        </div>

        {/* Section 2: Equipment & Engine Details */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Equipment & Engine Data</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
                <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
                <Input label="Equipment Type" name="equipment_type" value={formData.equipment_type} onChange={handleChange} />
                
                <Input label="Equipment No." name="equipment_no" value={formData.equipment_no} onChange={handleChange} />
                <Input label="Engine Model" name="engine_model" value={formData.engine_model} onChange={handleChange} />
                <Input label="Engine Serial No." name="engine_serial_no" value={formData.engine_serial_no} onChange={handleChange} />
                
                <Input label="Output (kW/HP)" name="output" value={formData.output} onChange={handleChange} />
                <Input label="Revolutions (RPM)" name="revolutions" value={formData.revolutions} onChange={handleChange} />
                <Input label="Main Effective Pressure" name="main_effective_pressure" value={formData.main_effective_pressure} onChange={handleChange} />

                 <Input label="Running Hours" name="running_hours" type="number" value={formData.running_hours} onChange={handleChange} />
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
                <div className="grid grid-cols-6 gap-4 mb-4">
                    <div className="font-bold text-center text-gray-600 text-sm">A1</div>
                    <div className="font-bold text-center text-gray-600 text-sm">A2</div>
                    <div className="font-bold text-center text-gray-600 text-sm">A3</div>
                    <div className="font-bold text-center text-gray-600 text-sm">A4</div>
                    <div className="font-bold text-center text-gray-600 text-sm">A5</div>
                    <div className="font-bold text-center text-gray-600 text-sm">A6</div>
                    
                    <input name="cylinder_a1" value={formData.cylinder_a1} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_a2" value={formData.cylinder_a2} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_a3" value={formData.cylinder_a3} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_a4" value={formData.cylinder_a4} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_a5" value={formData.cylinder_a5} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_a6" value={formData.cylinder_a6} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                </div>
                <div className="grid grid-cols-6 gap-4">
                    <div className="font-bold text-center text-gray-600 text-sm">B1</div>
                    <div className="font-bold text-center text-gray-600 text-sm">B2</div>
                    <div className="font-bold text-center text-gray-600 text-sm">B3</div>
                    <div className="font-bold text-center text-gray-600 text-sm">B4</div>
                    <div className="font-bold text-center text-gray-600 text-sm">B5</div>
                    <div className="font-bold text-center text-gray-600 text-sm">B6</div>
                    
                    <input name="cylinder_b1" value={formData.cylinder_b1} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_b2" value={formData.cylinder_b2} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_b3" value={formData.cylinder_b3} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_b4" value={formData.cylinder_b4} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_b5" value={formData.cylinder_b5} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
                    <input name="cylinder_b6" value={formData.cylinder_b6} onChange={handleChange} className="text-center border rounded p-1 text-sm" placeholder="Temp" />
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
            </div>
        </div>

        {/* Section 9: Signatures */}
        <div>
            <div className="flex items-center mb-4">
                <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                <h3 className="text-lg font-bold text-gray-800 uppercase">Signatures</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gray-50 p-8 rounded-lg border border-gray-100">
                <div className="flex flex-col space-y-4">
                    <Select label="Attending Technician" name="attending_technician" value={formData.attending_technician} onChange={handleChange} options={users.map(user => user.fullName)} />
                    <SignaturePad
                        label="Draw Signature"
                        value={formData.attending_technician_signature}
                        onChange={(signature: string) => handleSignatureChange('attending_technician_signature', signature)}
                        subtitle="Technician"
                    />
                </div>
                <div className="flex flex-col space-y-4">
                    <Select label="Approved By" name="approved_by" value={formData.approved_by} onChange={handleChange} options={users.map(user => user.fullName)} />
                    <SignaturePad
                        label="Draw Signature"
                        value={formData.approved_by_signature}
                        onChange={(signature: string) => handleSignatureChange('approved_by_signature', signature)}
                        subtitle="Authorized Signature"
                    />
                </div>
                <div className="flex flex-col space-y-4">
                    <Select label="Acknowledged By" name="acknowledged_by" value={formData.acknowledged_by} onChange={handleChange} options={users.map(user => user.fullName)} />
                    <SignaturePad
                        label="Draw Signature"
                        value={formData.acknowledged_by_signature}
                        onChange={(signature: string) => handleSignatureChange('acknowledged_by_signature', signature)}
                        subtitle="Customer Signature"
                    />
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-6 pb-12">
            <button type="button" className="mr-4 bg-white text-gray-700 font-bold py-3 px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150">
                Cancel
            </button>
            <button type="submit" className="bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-3 px-10 rounded-lg shadow-md transition duration-150 flex items-center" disabled={isLoading}>
                <span className="mr-2">Submit Commissioning Report</span>
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    const syntheticEvent = {
      target: { name, value: option }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 shadow-sm"
          placeholder="Select or type a name"
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
        >
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </button>
        {showDropdown && options.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((opt: string) => (
              <div
                key={opt}
                onClick={() => handleSelectOption(opt)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900"
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
