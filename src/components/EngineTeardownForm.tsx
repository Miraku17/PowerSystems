"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import SignatorySelect from './SignatorySelect';
import ConfirmationModal from "./ConfirmationModal";
import { useEngineTeardownFormStore } from "@/stores/engineTeardownFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';
import { useUsers, useCustomers } from '@/hooks/useSharedQueries';

export default function EngineTeardownForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, resetFormData } = useEngineTeardownFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();
  const { uploadFiles } = useSupabaseUpload();

  const [attachments, setAttachments] = useState<{ file: File; title: string }[]>([]);
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
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ [name]: checked });
    } else {
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
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      customer: customer.customer || customer.name || "",
    });
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
      // Step 1: Upload all images to Supabase Storage
      const uploadedData: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }> = [];

      if (attachments.length > 0) {
        const loadingToastId = toast.loading('Uploading images to storage...');
        const results = await uploadFiles(
          attachments.map(a => a.file),
          { bucket: 'service-reports', pathPrefix: 'engine/teardown' }
        );

        const failedUploads = results.filter(r => !r.success);
        if (failedUploads.length > 0) {
          console.error('Some files failed to upload:', failedUploads);
          toast.error(`Failed to upload ${failedUploads.length} file(s)`, { id: loadingToastId, duration: 5000 });
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

        toast.success('Images uploaded successfully', { id: loadingToastId });
      }

      // Step 2: Submit form data with URLs to API
      await submit({
        formType: 'engine-teardown',
        formData: {
          ...formData,
          uploaded_attachments: JSON.stringify(uploadedData),
        } as unknown as Record<string, unknown>,
        onSuccess: () => {
          setAttachments([]);
          resetFormData();
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_number || formData.job_number.trim() === '') {
      toast.error('Job Number is required');
      return;
    }

    setIsModalOpen(true);
  };

  const CheckboxField = ({ label, name }: { label: string; name: string }) => (
    <label className="flex items-center space-x-2 text-sm">
      <input
        type="checkbox"
        name={name}
        checked={formData[name as keyof typeof formData] as boolean || false}
        onChange={handleChange}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-gray-700">{label}</span>
    </label>
  );

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Inc.</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City</p>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Tel No.:</span> 287.8916, 285.0923
        </p>
        <div className="mt-6">
          <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Engine Teardown Report
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Customer *</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                required
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed transition"
              />
            </div>
            <div>
              <JobOrderAutocomplete
                label="Job Number"
                value={formData.job_number}
                onChange={(value) => setFormData({ job_number: value })}
                onSelect={(jo) => setFormData({
                  job_number: jo.shop_field_jo_number || "",
                  customer: jo.full_customer_name || "",
                })}
                jobOrders={approvedJOs}
                required
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">Serial No.</label>
              <input
                type="text"
                name="serial_no"
                value={formData.serial_no}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 1. Cylinder Block */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">1. Cylinder Block</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cam Shaft Bushing Bore</label>
              <input
                type="text"
                name="cam_shaft_bushing_bore"
                value={formData.cam_shaft_bushing_bore}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cylinder Liner Counter Bore</label>
              <input
                type="text"
                name="cylinder_liner_counter_bore"
                value={formData.cylinder_liner_counter_bore}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Liner to Block Clearance</label>
              <input
                type="text"
                name="liner_to_block_clearance"
                value={formData.liner_to_block_clearance}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Lower Liner Bore</label>
              <input
                type="text"
                name="lower_liner_bore"
                value={formData.lower_liner_bore}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Upper Liner Bore</label>
              <input
                type="text"
                name="upper_liner_bore"
                value={formData.upper_liner_bore}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Top Deck</label>
              <input
                type="text"
                name="top_deck"
                value={formData.top_deck}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="cylinder_block_comments"
                value={formData.cylinder_block_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 2. Main Bearings */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">2. Main Bearings - Cause</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CheckboxField label="Fine Particle Abrasion" name="main_bearing_fine_particle_abrasion" />
              <CheckboxField label="Coarse Particle Abrasion" name="main_bearing_coarse_particle_abrasion" />
              <CheckboxField label="Immobile Dirt Particle" name="main_bearing_immobile_dirt_particle" />
              <CheckboxField label="Insufficient Lubricant" name="main_bearing_insufficient_lubricant" />
              <CheckboxField label="Water in Lubricant" name="main_bearing_water_in_lubricant" />
              <CheckboxField label="Fuel in Lubricant" name="main_bearing_fuel_in_lubricant" />
              <CheckboxField label="Chemical Corrosion" name="main_bearing_chemical_corrosion" />
              <CheckboxField label="Cavitation Long Idle Period" name="main_bearing_cavitation_long_idle_period" />
              <CheckboxField label="Oxide Build-up" name="main_bearing_oxide_buildup" />
              <CheckboxField label="Cold Start" name="main_bearing_cold_start" />
              <CheckboxField label="Hot Shut Down" name="main_bearing_hot_shut_down" />
              <CheckboxField label="Offside Wear" name="main_bearing_offside_wear" />
              <CheckboxField label="Thrust Load Failure" name="main_bearing_thrust_load_failure" />
              <CheckboxField label="Installation Technique" name="main_bearing_installation_technique" />
              <CheckboxField label="Dislocation of Bearing" name="main_bearing_dislocation_of_bearing" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="main_bearing_comments"
                value={formData.main_bearing_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 3. Con Rod Bearings */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">3. Con Rod Bearings - Cause</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CheckboxField label="Fine Particle Abrasion" name="con_rod_bearing_fine_particle_abrasion" />
              <CheckboxField label="Coarse Particle Abrasion" name="con_rod_bearing_coarse_particle_abrasion" />
              <CheckboxField label="Immobile Dirt Particle" name="con_rod_bearing_immobile_dirt_particle" />
              <CheckboxField label="Insufficient Lubricant" name="con_rod_bearing_insufficient_lubricant" />
              <CheckboxField label="Water in Lubricant" name="con_rod_bearing_water_in_lubricant" />
              <CheckboxField label="Fuel in Lubricant" name="con_rod_bearing_fuel_in_lubricant" />
              <CheckboxField label="Chemical Corrosion" name="con_rod_bearing_chemical_corrosion" />
              <CheckboxField label="Cavitation Long Idle Period" name="con_rod_bearing_cavitation_long_idle_period" />
              <CheckboxField label="Oxide Build-up" name="con_rod_bearing_oxide_buildup" />
              <CheckboxField label="Cold Start" name="con_rod_bearing_cold_start" />
              <CheckboxField label="Hot Shut Down" name="con_rod_bearing_hot_shut_down" />
              <CheckboxField label="Offside Wear" name="con_rod_bearing_offside_wear" />
              <CheckboxField label="Thrust Load Failure" name="con_rod_bearing_thrust_load_failure" />
              <CheckboxField label="Installation Technique" name="con_rod_bearing_installation_technique" />
              <CheckboxField label="Dislocation of Bearing" name="con_rod_bearing_dislocation_of_bearing" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="con_rod_bearing_comments"
                value={formData.con_rod_bearing_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 4. Connecting Rod Arms */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">4. Connecting Rod Arms</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Left Bank - Serviceable</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <CheckboxField key={`left-${num}`} label={`${num}`} name={`con_rod_left_${num}_serviceable`} />
                  ))}
                </div>
              </div>

              {/* Right Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Right Bank - Serviceable</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <CheckboxField key={`right-${num}`} label={`${num}`} name={`con_rod_right_${num}_serviceable`} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Cause</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CheckboxField label="Process Imperfection" name="con_rod_process_imperfection" />
                <CheckboxField label="Forming & Machining Faults" name="con_rod_forming_machining_faults" />
                <CheckboxField label="Critical Design Feature" name="con_rod_critical_design_feature" />
                <CheckboxField label="Hydraulic Lock" name="con_rod_hydraulic_lock" />
                <CheckboxField label="Bending" name="con_rod_bending" />
                <CheckboxField label="Foreign Materials" name="con_rod_foreign_materials" />
                <CheckboxField label="Misalignment" name="con_rod_misalignment" />
                <CheckboxField label="Others" name="con_rod_others" />
                <CheckboxField label="Bearing Failure" name="con_rod_bearing_failure" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="con_rod_comments"
                value={formData.con_rod_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 5. Conrod Bushes */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">5. Conrod Bushes</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Left Bank - Serviceable</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <CheckboxField key={`bush-left-${num}`} label={`${num}`} name={`conrod_bush_left_${num}_serviceable`} />
                  ))}
                </div>
              </div>

              {/* Right Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Right Bank - Serviceable</h4>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <CheckboxField key={`bush-right-${num}`} label={`${num}`} name={`conrod_bush_right_${num}_serviceable`} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Cause</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CheckboxField label="Piston Cracking" name="conrod_bush_piston_cracking" />
                <CheckboxField label="Dirt Entry" name="conrod_bush_dirt_entry" />
                <CheckboxField label="Oil Contamination" name="conrod_bush_oil_contamination" />
                <CheckboxField label="Cavitation" name="conrod_bush_cavitation" />
                <CheckboxField label="Counter weighting" name="conrod_bush_counter_weighting" />
                <CheckboxField label="Corrosion" name="conrod_bush_corrosion" />
                <CheckboxField label="Thermal Fatigue" name="conrod_bush_thermal_fatigue" />
                <CheckboxField label="Others" name="conrod_bush_others" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="conrod_bush_comments"
                value={formData.conrod_bush_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 6. Crankshaft */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">6. Crankshaft</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                name="crankshaft_status"
                value={formData.crankshaft_status}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="serviceable">Serviceable</option>
                <option value="non_serviceable">Non-Serviceable</option>
                <option value="require_repair">Require Repair</option>
              </select>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Cause</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CheckboxField label="Excessive Load" name="crankshaft_excessive_load" />
                <CheckboxField label="Mismatch of Gears/Transmission" name="crankshaft_mismatch_gears_transmission" />
                <CheckboxField label="Bad Radius Blend Fillets" name="crankshaft_bad_radius_blend_fillets" />
                <CheckboxField label="Bearing Failure" name="crankshaft_bearing_failure" />
                <CheckboxField label="Cracked" name="crankshaft_cracked" />
                <CheckboxField label="Others" name="crankshaft_others" />
                <CheckboxField label="Contamination" name="crankshaft_contamination" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="crankshaft_comments"
                value={formData.crankshaft_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 7. Camshaft */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">7. Camshaft</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Left Bank</h4>
                <div className="space-y-2">
                  <CheckboxField label="Serviceable" name="camshaft_left_serviceable" />
                  <CheckboxField label="Bushing Failure" name="camshaft_left_bushing_failure" />
                  <CheckboxField label="Lobe or Follower Failure" name="camshaft_left_lobe_follower_failure" />
                  <CheckboxField label="Overhead Adjustment" name="camshaft_left_overhead_adjustment" />
                  <CheckboxField label="Others" name="camshaft_left_others" />
                </div>
              </div>

              {/* Right Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Right Bank</h4>
                <div className="space-y-2">
                  <CheckboxField label="Serviceable" name="camshaft_right_serviceable" />
                  <CheckboxField label="Bushing Failure" name="camshaft_right_bushing_failure" />
                  <CheckboxField label="Lobe or Follower Failure" name="camshaft_right_lobe_follower_failure" />
                  <CheckboxField label="Overhead Adjustment" name="camshaft_right_overhead_adjustment" />
                  <CheckboxField label="Others" name="camshaft_right_others" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="camshaft_comments"
                value={formData.camshaft_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 8-11: Simple Components */}
        {[
          { title: '8. Vibration Damper', prefix: 'vibration_damper', causes: ['running_hours', 'others'] },
          { title: '9. Cylinder Heads', prefix: 'cylinder_heads', hasStatus: true, causes: ['cracked_valve_injector_port', 'valve_failure', 'cracked_valve_port', 'broken_valve_spring', 'cracked_head_core', 'others_scratches_pinholes'] },
          { title: '10. Engine Valves', prefix: 'engine_valves', causes: ['erosion_fillet', 'thermal_fatigue', 'stuck_up', 'broken_stem', 'guttering_channeling', 'others', 'mechanical_fatigue'] },
          { title: '11. Valve Crossheads', prefix: 'valve_crossheads', causes: [] },
        ].map((section) => (
          <div key={section.prefix}>
            <div className="flex items-center mb-4">
              <div className="w-1 h-6 bg-blue-600 mr-2"></div>
              <h3 className="text-lg font-bold text-gray-800 uppercase">{section.title}</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4">
              {section.hasStatus ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    name={`${section.prefix}_status`}
                    value={formData[`${section.prefix}_status` as keyof typeof formData] as string}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="serviceable">Serviceable</option>
                    <option value="non_serviceable">Non-Serviceable</option>
                    <option value="require_repair">Require Repair</option>
                  </select>
                </div>
              ) : (
                <CheckboxField label="Serviceable" name={`${section.prefix}_serviceable`} />
              )}

              {section.causes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Cause</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.causes.map(cause => (
                      <CheckboxField
                        key={cause}
                        label={cause.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        name={`${section.prefix}_${cause}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
                <textarea
                  name={`${section.prefix}_comments`}
                  value={formData[`${section.prefix}_comments` as keyof typeof formData] as string}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>
        ))}

        {/* 12. Pistons */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">12. Pistons</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Left Bank</h4>
                <div className="space-y-2">
                  <CheckboxField label="Serviceable" name="pistons_left_serviceable" />
                  <CheckboxField label="Scored" name="pistons_left_scored" />
                  <CheckboxField label="Crown Damage" name="pistons_left_crown_damage" />
                  <CheckboxField label="Burning" name="pistons_left_burning" />
                  <CheckboxField label="Piston Fracture" name="pistons_left_piston_fracture" />
                  <CheckboxField label="Thrust and anti-thrust scoring" name="pistons_left_thrust_anti_thrust_scoring" />
                  <CheckboxField label="Ring Groove Wear" name="pistons_left_ring_groove_wear" />
                  <CheckboxField label="Pin Bore Wear" name="pistons_left_pin_bore_wear" />
                </div>
              </div>

              {/* Right Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Right Bank</h4>
                <div className="space-y-2">
                  <CheckboxField label="Serviceable" name="pistons_right_serviceable" />
                  <CheckboxField label="Scored" name="pistons_right_scored" />
                  <CheckboxField label="Crown Damage" name="pistons_right_crown_damage" />
                  <CheckboxField label="Burning" name="pistons_right_burning" />
                  <CheckboxField label="Piston Fracture" name="pistons_right_piston_fracture" />
                  <CheckboxField label="Thrust and anti-thrust scoring" name="pistons_right_thrust_anti_thrust_scoring" />
                  <CheckboxField label="Ring Groove Wear" name="pistons_right_ring_groove_wear" />
                  <CheckboxField label="Pin Bore Wear" name="pistons_right_pin_bore_wear" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="pistons_comments"
                value={formData.pistons_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 13. Cylinder Liners */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">13. Cylinder Liners</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Left Bank</h4>
                <div className="space-y-2">
                  <CheckboxField label="Serviceable" name="cylinder_liners_left_serviceable" />
                  <CheckboxField label="Scoring" name="cylinder_liners_left_scoring" />
                  <CheckboxField label="Corrosion" name="cylinder_liners_left_corrosion" />
                  <CheckboxField label="Cracking" name="cylinder_liners_left_cracking" />
                  <CheckboxField label="Fretting" name="cylinder_liners_left_fretting" />
                  <CheckboxField label="Cavitation" name="cylinder_liners_left_cavitation" />
                  <CheckboxField label="Pin Holes" name="cylinder_liners_left_pin_holes" />
                </div>
              </div>

              {/* Right Bank */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Right Bank</h4>
                <div className="space-y-2">
                  <CheckboxField label="Serviceable" name="cylinder_liners_right_serviceable" />
                  <CheckboxField label="Scoring" name="cylinder_liners_right_scoring" />
                  <CheckboxField label="Corrosion" name="cylinder_liners_right_corrosion" />
                  <CheckboxField label="Cracking" name="cylinder_liners_right_cracking" />
                  <CheckboxField label="Fretting" name="cylinder_liners_right_fretting" />
                  <CheckboxField label="Cavitation" name="cylinder_liners_right_cavitation" />
                  <CheckboxField label="Pin Holes" name="cylinder_liners_right_pin_holes" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
              <textarea
                name="cylinder_liners_comments"
                value={formData.cylinder_liners_comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* 14-21: Simple Serviceable Components */}
        {[
          { title: '14. Timing Gear', prefix: 'timing_gear' },
          { title: '15. Turbo Chargers', prefix: 'turbo_chargers' },
          { title: '16. Accessories Drive', prefix: 'accessories_drive' },
          { title: '17. Idler Gear', prefix: 'idler_gear' },
          { title: '18. Oil Pump', prefix: 'oil_pump' },
          { title: '19. Water Pump', prefix: 'water_pump' },
          { title: '20. Starting Motor', prefix: 'starting_motor' },
          { title: '21. Charging Alternator', prefix: 'charging_alternator' },
        ].map((section) => (
          <div key={section.prefix}>
            <div className="flex items-center mb-4">
              <div className="w-1 h-6 bg-blue-600 mr-2"></div>
              <h3 className="text-lg font-bold text-gray-800 uppercase">{section.title}</h3>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4">
              <CheckboxField label="Serviceable" name={`${section.prefix}_serviceable`} />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comments</label>
                <textarea
                  name={`${section.prefix}_comments`}
                  value={formData[`${section.prefix}_comments` as keyof typeof formData] as string}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>
        ))}

        {/* 22. Missing Components */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">22. Missing Components</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <textarea
              name="missing_components"
              value={formData.missing_components}
              onChange={handleChange}
              rows={8}
              placeholder="List all missing components here..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* 23. Major Components Summary */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">23. Major Components Summary Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            {[
              { label: 'Cylinder Block', name: 'component_cylinder_block' },
              { label: 'Crankshaft', name: 'component_crankshaft' },
              { label: 'Camshaft', name: 'component_camshaft' },
              { label: 'Connecting Rod', name: 'component_connecting_rod' },
              { label: 'Timing Gear', name: 'component_timing_gear' },
              { label: 'Idler Gear', name: 'component_idler_gear' },
              { label: 'Accessory Drive Gear', name: 'component_accessory_drive_gear' },
              { label: 'Water Pump Drive Gear', name: 'component_water_pump_drive_gear' },
              { label: 'Cylinder Head', name: 'component_cylinder_head' },
              { label: 'Oil Cooler', name: 'component_oil_cooler' },
              { label: 'Exhaust Manifold', name: 'component_exhaust_manifold' },
              { label: 'Turbo Chargers', name: 'component_turbo_chargers' },
              { label: 'Intake Manifold', name: 'component_intake_manifold' },
              { label: 'Flywheel Housing', name: 'component_flywheel_housing' },
              { label: 'Flywheel', name: 'component_flywheel' },
              { label: 'Ring Gear', name: 'component_ring_gear' },
              { label: 'Oil Pan', name: 'component_oil_pan' },
              { label: 'Front Engine Support', name: 'component_front_engine_support' },
              { label: 'Rear Engine Support', name: 'component_rear_engine_support' },
              { label: 'Front Engine Cover', name: 'component_front_engine_cover' },
              { label: 'Pulleys', name: 'component_pulleys' },
              { label: 'Fan Hub', name: 'component_fan_hub' },
              { label: 'Air Compressor', name: 'component_air_compressor' },
              { label: 'Injection Pump', name: 'component_injection_pump' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{field.label}</label>
                <input
                  type="text"
                  name={field.name}
                  value={formData[field.name as keyof typeof formData] as string}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Others</label>
              <textarea
                name="component_others"
                value={formData.component_others}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Signatures Section */}
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
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => resetFormData()}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm Submission"
        message="Are you sure you want to submit this Engine Teardown Report? Please review all information carefully before proceeding."
      />
    </div>
  );
}

