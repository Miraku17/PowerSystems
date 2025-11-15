"use client";

import { useState, useEffect } from "react";
import { CompanyForm, DynamicField, FormFieldType, FormSection } from "@/types";
import {
  companyFormService,
  companyService,
  customerService,
} from "@/services";
import toast from "react-hot-toast";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { TableSkeleton } from "./Skeletons";
import ConfirmationModal from "./ConfirmationModal";

interface CompanyFormsProps {
  forms: CompanyForm[];
  setForms: React.Dispatch<React.SetStateAction<CompanyForm[]>>;
}

export default function CompanyForms({ forms, setForms }: CompanyFormsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedForm, setSelectedForm] = useState<CompanyForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    formType: "",
    companyId: "",
    customerId: "",
    engineId: "",
  });
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [showAddFieldMenu, setShowAddFieldMenu] = useState<Record<FormSection, boolean>>({
    basicInformation: false,
    engineInformation: false,
    serviceDetails: false,
    warrantyCoverage: false,
    servicesSummary: false,
    signatures: false,
  });

  // Load companies and customers on mount
  useEffect(() => {
    loadCompanies();
    loadCustomers();
  }, []);

  // Close add field menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.add-field-menu-container')) {
        setShowAddFieldMenu({
          basicInformation: false,
          engineInformation: false,
          serviceDetails: false,
          warrantyCoverage: false,
          servicesSummary: false,
          signatures: false,
        });
      }
    };

    const hasOpenMenu = Object.values(showAddFieldMenu).some((isOpen) => isOpen);
    if (hasOpenMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddFieldMenu]);

  const loadForms = async () => {
    try {
      const response = await companyFormService.getAll();
      const formsData = response.data || [];
      setForms(Array.isArray(formsData) ? formsData : []);
    } catch (error) {
      toast.error("Failed to load forms");
      console.error("Error loading forms:", error);
      setForms([]); // Set empty array on error
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await companyService.getAll();
      const companiesData = response.data || [];
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      console.error("Error loading companies:", error);
      setCompanies([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAll();
      const customersData = response.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      console.error("Error loading customers:", error);
      setCustomers([]);
    }
  };
  const engines = [
    { id: "1", model: "Engine Model A" },
    { id: "2", model: "Engine Model B" },
  ];

  const fieldTypes: FormFieldType[] = [
    "text",
    "email",
    "number",
    "date",
    "textarea",
    "select",
    "checkbox",
    "radio",
    "file",
  ];

  const sections: { value: FormSection; label: string }[] = [
    { value: "basicInformation", label: "Basic Information" },
    { value: "engineInformation", label: "Engine Information" },
    { value: "serviceDetails", label: "Service Details" },
    { value: "warrantyCoverage", label: "Warranty Coverage" },
    { value: "servicesSummary", label: "Services Summary" },
    { value: "signatures", label: "Signatures" },
  ];

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setFormData({
      name: "",
      formType: "",
      companyId: "",
      customerId: "",
      engineId: "",
    });
    setDynamicFields([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (form: CompanyForm) => {
    setModalMode("edit");
    setSelectedForm(form);
    setFormData({
      name: form.name,
      formType: form.formType,
      companyId: form.companyId || "",
      customerId: form.customerId || "",
      engineId: form.engineId || "",
    });

    // Convert backend fields format to frontend dynamicFields format
    if (form.fields && Array.isArray(form.fields)) {
      const convertedFields: DynamicField[] = form.fields.map(
        (field, index) => ({
          id: `field-${index}`,
          name: field.fieldName,
          label: field.label || field.fieldName,
          type: field.fieldType as FormFieldType,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options,
          defaultValue: field.defaultValue,
          validation: field.validation,
          order: index,
        })
      );
      setDynamicFields(convertedFields);
    } else if (form.dynamicFields && Array.isArray(form.dynamicFields)) {
      // Fallback to old format
      setDynamicFields(form.dynamicFields);
    } else {
      setDynamicFields([]);
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedForm(null);
  };

  const handleAddField = (section: FormSection) => {
    const currentFields = Array.isArray(dynamicFields) ? dynamicFields : [];
    const newField: DynamicField = {
      id: Date.now().toString(),
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      options: [],
      order: currentFields.length,
      section: section,
    };
    setDynamicFields([...currentFields, newField]);
    setShowAddFieldMenu({ ...showAddFieldMenu, [section]: false });
  };

  const handleAddCustomerFields = (section: FormSection) => {
    const currentFields = Array.isArray(dynamicFields) ? dynamicFields : [];
    const customerFields: DynamicField[] = [
      { id: `${Date.now()}-1`, name: "customerName", label: "Name", type: "text", required: false, order: currentFields.length, section: section },
      { id: `${Date.now()}-2`, name: "customerEquipment", label: "Equipment", type: "text", required: false, order: currentFields.length + 1, section: section },
      { id: `${Date.now()}-3`, name: "customer", label: "Customer", type: "text", required: false, order: currentFields.length + 2, section: section },
      { id: `${Date.now()}-4`, name: "customerContactPerson", label: "Contact Person", type: "text", required: false, order: currentFields.length + 3, section: section },
      { id: `${Date.now()}-5`, name: "customerAddress", label: "Address", type: "textarea", required: false, order: currentFields.length + 4, section: section },
      { id: `${Date.now()}-6`, name: "customerEmail", label: "Email", type: "email", required: false, order: currentFields.length + 5, section: section },
    ];
    setDynamicFields([...currentFields, ...customerFields]);
    setShowAddFieldMenu({ ...showAddFieldMenu, [section]: false });
    toast.success("Customer fields added successfully!");
  };

  const handleAddEngineFields = (section: FormSection) => {
    const currentFields = Array.isArray(dynamicFields) ? dynamicFields : [];
    const engineFields: DynamicField[] = [
      { id: `${Date.now()}-1`, name: "engineModel", label: "Engine Model", type: "text", required: false, order: currentFields.length, section: section },
      { id: `${Date.now()}-2`, name: "engineSerialNo", label: "Serial No.", type: "text", required: false, order: currentFields.length + 1, section: section },
      { id: `${Date.now()}-3`, name: "engineAltBrandModel", label: "Alt Brand Model", type: "text", required: false, order: currentFields.length + 2, section: section },
      { id: `${Date.now()}-4`, name: "engineEquipModel", label: "Equipment Model", type: "text", required: false, order: currentFields.length + 3, section: section },
      { id: `${Date.now()}-5`, name: "engineEquipSerialNo", label: "Equipment Serial No.", type: "text", required: false, order: currentFields.length + 4, section: section },
      { id: `${Date.now()}-6`, name: "engineAltSerialNo", label: "Alt Serial No.", type: "text", required: false, order: currentFields.length + 5, section: section },
      { id: `${Date.now()}-7`, name: "engineLocation", label: "Location", type: "text", required: false, order: currentFields.length + 6, section: section },
      { id: `${Date.now()}-8`, name: "engineRating", label: "Rating", type: "text", required: false, order: currentFields.length + 7, section: section },
      { id: `${Date.now()}-9`, name: "engineRpm", label: "RPM", type: "text", required: false, order: currentFields.length + 8, section: section },
      { id: `${Date.now()}-10`, name: "engineStartVoltage", label: "Start Voltage", type: "text", required: false, order: currentFields.length + 9, section: section },
      { id: `${Date.now()}-11`, name: "engineRunHours", label: "Run Hours", type: "text", required: false, order: currentFields.length + 10, section: section },
      { id: `${Date.now()}-12`, name: "engineFuelPumpSN", label: "Fuel Pump S/N", type: "text", required: false, order: currentFields.length + 11, section: section },
      { id: `${Date.now()}-13`, name: "engineFuelPumpCode", label: "Fuel Pump Code", type: "text", required: false, order: currentFields.length + 12, section: section },
      { id: `${Date.now()}-14`, name: "engineLubeOil", label: "Lube Oil", type: "text", required: false, order: currentFields.length + 13, section: section },
      { id: `${Date.now()}-15`, name: "engineFuelType", label: "Fuel Type", type: "text", required: false, order: currentFields.length + 14, section: section },
      { id: `${Date.now()}-16`, name: "engineCoolantAdditive", label: "Coolant Additive", type: "text", required: false, order: currentFields.length + 15, section: section },
      { id: `${Date.now()}-17`, name: "engineTurboModel", label: "Turbo Model", type: "text", required: false, order: currentFields.length + 16, section: section },
      { id: `${Date.now()}-18`, name: "engineTurboSN", label: "Turbo S/N", type: "text", required: false, order: currentFields.length + 17, section: section },
    ];
    setDynamicFields([...currentFields, ...engineFields]);
    setShowAddFieldMenu({ ...showAddFieldMenu, [section]: false });
    toast.success("Engine fields added successfully!");
  };

  const handleUpdateField = (id: string, updates: Partial<DynamicField>) => {
    const currentFields = Array.isArray(dynamicFields) ? dynamicFields : [];
    setDynamicFields(
      currentFields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const handleRemoveField = (id: string) => {
    const currentFields = Array.isArray(dynamicFields) ? dynamicFields : [];
    setDynamicFields(currentFields.filter((field) => field.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === "create") {
      setShowCreateConfirm(true);
    } else {
      setShowEditConfirm(true);
    }
  };

  const confirmCreate = async () => {
    setIsSubmitting(true);
    try {
      // Map frontend dynamicFields to backend fields format
      const mappedFields = dynamicFields.map((field) => ({
        fieldName: field.name,
        fieldType: field.type,
        required: field.required,
        label: field.label,
        placeholder: field.placeholder,
        options: field.options,
        defaultValue: field.defaultValue,
        validation: field.validation,
        section: field.section,
      }));

      const submitData = {
        name: formData.name,
        formType: formData.formType,
        companyId: formData.companyId || undefined,
        customerId: formData.customerId || undefined,
        engineId: formData.engineId || undefined,
        fields: mappedFields,
      };
      console.log("Creating form with data:", submitData);
      console.log("Mapped fields count:", mappedFields.length);
      console.log("Mapped fields:", mappedFields);
      const loadingToast = toast.loading("Creating form...");
      const response = await companyFormService.create(submitData);
      console.log("Form created, response:", response);
      await loadForms();
      toast.success("Form created successfully!", { id: loadingToast });
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to create form");
      console.error("Error creating form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmEdit = async () => {
    if (!selectedForm) return;
    setIsSubmitting(true);
    try {
      // Map frontend dynamicFields to backend fields format
      const mappedFields = dynamicFields.map((field) => ({
        fieldName: field.name,
        fieldType: field.type,
        required: field.required,
        label: field.label,
        placeholder: field.placeholder,
        options: field.options,
        defaultValue: field.defaultValue,
        validation: field.validation,
        section: field.section,
      }));

      const submitData = {
        name: formData.name,
        formType: formData.formType,
        companyId: formData.companyId || undefined,
        customerId: formData.customerId || undefined,
        engineId: formData.engineId || undefined,
        fields: mappedFields,
      };
      const loadingToast = toast.loading("Updating form...");
      await companyFormService.update(selectedForm.id, submitData);
      await loadForms();
      toast.success("Form updated successfully!", { id: loadingToast });
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to update form");
      console.error("Error updating form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const loadingToast = toast.loading("Deleting form...");
    try {
      await companyFormService.delete(pendingDeleteId);
      await loadForms();
      toast.success("Form deleted successfully!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to delete form", { id: loadingToast });
      console.error("Error deleting form:", error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const filteredForms = Array.isArray(forms)
    ? forms.filter(
        (form) =>
          form.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.formType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
          style={{ backgroundColor: "#2B4C7E" }}
        >
          Create Form
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search forms by name or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fields
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredForms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      {searchTerm
                        ? "No forms found matching your search."
                        : "No forms yet. Click 'Create Form' to create one."}
                    </td>
                  </tr>
                ) : (
                  filteredForms.map((form) => {
                    // Count fields from either fields or dynamicFields
                    const fieldCount =
                      form.fields && Array.isArray(form.fields)
                        ? form.fields.length
                        : form.dynamicFields &&
                          Array.isArray(form.dynamicFields)
                        ? form.dynamicFields.length
                        : 0;

                    return (
                      <tr key={form.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {form.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {form.formType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {fieldCount} {fieldCount === 1 ? "field" : "fields"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleOpenEditModal(form)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(form.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {modalMode === "create" ? "Create New Form" : "Edit Form"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter form name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.formType}
                      onChange={(e) =>
                        setFormData({ ...formData, formType: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., service, maintenance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.companyId}
                      onChange={(e) =>
                        setFormData({ ...formData, companyId: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select company...</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Fields */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Form Fields
                </h4>

                <div className="space-y-6">
                  {sections.map((section) => {
                    const sectionFields = dynamicFields.filter(
                      (field) => (field.section || "basicInformation") === section.value
                    );

                    return (
                      <div key={section.value} className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300">
                          <h5 className="text-md font-semibold text-gray-800">
                            {section.label}
                          </h5>
                          <div className="relative add-field-menu-container">
                            <button
                              type="button"
                              onClick={() => setShowAddFieldMenu({ ...showAddFieldMenu, [section.value]: !showAddFieldMenu[section.value] })}
                              className="flex items-center space-x-2 px-3 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm"
                              style={{ backgroundColor: "#2B4C7E" }}
                            >
                              <PlusIcon className="h-4 w-4" />
                              <span>Add Field</span>
                            </button>

                            {showAddFieldMenu[section.value] && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddField(section.value)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Normal Field
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddCustomerFields(section.value)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Customer Fields
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddEngineFields(section.value)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    Engine Fields
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {sectionFields.length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-sm text-gray-500">
                              No fields in this section yet. Click 'Add Field' above.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {sectionFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="border border-gray-300 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-700">
                            Field {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveField(field.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Field Name
                            </label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., firstName"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Field Label
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  label: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., First Name"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Field Type
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  type: e.target.value as FormFieldType,
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {fieldTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Section
                            </label>
                            <select
                              value={field.section || "basicInformation"}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  section: e.target.value as FormSection,
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {sections.map((section) => (
                                <option key={section.value} value={section.value}>
                                  {section.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Placeholder
                            </label>
                            <input
                              type="text"
                              value={field.placeholder || ""}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  placeholder: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter placeholder"
                            />
                          </div>

                          <div className="flex items-center">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) =>
                                  handleUpdateField(field.id, {
                                    required: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                Required
                              </span>
                            </label>
                          </div>

                          {(field.type === "select" ||
                            field.type === "radio" ||
                            field.type === "checkbox") && (
                            <div className="col-span-full">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Options (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={field.options?.join(", ") || ""}
                                onChange={(e) =>
                                  handleUpdateField(field.id, {
                                    options: e.target.value
                                      .split(",")
                                      .map((opt) => opt.trim())
                                      .filter((opt) => opt),
                                  })
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: "#2B4C7E" }}
                >
                  {modalMode === "create" ? "Create Form" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Form"
        message="Are you sure you want to delete this form? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showCreateConfirm}
        onClose={() => setShowCreateConfirm(false)}
        onConfirm={confirmCreate}
        title="Create Form"
        message="Are you sure you want to create this form?"
        confirmText="Create"
        cancelText="Cancel"
        type="info"
      />

      <ConfirmationModal
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={confirmEdit}
        title="Update Form"
        message="Are you sure you want to save these changes?"
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}
