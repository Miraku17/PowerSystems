"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import SignaturePad from "./SignaturePad";
import ConfirmationModal from "./ConfirmationModal";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useWedaServiceFormStore } from "@/stores/wedaServiceFormStore";

interface User {
  id: string;
  fullName: string;
}

export default function WedaServiceForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use Zustand store for persistent form data
  const { formData, setFormData, resetFormData } = useWedaServiceFormStore();

  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<
    { file: File; title: string }[]
  >([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [pumps, setPumps] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get("/users");
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch users", error);
        toast.error("Failed to load users for signature fields.");
      }
    };

    const fetchCustomers = async () => {
      try {
        const response = await apiClient.get("/customers");
        if (response.data.success) {
          setCustomers(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch customers", error);
      }
    };

    const fetchPumps = async () => {
      try {
        const response = await apiClient.get("/pumps");
        if (response.data.success) {
          setPumps(response.data.data);
        } else if (Array.isArray(response.data)) {
          setPumps(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch pumps", error);
      }
    };

    fetchUsers();
    fetchCustomers();
    fetchPumps();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({ [name]: value });
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({
      reporting_person_name: customer.name || "",
      customer_name: customer.customer || "",
      contact_person: customer.contactPerson || "",
      address: customer.address || "",
      email_address: customer.email || "",
      phone_number: customer.phone || "",
    });
  };

  const handlePumpSelect = (pump: any) => {
    setFormData({
      pump_model: pump.pumpModel || "",
      pump_serial_no: pump.pumpSerialNumber || "",
      equipment_model: pump.engineModel || "",
      equipment_serial_no: pump.engineSerialNumber || "",
      running_hours: pump.runningHours || formData.running_hours,
    });
  };

  const handleSignatureChange = (name: string, signature: string) => {
    setFormData({ [name]: signature });
  };

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);
    setIsLoading(true);
    const loadingToastId = toast.loading(
      "Submitting WEDA Service Report..."
    );

    try {
      const formDataToSubmit = new FormData();

      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSubmit.append(key, value.toString());
      });

      // Append attachments
      attachments.forEach((attachment) => {
        formDataToSubmit.append("attachment_files", attachment.file);
        formDataToSubmit.append("attachment_titles", attachment.title);
      });

      const response = await apiClient.post(
        "/forms/weda-service",
        formDataToSubmit,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data) {
        toast.success("WEDA Service Report submitted successfully!", {
          id: loadingToastId,
        });

        // Reset form
        resetFormData();
        setAttachments([]);
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      const errorMessage =
        error?.response?.data?.error || "Failed to submit report.";
      toast.error(errorMessage, {
        id: loadingToastId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate job order number
    if (!formData.job_order || formData.job_order.trim() === "") {
      toast.error("Job Order Number is required");
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
            WEDA Service Report
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
            <Input
              label="Job Order No."
              name="job_order"
              value={formData.job_order}
              onChange={handleChange}
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
            <Input
              label="Telephone/Fax"
              name="telephone_fax"
              value={formData.telephone_fax}
              onChange={handleChange}
            />
            <Input
              label="Equipment Manufacturer"
              name="equipment_manufacturer"
              value={formData.equipment_manufacturer}
              onChange={handleChange}
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
          </div>
        </div>

        {/* Section 2: Pump Details */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Pump Details
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <PumpAutocomplete
              label="Pump Model"
              name="pump_model"
              value={formData.pump_model}
              onChange={handleChange}
              onSelect={handlePumpSelect}
              pumps={pumps}
              searchKey="pumpModel"
            />
            <PumpAutocomplete
              label="Pump Serial No."
              name="pump_serial_no"
              value={formData.pump_serial_no}
              onChange={handleChange}
              onSelect={handlePumpSelect}
              pumps={pumps}
              searchKey="pumpSerialNumber"
            />
            <Input
              label="Commissioning No."
              name="commissioning_no"
              value={formData.commissioning_no}
              onChange={handleChange}
            />
            <PumpAutocomplete
              label="Equipment Model"
              name="equipment_model"
              value={formData.equipment_model}
              onChange={handleChange}
              onSelect={handlePumpSelect}
              pumps={pumps}
              searchKey="engineModel"
            />
            <PumpAutocomplete
              label="Equipment Serial No."
              name="equipment_serial_no"
              value={formData.equipment_serial_no}
              onChange={handleChange}
              onSelect={handlePumpSelect}
              pumps={pumps}
              searchKey="engineSerialNumber"
            />
            <Input
              label="Pump Type"
              name="pump_type"
              value={formData.pump_type}
              onChange={handleChange}
            />
            <Input
              label="Pump Weight (kg)"
              name="pump_weight"
              value={formData.pump_weight}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 3: Technical Specifications */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Technical Specifications
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input
              label="Rating"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
            />
            <Input
              label="Revolution"
              name="revolution"
              value={formData.revolution}
              onChange={handleChange}
            />
            <Input
              label="Related Current (Amps)"
              name="related_current_amps"
              value={formData.related_current_amps}
              onChange={handleChange}
            />
            <Input
              label="Running Hours"
              name="running_hours"
              value={formData.running_hours}
              onChange={handleChange}
            />
            <Input
              label="Phase"
              name="phase"
              value={formData.phase}
              onChange={handleChange}
            />
            <Input
              label="Frequency (Hz)"
              name="frequency_hz"
              value={formData.frequency_hz}
              onChange={handleChange}
            />
            <Input
              label="Oil Type"
              name="oil_type"
              value={formData.oil_type}
              onChange={handleChange}
            />
            <Input
              label="Maximum Height (m)"
              name="maximum_height_m"
              value={formData.maximum_height_m}
              onChange={handleChange}
            />
            <Input
              label="Maximum Capacity"
              name="maximum_capacity"
              value={formData.maximum_capacity}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Section 4: Operational Data */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Operational Data
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
            <Input
              label="Date In Service"
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
          </div>
        </div>

        {/* Section 5: Customer Complaint */}
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

        {/* Section 6: Possible Cause */}
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

        {/* Section 7: Warranty Information */}
        <div>
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-600 mr-2"></div>
            <h3 className="text-lg font-bold text-gray-800 uppercase">
              Warranty Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <RadioGroup
              label="Within Coverage Period"
              name="within_coverage_period"
              value={formData.within_coverage_period}
              onChange={handleChange}
              options={["Yes", "No"]}
            />
            <RadioGroup
              label="Warrantable Failure"
              name="warrantable_failure"
              value={formData.warrantable_failure}
              onChange={handleChange}
              options={["Yes", "No"]}
            />
          </div>
        </div>

        {/* Section 8: Service Report Details */}
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
                                    {(attachment.file.size / 1024).toFixed(2)}{" "}
                                    KB
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
                                    newAttachments[index].title =
                                      e.target.value;
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
                      htmlFor="weda-file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload an image</span>
                      <input
                        id="weda-file-upload"
                        name="weda-file-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            // Validate that it's an image
                            if (!file.type.startsWith("image/")) {
                              toast.error(
                                "Please select only image files (PNG, JPG, etc.)"
                              );
                              return;
                            }
                            setAttachments([
                              ...attachments,
                              { file, title: "" },
                            ]);
                            e.target.value = "";
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

        {/* Section 9: Signatures */}
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
                label="Attending Technician"
                name="attending_technician"
                value={formData.attending_technician}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.attending_technician_signature}
                onChange={(signature: string) =>
                  handleSignatureChange(
                    "attending_technician_signature",
                    signature
                  )
                }
                subtitle="Signed by Technician"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select
                label="Noted By"
                name="noted_by"
                value={formData.noted_by}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.noted_by_signature}
                onChange={(signature: string) =>
                  handleSignatureChange("noted_by_signature", signature)
                }
                subtitle="Service Manager"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select
                label="Approved By"
                name="approved_by"
                value={formData.approved_by}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.approved_by_signature}
                onChange={(signature: string) =>
                  handleSignatureChange("approved_by_signature", signature)
                }
                subtitle="Authorized Signature"
              />
            </div>
            <div className="flex flex-col space-y-4">
              <Select
                label="Acknowledged By"
                name="acknowledged_by"
                value={formData.acknowledged_by}
                onChange={handleChange}
                options={users.map((user) => user.fullName)}
              />
              <SignaturePad
                label="Draw Signature"
                value={formData.acknowledged_by_signature}
                onChange={(signature: string) =>
                  handleSignatureChange("acknowledged_by_signature", signature)
                }
                subtitle="Customer Signature"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse space-y-3 space-y-reverse md:flex-row md:space-y-0 md:justify-end md:space-x-4 pt-6 pb-12">
          <button
            type="button"
            onClick={resetFormData}
            className="w-full md:w-auto bg-white text-gray-700 font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition duration-150 text-sm md:text-base"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full md:w-auto bg-[#2B4C7E] hover:bg-[#1A2F4F] text-white font-bold py-2 px-4 md:py-3 md:px-10 rounded-lg shadow-md transition duration-150 flex items-center justify-center text-sm md:text-base"
            disabled={isLoading}
          >
            <span className="mr-2">Submit Service Report</span>
            {isLoading ? (
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
        message="Are you sure you want to submit this WEDA Service Report?"
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

  const handleSelectOption = (option: string) => {
    const syntheticEvent = {
      target: { name, value: option },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
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
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors pr-10"
          placeholder="Select or type a name"
        />
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  options: string[];
}

const RadioGroup = ({ label, name, value, onChange, options }: RadioGroupProps) => {
  const handleRadioChange = (optionValue: string) => {
    const syntheticEvent = {
      target: { name, value: optionValue },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="flex flex-col w-full">
      <label className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex space-x-6">
        {options.map((option) => (
          <label key={option} className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => handleRadioChange(option)}
              className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">{option}</span>
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
                <div className="text-xs text-gray-500">{customer.customer}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PumpAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onSelect: (pump: any) => void;
  pumps: any[];
  searchKey?: string;
}

const PumpAutocomplete = ({
  label,
  name,
  value,
  onChange,
  onSelect,
  pumps,
  searchKey = "pumpModel",
}: PumpAutocompleteProps) => {
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

  const handleSelectPump = (pump: any) => {
    onSelect(pump);
    setShowDropdown(false);
  };

  const filteredPumps = pumps.filter((p) =>
    (p[searchKey] || "").toLowerCase().includes((value || "").toLowerCase())
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
            {filteredPumps.map((pump) => (
              <div
                key={pump.id}
                onClick={() => handleSelectPump(pump)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
              >
                <div className="font-medium">{pump.pumpModel}</div>
                <div className="text-xs text-gray-500">
                  S/N: {pump.pumpSerialNumber} • {pump.company?.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
