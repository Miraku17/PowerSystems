"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { compressImageIfNeeded } from '@/lib/imageCompression';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import SignatorySelect from "./SignatorySelect";
import { useCurrentUser } from "@/stores/authStore";
import { useUsers, useCustomers } from "@/hooks/useSharedQueries";
import { useSignatoryApproval } from "@/hooks/useSignatoryApproval";
import ConfirmationModal from "@/components/ConfirmationModal";

interface EditEngineSurfacePumpCommissioningProps {
  data: Record<string, any>;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
  onSignatoryChange?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

interface Attachment { id: string; file_url: string; file_name: string; created_at: string; }

const Input = ({ label, name, value, type = "text", disabled = false, onChange }: { label: string; name: string; value: any; type?: string; disabled?: boolean; onChange: (name: string, value: any) => void; }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
    <input type={type} name={name} value={value || ""} onChange={(e) => onChange(name, e.target.value)} disabled={disabled} className={`w-full border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`} />
  </div>
);


export default function EditEngineSurfacePumpCommissioning({ data, recordId, onClose, onSaved, onSignatoryChange }: EditEngineSurfacePumpCommissioningProps) {
  const { uploadFiles } = useSupabaseUpload();
  const currentUser = useCurrentUser();
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();
  const [formData, setFormData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<string[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ file: File; title: string }[]>([]);
  const {
    notedByChecked,
    approvedByChecked,
    isLoading: approvalLoading,
    showConfirm,
    confirmTitle,
    confirmMessage,
    initCheckedState,
    requestToggle,
    cancelToggle,
    confirmToggle,
  } = useSignatoryApproval({ table: "engine_surface_pump_commissioning_report", recordId: data.id, onChanged: onSignatoryChange });

  useEffect(() => {
    initCheckedState(data.noted_by_checked || false, data.approved_by_checked || false);
  }, [data.noted_by_checked, data.approved_by_checked, initCheckedState]);

  useEffect(() => {
    const fetchAttachments = async () => { try { const response = await apiClient.get('/forms/engine-surface-pump-commissioning/attachments', { params: { report_id: recordId } }); setExistingAttachments(response.data.data || []); } catch (error) { console.error('Error fetching attachments:', error); } };
    fetchAttachments();
  }, [recordId]);

  const handleCustomerSelect = (customer: any) => {
    setFormData((prev: any) => ({
      ...prev,
      reporting_person_name: customer.name || "",
      customer: customer.customer || "",
      contact_person: customer.contactPerson || "",
      address: customer.address || "",
      email_or_contact: customer.email || customer.phone || "",
    }));
  };

  const handleChange = (name: string, value: any) => {
    const updates: Record<string, any> = { [name]: value };
    if (name === 'noted_by_name') {
      const matchedUser = users.find((u: any) => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'checked_approved_by_name') {
      const matchedUser = users.find((u: any) => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }
    setFormData((prev: any) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading("Saving changes...");
    try {
      const response = await apiClient.patch(`/forms/engine-surface-pump-commissioning?id=${recordId}`, formData);
      if (response.status === 200) {
        // Upload new attachments to Supabase storage first
        const uploadedNewAttachments: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }> = [];

        if (newAttachments.length > 0) {
          toast.loading('Uploading images...', { id: loadingToast });
          const results = await uploadFiles(
            newAttachments.map(a => a.file),
            { bucket: 'service-reports', pathPrefix: 'engine-surface/commissioning' }
          );
          results.forEach((r, i) => {
            if (r.success && r.url) {
              uploadedNewAttachments.push({
                url: r.url,
                title: newAttachments[i].title,
                fileName: newAttachments[i].file.name,
                fileType: newAttachments[i].file.type,
                fileSize: newAttachments[i].file.size,
              });
            } else {
              console.error(`Failed to upload file: ${r.error}`);
            }
          });
        }

        // Send attachment metadata as JSON
        toast.loading('Updating attachments...', { id: loadingToast });
        await apiClient.post('/forms/engine-surface-pump-commissioning/attachments', {
          report_id: recordId,
          attachments_to_delete: attachmentsToDelete,
          existing_attachments: existingAttachments,
          uploaded_new_attachments: uploadedNewAttachments,
        });
        toast.success("Report updated successfully!", { id: loadingToast });
        onSaved();
        onClose();
      }
    } catch (error: any) {
      console.error("Error updating report:", error);
      const errMsg = error.response?.data?.error;
      const displayError = typeof errMsg === 'string' ? errMsg : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : "Unknown error");
      toast.error(`Failed to update report: ${displayError}`, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div><h3 className="text-xl font-bold text-gray-900">Edit Engine Driven Surface Pump Commissioning Report</h3></div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><XMarkIcon className="h-6 w-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto space-y-8">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-md"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="Job Order" name="job_order" value={formData.job_order} onChange={handleChange} disabled /><Input label="J.O Date" name="jo_date" type="date" value={formData.jo_date?.split("T")[0] || ""} onChange={handleChange} /></div></div>

            <div><div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Basic Information</h4></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><CustomerAutocomplete label="Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} onSelect={handleCustomerSelect} customers={customers} searchKey="name" /><Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} /><Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} /><Input label="Commissioning Date" name="commissioning_date" type="date" value={formData.commissioning_date?.split("T")[0] || ""} onChange={handleChange} /><div className="lg:col-span-2"><Input label="Customer" name="customer" value={formData.customer} onChange={handleChange} /></div><Input label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} /><Input label="Email/Contact" name="email_or_contact" value={formData.email_or_contact} onChange={handleChange} /><div className="lg:col-span-4"><Input label="Address" name="address" value={formData.address} onChange={handleChange} /></div></div></div>

            <div><div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Pump Details</h4></div><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6"><Input label="Pump Maker" name="pump_maker" value={formData.pump_maker} onChange={handleChange} /><Input label="Pump Type" name="pump_type" value={formData.pump_type} onChange={handleChange} /><Input label="Impeller Material" name="impeller_material" value={formData.impeller_material} onChange={handleChange} /><Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} /><Input label="Pump Serial Number" name="pump_serial_number" value={formData.pump_serial_number} onChange={handleChange} /><Input label="RPM" name="pump_rpm" value={formData.pump_rpm} onChange={handleChange} /><Input label="Product Number" name="product_number" value={formData.product_number} onChange={handleChange} /><Input label="HMAX (Head)" name="hmax_head" value={formData.hmax_head} onChange={handleChange} /><Input label="QMAX (Flow)" name="qmax_flow" value={formData.qmax_flow} onChange={handleChange} /><Input label="Suction Size" name="suction_size" value={formData.suction_size} onChange={handleChange} /><Input label="Suction Connection" name="suction_connection" value={formData.suction_connection} onChange={handleChange} /><Input label="Suction Strainer P.N" name="suction_strainer_pn" value={formData.suction_strainer_pn} onChange={handleChange} /><Input label="Discharge Size" name="discharge_size" value={formData.discharge_size} onChange={handleChange} /><Input label="Discharge Connection" name="discharge_connection" value={formData.discharge_connection} onChange={handleChange} /><Input label="Configuration" name="configuration" value={formData.configuration} onChange={handleChange} /></div></div>

            <div><div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Engine Details</h4></div><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"><Input label="Engine Model" name="engine_model" value={formData.engine_model} onChange={handleChange} /><Input label="Serial Number" name="engine_serial_number" value={formData.engine_serial_number} onChange={handleChange} /><Input label="Horse Power" name="engine_horse_power" value={formData.engine_horse_power} onChange={handleChange} /><Input label="Injection Pump Model" name="injection_pump_model" value={formData.injection_pump_model} onChange={handleChange} /><Input label="Injection Pump Serial No." name="injection_pump_serial_no" value={formData.injection_pump_serial_no} onChange={handleChange} /><Input label="Pump Code" name="pump_code" value={formData.pump_code} onChange={handleChange} /><Input label="Turbo Charger Brand" name="turbo_charger_brand" value={formData.turbo_charger_brand} onChange={handleChange} /><Input label="Turbo Charger Model" name="turbo_charger_model" value={formData.turbo_charger_model} onChange={handleChange} /><Input label="Turbo Charger Serial No." name="turbo_charger_serial_no" value={formData.turbo_charger_serial_no} onChange={handleChange} /><Input label="Type of Fuel" name="type_of_fuel" value={formData.type_of_fuel} onChange={handleChange} /><Input label="Engine Oil" name="engine_oil" value={formData.engine_oil} onChange={handleChange} /><Input label="Cooling Type" name="cooling_type" value={formData.cooling_type} onChange={handleChange} /><Input label="Fuel Filter P.N." name="fuel_filter_pn" value={formData.fuel_filter_pn} onChange={handleChange} /><Input label="Oil Filter P.N." name="oil_filter_pn" value={formData.oil_filter_pn} onChange={handleChange} /><Input label="Air Filter P.N." name="air_filter_pn" value={formData.air_filter_pn} onChange={handleChange} /><Input label="Charging Alternator P.N." name="charging_alternator_pn" value={formData.charging_alternator_pn} onChange={handleChange} /><Input label="Starting Motor P.N." name="starting_motor_pn" value={formData.starting_motor_pn} onChange={handleChange} /><Input label="Radiator Fan Belt P.N." name="radiator_fan_belt_pn" value={formData.radiator_fan_belt_pn} onChange={handleChange} /><Input label="Alternator Belt P.N." name="alternator_belt_pn" value={formData.alternator_belt_pn} onChange={handleChange} /><Input label="System Voltage" name="system_voltage" value={formData.system_voltage} onChange={handleChange} /></div></div>

            <div><div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Installation Details</h4></div><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"><Input label="Location" name="location" value={formData.location} onChange={handleChange} /><Input label="Static Head" name="static_head" value={formData.static_head} onChange={handleChange} /><Input label="Suction Pipe Size" name="suction_pipe_size" value={formData.suction_pipe_size} onChange={handleChange} /><Input label="Suction Pipe Length" name="suction_pipe_length" value={formData.suction_pipe_length} onChange={handleChange} /><Input label="Suction Pipe Type" name="suction_pipe_type" value={formData.suction_pipe_type} onChange={handleChange} /><Input label="Discharge Pipe Size" name="discharge_pipe_size" value={formData.discharge_pipe_size} onChange={handleChange} /><Input label="Discharge Pipe Length" name="discharge_pipe_length" value={formData.discharge_pipe_length} onChange={handleChange} /><Input label="Discharge Pipe Type" name="discharge_pipe_type" value={formData.discharge_pipe_type} onChange={handleChange} /><Input label="Check Valve Size/Type" name="check_valve_size_type" value={formData.check_valve_size_type} onChange={handleChange} /><Input label="No. of Elbows/Size" name="no_of_elbows_size" value={formData.no_of_elbows_size} onChange={handleChange} /><Input label="Media to be Pump" name="media_to_be_pump" value={formData.media_to_be_pump} onChange={handleChange} /></div></div>

            <div><div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Operational Details</h4></div><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"><Input label="Engine Idle RPM" name="engine_idle_rpm" value={formData.engine_idle_rpm} onChange={handleChange} /><Input label="Engine Full RPM" name="engine_full_rpm" value={formData.engine_full_rpm} onChange={handleChange} /><Input label="Oil Pressure @ Idle RPM" name="oil_pressure_idle_rpm" value={formData.oil_pressure_idle_rpm} onChange={handleChange} /><Input label="Oil Pressure @ Full RPM" name="oil_pressure_full_rpm" value={formData.oil_pressure_full_rpm} onChange={handleChange} /><Input label="Oil Temperature" name="oil_temperature" value={formData.oil_temperature} onChange={handleChange} /><Input label="Engine Exhaust Temperature" name="engine_exhaust_temperature" value={formData.engine_exhaust_temperature} onChange={handleChange} /><Input label="Engine Smoke Quality" name="engine_smoke_quality" value={formData.engine_smoke_quality} onChange={handleChange} /><Input label="Engine Vibration" name="engine_vibration" value={formData.engine_vibration} onChange={handleChange} /><Input label="Charging Voltage" name="charging_voltage" value={formData.charging_voltage} onChange={handleChange} /><Input label="Engine Running Hours" name="engine_running_hours" value={formData.engine_running_hours} onChange={handleChange} /><Input label="Pump Discharge Pressure" name="pump_discharge_pressure" value={formData.pump_discharge_pressure} onChange={handleChange} /><Input label="Test Duration" name="test_duration" value={formData.test_duration} onChange={handleChange} /><Input label="Crankshaft End Play Prior Test" name="crankshaft_end_play_prior_test" value={formData.crankshaft_end_play_prior_test} onChange={handleChange} /><Input label="Crankshaft End Play Post Test" name="crankshaft_end_play_post_test" value={formData.crankshaft_end_play_post_test} onChange={handleChange} /></div></div>

            <div><div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Installation Photos</h4><span className="ml-2 text-xs font-normal text-gray-400 normal-case">(max 20 photos only)</span></div><div className="space-y-4">{existingAttachments.map((attachment) => (<div key={attachment.id} className="px-6 py-4 border-2 border-gray-300 rounded-md bg-white shadow-sm"><div className="flex items-start gap-4"><div className="shrink-0"><img src={attachment.file_url} alt={attachment.file_name} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200" /></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between"><input type="text" placeholder="Enter image title" value={attachment.file_name} onChange={(e) => { const updated = existingAttachments.map((att) => att.id === attachment.id ? { ...att, file_name: e.target.value } : att); setExistingAttachments(updated); }} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5" /><button type="button" onClick={() => { setAttachmentsToDelete([...attachmentsToDelete, attachment.id]); setExistingAttachments(existingAttachments.filter((att) => att.id !== attachment.id)); }} className="ml-4 text-red-600 hover:text-red-800 transition-colors shrink-0"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div></div></div></div>))}{newAttachments.map((attachment, index) => { const previewUrl = URL.createObjectURL(attachment.file); return (<div key={`new-${index}`} className="px-6 py-4 border-2 border-blue-300 rounded-md bg-blue-50 shadow-sm"><div className="flex items-start gap-4"><div className="shrink-0"><img src={previewUrl} alt={attachment.file.name} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200" onLoad={() => URL.revokeObjectURL(previewUrl)} /></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate mb-2">{attachment.file.name}</p><input type="text" placeholder="Enter image title" value={attachment.title} onChange={(e) => { const updated = [...newAttachments]; updated[index].title = e.target.value; setNewAttachments(updated); }} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5" /></div><button type="button" onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== index))} className="ml-4 text-red-600 hover:text-red-800 transition-colors shrink-0"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div></div></div></div>); })}<div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer"><div className="space-y-1 text-center"><svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="flex text-sm text-gray-600"><label htmlFor="file-upload-edit-engine-comm" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"><span>Upload an image</span><input id="file-upload-edit-engine-comm" type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => { if (e.target.files && e.target.files.length > 0) { const files = Array.from(e.target.files); if (existingAttachments.length + newAttachments.length + files.length > 20) { toast.error('Maximum 20 photos allowed'); e.target.value = ''; return; } const processed = []; for (const file of files) { if (!file.type.startsWith('image/')) { toast.error('Please select only image files'); continue; } const compressed = await compressImageIfNeeded(file); processed.push({ file: compressed, title: '' }); } if (processed.length > 0) setNewAttachments([...newAttachments, ...processed]); e.target.value = ''; } }} /></label><p className="pl-1">or drag and drop</p></div><p className={`text-xs ${existingAttachments.length + newAttachments.length >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>PNG, JPG, GIF up to 10MB ({existingAttachments.length + newAttachments.length}/20 photos)</p></div></div></div></div>

            <div><div className="flex items-center mb-4"><div className="w-1 h-6 bg-blue-600 mr-2"></div><h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"><div className="flex flex-col space-y-4"><SignatorySelect label="Service Technician" name="commissioned_by_name" value={formData.commissioned_by_name} signatureValue={formData.commissioned_by_signature} onChange={handleChange} onSignatureChange={(sig) => handleChange("commissioned_by_signature", sig)} users={users} subtitle="Svc Engineer/Technician" showAllUsers/></div><div className="flex flex-col space-y-4"><SignatorySelect label="Checked & Approved By" name="checked_approved_by_name" value={formData.checked_approved_by_name} signatureValue={formData.checked_approved_by_signature} onChange={handleChange} onSignatureChange={(sig) => handleChange("checked_approved_by_signature", sig)} users={users} subtitle="Svc. Supvr. / Supt." /><label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" checked={approvedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.approved_by_user_id)} onChange={(e) => requestToggle('approved_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" /><span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Approved"}</span></label></div><div className="flex flex-col space-y-4"><SignatorySelect label="Noted By" name="noted_by_name" value={formData.noted_by_name} signatureValue={formData.noted_by_signature} onChange={handleChange} onSignatureChange={(sig) => handleChange("noted_by_signature", sig)} users={users} subtitle="Svc. Manager" /><label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" checked={notedByChecked} disabled={approvalLoading || !currentUser || (currentUser.id !== data.noted_by_user_id)} onChange={(e) => requestToggle('noted_by', e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" /><span className="text-xs font-medium text-gray-600">{approvalLoading ? "Updating..." : "Noted"}</span></label></div><div className="flex flex-col space-y-4"><SignatorySelect label="Acknowledged By" name="acknowledged_by_name" value={formData.acknowledged_by_name} signatureValue={formData.acknowledged_by_signature} onChange={handleChange} onSignatureChange={(sig) => handleChange("acknowledged_by_signature", sig)} users={users} subtitle="Customer Representative" showAllUsers/></div></div></div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isSaving} className="px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all disabled:opacity-50">{isSaving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={cancelToggle}
        onConfirm={confirmToggle}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Yes, proceed"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}

interface CustomerAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: any) => void;
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
  ).sort((a, b) => (a[searchKey] || "").localeCompare(b[searchKey] || ""));

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value || ""}
          onChange={(e) => { onChange(name, e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full border text-sm rounded-md block p-2.5 transition-colors duration-200 ease-in-out shadow-sm bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
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
                <div className="font-medium">{customer[searchKey]}</div>
                {searchKey === "name" && customer.customer && (
                  <div className="text-xs text-gray-500">{customer.customer}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
