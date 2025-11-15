"use client";

import { useState, useEffect, useRef } from "react";
import { CompanyForm, DynamicField, FormSection } from "@/types";
import { companyFormService, customerService, engineService, formRecordService } from "@/services";
import {
  PlusIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface FormInstancesProps {
  formId: string;
  forms: CompanyForm[];
}

export default function FormInstances({ formId, forms }: FormInstancesProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTemplate, setFormTemplate] = useState<CompanyForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Autocomplete state
  const [customers, setCustomers] = useState<any[]>([]);
  const [engines, setEngines] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const sections: { value: FormSection; label: string }[] = [
    { value: "basicInformation", label: "Basic Information" },
    { value: "engineInformation", label: "Engine Information" },
    { value: "serviceDetails", label: "Service Details" },
    { value: "warrantyCoverage", label: "Warranty Coverage" },
    { value: "servicesSummary", label: "Services Summary" },
    { value: "signatures", label: "Signatures" },
  ];

  // Load customers and engines on mount
  useEffect(() => {
    loadCustomers();
    loadEngines();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll();
      const customersData = response.data?.data || response.data;
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      console.error("Error loading customers:", error);
      setCustomers([]);
    }
  };

  const loadEngines = async () => {
    try {
      const response = await engineService.getAll();
      const enginesData = response.data?.data || response.data;
      setEngines(Array.isArray(enginesData) ? enginesData : []);
    } catch (error) {
      console.error("Error loading engines:", error);
      setEngines([]);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".autocomplete-container")) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch form template from API
  useEffect(() => {
    const loadFormTemplate = async () => {
      try {
        setIsLoading(true);
        const response = await companyFormService.getById(formId);
        const formData = response.data?.data || response.data;
        setFormTemplate(formData);
        console.log("Loaded form template:", formData);
      } catch (error) {
        toast.error("Failed to load form template");
        console.error("Error loading form template:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (formId) {
      loadFormTemplate();
    }
  }, [formId]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleAutocompleteSelect = (
    fieldName: string,
    item: any,
    displayValue: string,
    type: "customer" | "engine"
  ) => {
    const updates: Record<string, any> = {
      [fieldName]: item.id,
      [`${fieldName}_display`]: displayValue,
    };

    // Auto-fill related fields based on type
    if (type === "customer") {
      // Map customer data to form fields
      fieldsToRender.forEach((field) => {
        const fieldNameLower = field.name.toLowerCase();
        if (field.name === "customerName" || fieldNameLower === "customername") {
          updates[field.name] = item.name || "";
        } else if (field.name === "customer" || fieldNameLower === "customer") {
          updates[field.name] = item.customer || item.name || "";
        } else if (field.name === "customerEmail" || fieldNameLower === "customeremail") {
          updates[field.name] = item.email || "";
        } else if (field.name === "customerAddress" || fieldNameLower === "customeraddress") {
          updates[field.name] = item.address || "";
        } else if (field.name === "customerContactPerson" || fieldNameLower === "customercontactperson") {
          updates[field.name] = item.contactPerson || "";
        } else if (field.name === "customerEquipment" || fieldNameLower === "customerequipment") {
          updates[field.name] = item.equipment || "";
        }
      });
    } else if (type === "engine") {
      // Map engine data to form fields
      fieldsToRender.forEach((field) => {
        const fieldNameLower = field.name.toLowerCase();
        if (field.name === "engineModel" || fieldNameLower === "enginemodel") {
          updates[field.name] = item.model || "";
        } else if (
          field.name === "engineSerialNo" ||
          fieldNameLower === "engineserialno"
        ) {
          updates[field.name] = item.serialNo || "";
        } else if (
          field.name === "engineAltBrandModel" ||
          fieldNameLower === "enginealtbrandmodel"
        ) {
          updates[field.name] = item.altBrandModel || "";
        } else if (
          field.name === "engineEquipModel" ||
          fieldNameLower === "engineequipmodel"
        ) {
          updates[field.name] = item.equipModel || "";
        } else if (
          field.name === "engineEquipSerialNo" ||
          fieldNameLower === "engineequipserialno"
        ) {
          updates[field.name] = item.equipSerialNo || "";
        } else if (
          field.name === "engineAltSerialNo" ||
          fieldNameLower === "enginealtserialno"
        ) {
          updates[field.name] = item.altSerialNo || "";
        } else if (
          field.name === "engineLocation" ||
          fieldNameLower === "enginelocation"
        ) {
          updates[field.name] = item.location || "";
        } else if (
          field.name === "engineRating" ||
          fieldNameLower === "enginerating"
        ) {
          updates[field.name] = item.rating || "";
        } else if (
          field.name === "engineRpm" ||
          fieldNameLower === "enginerpm"
        ) {
          updates[field.name] = item.rpm || "";
        } else if (
          field.name === "engineStartVoltage" ||
          fieldNameLower === "enginestartvoltage"
        ) {
          updates[field.name] = item.startVoltage || "";
        } else if (
          field.name === "engineRunHours" ||
          fieldNameLower === "enginerunhours"
        ) {
          updates[field.name] = item.runHours || "";
        } else if (
          field.name === "engineFuelPumpSN" ||
          fieldNameLower === "enginefuelpumpsn"
        ) {
          updates[field.name] = item.fuelPumpSN || "";
        } else if (
          field.name === "engineFuelPumpCode" ||
          fieldNameLower === "enginefuelpumpcode"
        ) {
          updates[field.name] = item.fuelPumpCode || "";
        } else if (
          field.name === "engineLubeOil" ||
          fieldNameLower === "enginelubeoil"
        ) {
          updates[field.name] = item.lubeOil || "";
        } else if (
          field.name === "engineFuelType" ||
          fieldNameLower === "enginefueltype"
        ) {
          updates[field.name] = item.fuelType || "";
        } else if (
          field.name === "engineCoolantAdditive" ||
          fieldNameLower === "enginecoolantadditive"
        ) {
          updates[field.name] = item.coolantAdditive || "";
        } else if (
          field.name === "engineTurboModel" ||
          fieldNameLower === "engineturbomodel"
        ) {
          updates[field.name] = item.turboModel || "";
        } else if (
          field.name === "engineTurboSN" ||
          fieldNameLower === "engineturbosn"
        ) {
          updates[field.name] = item.turboSN || "";
        }
      });
    }

    setFieldValues((prev) => ({
      ...prev,
      ...updates,
    }));
    setActiveDropdown(null);
  };

  const getFilteredCustomers = (searchValue: string) => {
    if (!searchValue) return customers;
    const search = searchValue.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(search) ||
        customer.email?.toLowerCase().includes(search) ||
        customer.contactPerson?.toLowerCase().includes(search)
    );
  };

  const getFilteredEngines = (searchValue: string) => {
    if (!searchValue) return engines;
    const search = searchValue.toLowerCase();
    return engines.filter(
      (engine) =>
        engine.model?.toLowerCase().includes(search) ||
        engine.serialNo?.toLowerCase().includes(search) ||
        engine.equipModel?.toLowerCase().includes(search)
    );
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTemplate) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading("Submitting form...");

    try {
      // Group field values by section
      const sectionedData: Record<string, any> = {};

      fieldsToRender.forEach((field) => {
        const section = field.section || "basicInformation";
        if (!sectionedData[section]) {
          sectionedData[section] = {};
        }

        const value = fieldValues[field.name] || field.defaultValue || "";
        sectionedData[section][field.name] = value;
      });

      // Create submission data with required structure
      const submissionData = {
        companyFormId: parseInt(formTemplate.id),
        data: sectionedData,
      };

      console.log("Submitting form data:", submissionData);

      // Submit to API
      const response = await formRecordService.create(submissionData);

      console.log("Form submitted successfully:", response);

      // Clear form after successful submission
      setFieldValues({});
      toast.success("Form submitted successfully!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to submit form", { id: loadingToast });
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFieldValues({});
    toast.success("Form reset");
  };

  const renderField = (field: DynamicField) => {
    const value = fieldValues[field.name] || field.defaultValue || "";
    const displayValue = fieldValues[`${field.name}_display`] || value;
    const fieldNameLower = field.name.toLowerCase();

    // Check if this field should have autocomplete
    const isCustomerField = fieldNameLower.includes("customer");
    const isEngineField = fieldNameLower.includes("engine");

    // Render customer autocomplete
    if (
      isCustomerField &&
      (field.type === "text" ||
        field.type === "email" ||
        field.type === "number" ||
        field.type === "textarea")
    ) {
      const filteredCustomers = getFilteredCustomers(displayValue as string);
      const InputComponent = field.type === "textarea" ? "textarea" : "input";
      return (
        <div className="autocomplete-container relative">
          <InputComponent
            type={field.type === "textarea" ? undefined : "text"}
            required={field.required}
            value={displayValue}
            onChange={(e) => {
              handleFieldChange(field.name, e.target.value);
              handleFieldChange(`${field.name}_display`, e.target.value);
            }}
            onFocus={() => setActiveDropdown(field.name)}
            placeholder={field.placeholder}
            className="w-full px-2 py-1.5 border-0 border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none bg-transparent"
            rows={field.type === "textarea" ? 3 : undefined}
          />
          {activeDropdown === field.name && filteredCustomers.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() =>
                    handleAutocompleteSelect(
                      field.name,
                      customer,
                      customer.name,
                      "customer"
                    )
                  }
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {customer.name}
                  </div>
                  <div className="text-sm text-gray-600">{customer.email}</div>
                  {customer.contactPerson && (
                    <div className="text-xs text-gray-500">
                      Contact: {customer.contactPerson}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Render engine autocomplete
    if (
      isEngineField &&
      (field.type === "text" ||
        field.type === "email" ||
        field.type === "number" ||
        field.type === "textarea")
    ) {
      const filteredEngines = getFilteredEngines(displayValue as string);
      const InputComponent = field.type === "textarea" ? "textarea" : "input";
      return (
        <div className="autocomplete-container relative">
          <InputComponent
            type={field.type === "textarea" ? undefined : "text"}
            required={field.required}
            value={displayValue}
            onChange={(e) => {
              handleFieldChange(field.name, e.target.value);
              handleFieldChange(`${field.name}_display`, e.target.value);
            }}
            onFocus={() => setActiveDropdown(field.name)}
            placeholder={field.placeholder}
            className="w-full px-2 py-1.5 border-0 border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none bg-transparent"
            rows={field.type === "textarea" ? 3 : undefined}
          />
          {activeDropdown === field.name && filteredEngines.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredEngines.map((engine) => (
                <div
                  key={engine.id}
                  onClick={() =>
                    handleAutocompleteSelect(
                      field.name,
                      engine,
                      engine.model,
                      "engine"
                    )
                  }
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {engine.model}
                  </div>
                  <div className="text-sm text-gray-600">
                    S/N: {engine.serialNo}
                  </div>
                  {engine.equipModel && (
                    <div className="text-xs text-gray-500">
                      Equipment: {engine.equipModel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    switch (field.type) {
      case "text":
      case "email":
      case "number":
        return (
          <input
            type={field.type}
            required={field.required}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-2 py-1.5 border-0 border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none bg-transparent"
          />
        );

      case "date":
        return (
          <input
            type="date"
            required={field.required}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-2 py-1.5 border-0 border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none bg-transparent"
          />
        );

      case "textarea":
        return (
          <textarea
            required={field.required}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-2 py-2 border-2 border-gray-300 rounded focus:border-blue-600 focus:outline-none resize-y"
          />
        );

      case "select":
        return (
          <select
            required={field.required}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-2 py-1.5 border-0 border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none bg-transparent"
          >
            <option value="">Select an option...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={value?.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v) => v !== option);
                    handleFieldChange(field.name, newValues);
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.name}
                  required={field.required}
                  checked={value === option}
                  onChange={() => handleFieldChange(field.name, option)}
                  className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case "file":
        return (
          <input
            type="file"
            required={field.required}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFieldChange(field.name, file.name);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-lg">Loading form template...</p>
      </div>
    );
  }

  if (!formTemplate) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">
          Form not found. Please select a valid form.
        </p>
      </div>
    );
  }

  // Convert backend fields to frontend DynamicField format for rendering
  const fieldsToRender: DynamicField[] =
    formTemplate.fields && Array.isArray(formTemplate.fields)
      ? formTemplate.fields.map((field, index) => ({
          id: `field-${index}`,
          name: field.fieldName,
          label: field.label || field.fieldName,
          type: field.fieldType as any,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options,
          defaultValue: field.defaultValue,
          validation: field.validation,
          order: index,
          section: field.section,
        }))
      : Array.isArray(formTemplate.dynamicFields)
      ? formTemplate.dynamicFields
      : [];

  // Skeleton loader while loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div
          className="bg-white shadow-lg animate-pulse"
          style={{ maxWidth: "900px", margin: "0 auto" }}
        >
          {/* Header Skeleton */}
          <div className="text-center py-6 px-8 border-b-2 border-gray-300">
            <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4 mx-auto"></div>
          </div>

          {/* Title Skeleton */}
          <div className="text-center py-4 bg-white">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>

          {/* Form Body Skeleton */}
          <div className="px-8 py-6 space-y-8">
            {[1, 2, 3].map((section) => (
              <div key={section}>
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {[1, 2, 3, 4].map((field) => (
                    <div key={field}>
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-10 bg-gray-100 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t-2 border-gray-300">
              <div className="h-12 bg-gray-200 rounded w-32"></div>
              <div className="h-12 bg-gray-200 rounded w-40"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Paper Form */}
      <div
        className="bg-white shadow-lg"
        style={{ maxWidth: "900px", margin: "0 auto" }}
      >
        {/* Company Header */}
        <div className="text-center py-6 px-8 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Power Systems, Incorporated
          </h1>
          <p className="text-xs text-gray-600 mb-1">
            2nd Floor TOPY's Place #3 Calle Industria cor. Economia Street,
            Bagumbayan, Libis, Quezon City
          </p>
          <p className="text-xs text-gray-600 mb-1">
            Tel: (+63-2) 687-9275 to 78 | Fax: (+63-2) 687-9279
          </p>
          <p className="text-xs text-gray-600 mb-2">
            Email: sales@psi-deutz.com
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA •
            ILO-ILO • SURIGAO
          </p>
        </div>

        {/* Form Title */}
        <div className="text-center py-4 bg-white">
          <h2
            className="text-2xl font-bold uppercase tracking-wide"
            style={{ color: "#2B4C7E" }}
          >
            {formTemplate.company?.name ? `${formTemplate.company.name} - ${formTemplate.name}` : formTemplate.name}
          </h2>
        </div>

        {/* Form Body */}
        <div className="px-8 py-6">
          <form onSubmit={handleSubmitForm} className="space-y-8">
            {fieldsToRender && fieldsToRender.length > 0 ? (
              <div className="space-y-8">
                {sections.map((section) => {
                  const sectionFields = fieldsToRender
                    .filter(
                      (field) =>
                        (field.section || "basicInformation") === section.value
                    )
                    .sort((a, b) => a.order - b.order);

                  if (sectionFields.length === 0) return null;

                  return (
                    <div key={section.value}>
                      <h3
                        className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2"
                        style={{ color: "#2B4C7E" }}
                      >
                        {section.label}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {sectionFields.map((field) => (
                          <div
                            key={field.id}
                            className={
                              field.type === "textarea" ? "md:col-span-2" : ""
                            }
                          >
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            {renderField(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">
                  This form has no fields defined. Please edit the form template
                  to add fields.
                </p>
              </div>
            )}

            {fieldsToRender && fieldsToRender.length > 0 && (
              <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={handleResetForm}
                  disabled={isSubmitting}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-8 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  style={{ backgroundColor: "#2B4C7E" }}
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Form"}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
