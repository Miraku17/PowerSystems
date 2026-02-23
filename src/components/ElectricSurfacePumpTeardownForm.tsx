"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import SignatorySelect from './SignatorySelect';
import ConfirmationModal from "./ConfirmationModal";
import { useElectricSurfacePumpTeardownFormStore } from "@/stores/electricSurfacePumpTeardownFormStore";
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';
import { useUsers, useCustomers } from '@/hooks/useSharedQueries';

export default function ElectricSurfacePumpTeardownForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, resetFormData } = useElectricSurfacePumpTeardownFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();

  // Supabase upload hook
  const { uploadFiles, uploadProgress, isUploading, cancelUpload } = useSupabaseUpload();

  // Approved job orders for autocomplete
  const approvedJOs = useApprovedJobOrders();

  const [motorComponentsAttachments, setMotorComponentsAttachments] = useState<{ file: File; title: string }[]>([]);
  const [wetEndAttachments, setWetEndAttachments] = useState<{ file: File; title: string }[]>([]);
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();

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
    if (name === 'checked_approved_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }

    setFormData(updates);
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

  const handleSignatoryChange = (name: string, value: string) => {
    const updates: Record<string, any> = { [name]: value };
    if (name === 'noted_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.noted_by_user_id = matchedUser?.id || '';
    }
    if (name === 'checked_approved_by_name') {
      const matchedUser = users.find(u => u.fullName === value);
      updates.approved_by_user_id = matchedUser?.id || '';
    }
    setFormData(updates);
  };

  // Compress image before adding to attachments
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;

          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    try {
      // Step 1: Upload all images to Supabase Storage
      const loadingToastId = toast.loading('Uploading images to storage...');

      const uploadedData: {
        motor_components: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }>;
        wet_end: Array<{ url: string; title: string; fileName: string; fileType: string; fileSize: number }>;
      } = {
        motor_components: [],
        wet_end: []
      };

      // Upload motor components attachments
      if (motorComponentsAttachments.length > 0) {
        const results = await uploadFiles(
          motorComponentsAttachments.map(a => a.file),
          {
            bucket: 'service-reports',
            pathPrefix: 'electric-surface-pump/teardown/motor-components'
          }
        );

        const successfulUploads = results.filter(r => r.success);
        const failedUploads = results.filter(r => !r.success);

        if (failedUploads.length > 0) {
          console.error('Some motor components files failed to upload:', failedUploads);
          const errorMsg = failedUploads[0]?.error || 'Unknown error';
          toast.error(`Failed to upload ${failedUploads.length} motor components file(s): ${errorMsg}`, { id: loadingToastId, duration: 5000 });
        }

        uploadedData.motor_components = successfulUploads.map((r, i) => ({
          url: r.url!,
          title: motorComponentsAttachments[i].title,
          fileName: motorComponentsAttachments[i].file.name,
          fileType: motorComponentsAttachments[i].file.type,
          fileSize: motorComponentsAttachments[i].file.size
        }));
      }

      // Upload wet-end attachments
      if (wetEndAttachments.length > 0) {
        const results = await uploadFiles(
          wetEndAttachments.map(a => a.file),
          {
            bucket: 'service-reports',
            pathPrefix: 'electric-surface-pump/teardown/wet-end'
          }
        );

        const successfulUploads = results.filter(r => r.success);
        const failedUploads = results.filter(r => !r.success);

        if (failedUploads.length > 0) {
          console.error('Some wet-end files failed to upload:', failedUploads);
          const errorMsg = failedUploads[0]?.error || 'Unknown error';
          toast.error(`Failed to upload ${failedUploads.length} wet-end file(s): ${errorMsg}`, { id: loadingToastId, duration: 5000 });
        }

        uploadedData.wet_end = successfulUploads.map((r, i) => ({
          url: r.url!,
          title: wetEndAttachments[i].title,
          fileName: wetEndAttachments[i].file.name,
          fileType: wetEndAttachments[i].file.type,
          fileSize: wetEndAttachments[i].file.size
        }));
      }

      toast.success('Images uploaded successfully', { id: loadingToastId });

      // Step 2: Submit form data with URLs to API
      await submit({
        formType: 'electric-surface-pump-teardown',
        formData: {
          ...formData,
          uploaded_attachments: JSON.stringify(uploadedData)
        } as unknown as Record<string, unknown>,
        onSuccess: () => {
          setMotorComponentsAttachments([]);
          setWetEndAttachments([]);
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

    if (!formData.job_order || formData.job_order.trim() === '') {
      toast.error('Job Order is required');
      return;
    }

    setIsModalOpen(true);
  };

  const renderAttachmentSection = (
    label: string,
    attachments: { file: File; title: string }[],
    setAttachments: React.Dispatch<React.SetStateAction<{ file: File; title: string }[]>>,
    inputId: string
  ) => (
    <div className="mb-6">
      <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
        {label}
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
            <label htmlFor={inputId} className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
              <span>Upload an image</span>
              <input
                id={inputId}
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

                    // Check file size
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    if (file.size > maxSize) {
                      toast.error('File size exceeds 10MB limit');
                      return;
                    }

                    // Automatically compress if file is larger than 2MB
                    const compressionThreshold = 2 * 1024 * 1024; // 2MB
                    if (file.size > compressionThreshold) {
                      const loadingToast = toast.loading('Compressing large image...');

                      try {
                        const compressedFile = await compressImage(file);
                        const originalSize = (file.size / 1024 / 1024).toFixed(2);
                        const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);

                        setAttachments([...attachments, { file: compressedFile, title: '' }]);

                        toast.success(
                          `Image compressed: ${originalSize}MB → ${compressedSize}MB`,
                          { id: loadingToast, duration: 2000 }
                        );
                      } catch (error) {
                        console.error('Error compressing image:', error);
                        toast.error('Failed to compress image, using original', { id: loadingToast });
                        setAttachments([...attachments, { file, title: '' }]);
                      }
                    } else {
                      // Use original file (already under 2MB)
                      setAttachments([...attachments, { file, title: '' }]);
                      toast.success('Image added');
                    }

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
  );

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
            Teardown Report
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
            <CustomerAutocomplete label="Name of Reporting Person" name="reporting_person_name" value={formData.reporting_person_name} onChange={handleChange} onSelect={handleCustomerSelect} customers={customers} searchKey="name" />
            <Input label="Contact Number" name="reporting_person_contact" value={formData.reporting_person_contact} onChange={handleChange} />
            <Input label="Equipment Manufacturer" name="equipment_manufacturer" value={formData.equipment_manufacturer} onChange={handleChange} />
            <div></div>
            <CustomerAutocomplete label="Customer" name="customer" value={formData.customer} onChange={handleChange} onSelect={handleCustomerSelect} customers={customers} searchKey="customer" />
            <CustomerAutocomplete label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} onSelect={handleCustomerSelect} customers={customers} searchKey="contactPerson" />
            <div className="lg:col-span-2">
              <CustomerAutocomplete label="Address" name="address" value={formData.address} onChange={handleChange} onSelect={handleCustomerSelect} customers={customers} searchKey="address" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="Pump Maker" name="pump_maker" value={formData.pump_maker} onChange={handleChange} />
            <Input label="Pump Type" name="pump_type" value={formData.pump_type} onChange={handleChange} />
            <Input label="Impeller Material" name="impeller_material" value={formData.impeller_material} onChange={handleChange} />
            <Input label="Pump Model" name="pump_model" value={formData.pump_model} onChange={handleChange} />
            <Input label="Pump Serial Number" name="pump_serial_number" value={formData.pump_serial_number} onChange={handleChange} />
            <Input label="RPM" name="pump_rpm" value={formData.pump_rpm} onChange={handleChange} />
            <Input label="Product Number" name="product_number" value={formData.product_number} onChange={handleChange} />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input label="Date In Service/Commissioning" name="date_in_service_commissioning" type="date" value={formData.date_in_service_commissioning} onChange={handleChange} />
            <Input label="Date Failed" name="date_failed" type="date" value={formData.date_failed} onChange={handleChange} />
            <Input label="Servicing Date" name="servicing_date" type="date" value={formData.servicing_date} onChange={handleChange} />
            <Input label="Running Hours" name="running_hours" value={formData.running_hours} onChange={handleChange} />
            <Input label="Location" name="location" value={formData.location} onChange={handleChange} />
          </div>
        </div>

        {/* Section: Warranty Coverage */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Warranty Coverage</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <BooleanSelect label="Is the unit within the coverage?" name="is_unit_within_coverage" value={formData.is_unit_within_coverage} onChange={(value) => handleBooleanChange('is_unit_within_coverage', value)} />
            <BooleanSelect label="If yes, is this a warrantable failure?" name="is_warrantable_failure" value={formData.is_warrantable_failure} onChange={(value) => handleBooleanChange('is_warrantable_failure', value)} />
          </div>
        </div>

        {/* Section: Reason for Teardown */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Reason for Teardown</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <TextArea label="Reason for Teardown" name="reason_for_teardown" value={formData.reason_for_teardown} onChange={handleChange} rows={3} />
          </div>
        </div>

        {/* Section: Motor Components Evaluation */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Motor Components Evaluation</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
              <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <img
                    src="/images/electric_driven_surface_pump_teardown/motor_components.png"
                    alt="Motor Components Reference"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Component</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow num={1} label="Fan Cover" name="motor_fan_cover" value={formData.motor_fan_cover} onChange={handleChange} />
                    <TableRow num={2} label="O Ring" name="motor_o_ring" value={formData.motor_o_ring} onChange={handleChange} />
                    <TableRow num={3} label="End Shield" name="motor_end_shield" value={formData.motor_end_shield} onChange={handleChange} />
                    <TableRow num={4} label="Rotor Shaft" name="motor_rotor_shaft" value={formData.motor_rotor_shaft} onChange={handleChange} />
                    <TableRow num={5} label="End Bearing" name="motor_end_bearing" value={formData.motor_end_bearing} onChange={handleChange} />
                    <TableRow num={6} label="Stator Winding" name="motor_stator_winding" value={formData.motor_stator_winding} onChange={handleChange} />
                    <TableRow num={7} label="Eyebolt" name="motor_eyebolt" value={formData.motor_eyebolt} onChange={handleChange} />
                    <TableRow num={8} label="Terminal Box" name="motor_terminal_box" value={formData.motor_terminal_box} onChange={handleChange} />
                    <TableRow num={9} label="Name Plate" name="motor_name_plate" value={formData.motor_name_plate} onChange={handleChange} />
                    <TableRow num={10} label="Fan" name="motor_fan" value={formData.motor_fan} onChange={handleChange} />
                    <TableRow num={11} label="Frame" name="motor_frame" value={formData.motor_frame} onChange={handleChange} />
                    <TableRow num={12} label="Rotor" name="motor_rotor" value={formData.motor_rotor} onChange={handleChange} />
                    <TableRow num={13} label="Front Bearing" name="motor_front_bearing" value={formData.motor_front_bearing} onChange={handleChange} />
                    <TableRow num={14} label="End Shield" name="motor_end_shield_2" value={formData.motor_end_shield_2} onChange={handleChange} />
                  </tbody>
                </table>
              </div>
          </div>
        </div>

        {/* Section: Motor Components Teardown Photos */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Motor Components Teardown Photos</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            {renderAttachmentSection("Motor Components Teardown Photos", motorComponentsAttachments, setMotorComponentsAttachments, "motor-components-upload")}
          </div>
        </div>

        {/* Section: Wet End Components Evaluation */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Wet End Components Evaluation</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-6">
              <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Reference Diagram</p>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <img
                    src="/images/electric_driven_surface_pump_teardown/wet_end_components.png"
                    alt="Wet End Components Reference"
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-8">#</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs w-48">Component</th>
                      <th className="text-left py-2 px-3 font-bold text-gray-700 uppercase text-xs">Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow num={1} label="Impeller" name="wet_end_impeller" value={formData.wet_end_impeller} onChange={handleChange} />
                    <TableRow num={2} label="Impeller Vanes" name="wet_end_impeller_vanes" value={formData.wet_end_impeller_vanes} onChange={handleChange} />
                    <TableRow num={3} label="Face Seal" name="wet_end_face_seal" value={formData.wet_end_face_seal} onChange={handleChange} />
                    <TableRow num={4} label="Shaft" name="wet_end_shaft" value={formData.wet_end_shaft} onChange={handleChange} />
                    <TableRow num={5} label="Bell Housing" name="wet_end_bell_housing" value={formData.wet_end_bell_housing} onChange={handleChange} />
                    <TableRow num={6} label="Bearings" name="wet_end_bearings" value={formData.wet_end_bearings} onChange={handleChange} />
                    <TableRow num={7} label="Vacuum Unit" name="wet_end_vacuum_unit" value={formData.wet_end_vacuum_unit} onChange={handleChange} />
                    <TableRow num={8} label="Oil Reservoir" name="wet_end_oil_reservoir" value={formData.wet_end_oil_reservoir} onChange={handleChange} />
                    <TableRow num={9} label="Vacuum Chamber" name="wet_end_vacuum_chamber" value={formData.wet_end_vacuum_chamber} onChange={handleChange} />
                    <TableRow num={10} label="Wear Ring" name="wet_end_wear_ring" value={formData.wet_end_wear_ring} onChange={handleChange} />
                    {/* Others */}
                    <tr className="border-b border-gray-200"><td colSpan={3} className="py-2 px-3 font-bold text-gray-700 uppercase text-xs">Others</td></tr>
                    <OthersTableRow num={11} nameField="wet_end_other_11_name" nameValue={formData.wet_end_other_11_name} valueField="wet_end_other_11_value" valueValue={formData.wet_end_other_11_value} onChange={handleChange} />
                    <OthersTableRow num={12} nameField="wet_end_other_12_name" nameValue={formData.wet_end_other_12_name} valueField="wet_end_other_12_value" valueValue={formData.wet_end_other_12_value} onChange={handleChange} />
                    <OthersTableRow num={13} nameField="wet_end_other_13_name" nameValue={formData.wet_end_other_13_name} valueField="wet_end_other_13_value" valueValue={formData.wet_end_other_13_value} onChange={handleChange} />
                    <OthersTableRow num={14} nameField="wet_end_other_14_name" nameValue={formData.wet_end_other_14_name} valueField="wet_end_other_14_value" valueValue={formData.wet_end_other_14_value} onChange={handleChange} />
                    <OthersTableRow num={15} nameField="wet_end_other_15_name" nameValue={formData.wet_end_other_15_name} valueField="wet_end_other_15_value" valueValue={formData.wet_end_other_15_value} onChange={handleChange} />
                    <OthersTableRow num={16} nameField="wet_end_other_16_name" nameValue={formData.wet_end_other_16_name} valueField="wet_end_other_16_value" valueValue={formData.wet_end_other_16_value} onChange={handleChange} />
                    <OthersTableRow num={17} nameField="wet_end_other_17_name" nameValue={formData.wet_end_other_17_name} valueField="wet_end_other_17_value" valueValue={formData.wet_end_other_17_value} onChange={handleChange} />
                    <OthersTableRow num={18} nameField="wet_end_other_18_name" nameValue={formData.wet_end_other_18_name} valueField="wet_end_other_18_value" valueValue={formData.wet_end_other_18_value} onChange={handleChange} />
                    <OthersTableRow num={19} nameField="wet_end_other_19_name" nameValue={formData.wet_end_other_19_name} valueField="wet_end_other_19_value" valueValue={formData.wet_end_other_19_value} onChange={handleChange} />
                  </tbody>
                </table>
              </div>
          </div>
        </div>

        {/* Section: Wet End Teardown Photos */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Wet End Teardown Photos</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
            {renderAttachmentSection("Wet End Teardown Photos", wetEndAttachments, setWetEndAttachments, "wet-end-upload")}
          </div>
        </div>

        {/* Section: Signatures */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">Signatures</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-gray-50 p-4 md:p-8 rounded-lg border border-gray-100">
            <SignatorySelect
              label="Service Technician"
              name="teardowned_by_name"
              value={formData.teardowned_by_name}
              signatureValue={formData.teardowned_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ teardowned_by_signature: sig })}
              users={users}
              subtitle="Svc Engineer/Technician"
            />
            <SignatorySelect
              label="Approved By"
              name="checked_approved_by_name"
              value={formData.checked_approved_by_name}
              signatureValue={formData.checked_approved_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ checked_approved_by_signature: sig })}
              users={approvedByUsers}
              subtitle="Svc. Supvr. / Supt."
            />
            <SignatorySelect
              label="Noted By"
              name="noted_by_name"
              value={formData.noted_by_name}
              signatureValue={formData.noted_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ noted_by_signature: sig })}
              users={notedByUsers}
              subtitle="Svc. Manager"
            />
            <SignatorySelect
              label="Acknowledged By"
              name="acknowledged_by_name"
              value={formData.acknowledged_by_name}
              signatureValue={formData.acknowledged_by_signature}
              onChange={handleSignatoryChange}
              onSignatureChange={(sig) => setFormData({ acknowledged_by_signature: sig })}
              users={users}
              subtitle="Customer Representative"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-4 pt-6 pb-12">
          {/* Upload Progress Indicator */}
          {isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Uploading images...</span>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([index, progress]) => {
                  const fileIndex = parseInt(index);
                  const allAttachments = [...motorComponentsAttachments, ...wetEndAttachments];
                  const file = allAttachments[fileIndex];
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate max-w-xs">{file?.file.name || 'File'}</span>
                        <span className="text-blue-600 font-medium">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attachment Count Info */}
          {!isUploading && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Attachments Ready</span>
                <span className="text-sm font-bold text-blue-600">
                  {motorComponentsAttachments.length + wetEndAttachments.length} file(s)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                <div className="text-center">
                  <p className="text-gray-500">Motor Components</p>
                  <p className="font-bold text-gray-700">{motorComponentsAttachments.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Wet End</p>
                  <p className="font-bold text-gray-700">{wetEndAttachments.length}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4">
            <button type="button" onClick={resetFormData} className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base">
              Clear Form
            </button>
            <button type="submit" className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting || isUploading}>
            <span className="mr-2">Submit Teardown Report</span>
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
        </div>
      </form>
      <ConfirmationModal
        isOpen={isModalOpen}
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsModalOpen(false)}
        title="Confirm Submission"
        message="Are you sure you want to submit this Electric Driven Surface Pump Teardown Report?"
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
        <input type="radio" name={name} checked={value === true} onChange={() => onChange(true)} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
        <span className="text-sm text-gray-700">Yes</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name={name} checked={value === false} onChange={() => onChange(false)} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
        <span className="text-sm text-gray-700">No</span>
      </label>
    </div>
  </div>
);

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
        <input type="text" name={name} value={value} onChange={(e) => { onChange(e); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm" placeholder={`Enter ${label.toLowerCase()}`} autoComplete="off" />
        {showDropdown && filteredCustomers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} onClick={() => handleSelectCustomer(customer)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100">
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

interface TableRowProps {
  num: number;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const TableRow = ({ num, label, name, value, onChange }: TableRowProps) => (
  <tr className="border-b border-gray-200 last:border-b-0">
    <td className="py-2 px-3 text-gray-600">{num}</td>
    <td className="py-2 px-3 text-gray-800">{label}</td>
    <td className="py-2 px-3">
      <input type="text" name={name} value={value} onChange={onChange} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors duration-200 ease-in-out shadow-sm" placeholder="Enter evaluation" />
    </td>
  </tr>
);

interface OthersTableRowProps {
  num: number;
  nameField: string;
  nameValue: string;
  valueField: string;
  valueValue: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const OthersTableRow = ({ num, nameField, nameValue, valueField, valueValue, onChange }: OthersTableRowProps) => (
  <tr className="border-b border-gray-200 last:border-b-0">
    <td className="py-2 px-3 text-gray-600">{num}</td>
    <td className="py-2 px-3">
      <input type="text" name={nameField} value={nameValue} onChange={onChange} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors duration-200 ease-in-out shadow-sm" placeholder="Component name" />
    </td>
    <td className="py-2 px-3">
      <input type="text" name={valueField} value={valueValue} onChange={onChange} className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors duration-200 ease-in-out shadow-sm" placeholder="Enter evaluation" />
    </td>
  </tr>
);
