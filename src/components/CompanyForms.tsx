"use client";

import { useState, useEffect } from "react";
import { CompanyForm, DynamicField, FormFieldType, FormSection, CustomSection } from "@/types";
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
  DocumentTextIcon,
  ListBulletIcon,
  Square3Stack3DIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon
} from "@heroicons/react/24/outline";
import { CompanyCardsGridSkeleton, TableSkeleton } from "./Skeletons";
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
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [showAddFieldMenu, setShowAddFieldMenu] = useState<Record<string, boolean>>({});
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionData, setNewSectionData] = useState({ name: "", label: "" });
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
        setShowAddFieldMenu({});
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
      setForms([]); 
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

  const fieldTypes: FormFieldType[] = [
    "text", "email", "number", "date", "textarea", "select", "checkbox", "radio", "file",
  ];

  // Get all sections sorted by order
  const allSections = [...customSections].sort((a, b) => a.order - b.order);

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
    setCustomSections([
      { id: "basicInformation", name: "basicInformation", label: "Basic Information", order: 0, sectionNumber: 1 }
    ]);
    // Expand the default section
    setExpandedSections({ "basicInformation": true });
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

    let convertedFields: DynamicField[] = [];
    if (form.fields && Array.isArray(form.fields)) {
      convertedFields = form.fields.map((field, index) => ({
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
        section: field.section,
      }));
      setDynamicFields(convertedFields);
    } else if (form.dynamicFields && Array.isArray(form.dynamicFields)) {
      convertedFields = form.dynamicFields;
      setDynamicFields(form.dynamicFields);
    } else {
      setDynamicFields([]);
    }

    if (form.sections && Array.isArray(form.sections) && form.sections.length > 0) {
      setCustomSections(form.sections);
      // Expand all sections by default in edit mode
      const expanded: Record<string, boolean> = {};
      form.sections.forEach(s => expanded[s.id] = true);
      setExpandedSections(expanded);
    } else if (convertedFields.length > 0) {
      const uniqueSectionNames = Array.from(new Set(convertedFields.map(f => f.section || "basicInformation")));
      const generatedSections: CustomSection[] = uniqueSectionNames.map((sectionName, index) => {
        const label = sectionName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        return {
          id: sectionName,
          name: sectionName,
          label: label,
          order: index,
          sectionNumber: index + 1
        };
      });
      setCustomSections(generatedSections);
      const expanded: Record<string, boolean> = {};
      generatedSections.forEach(s => expanded[s.id] = true);
      setExpandedSections(expanded);
    } else {
      setCustomSections([
        { id: "basicInformation", name: "basicInformation", label: "Basic Information", order: 0, sectionNumber: 1 }
      ]);
      setExpandedSections({ "basicInformation": true });
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
    setExpandedSections({ ...expandedSections, [allSections.find(s => s.name === section)?.id || ""]: true });
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
    setExpandedSections({ ...expandedSections, [allSections.find(s => s.name === section)?.id || ""]: true });
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
      { id: `${Date.now()}-14`, name: "engineLube Oil", label: "Lube Oil", type: "text", required: false, order: currentFields.length + 13, section: section },
      { id: `${Date.now()}-15`, name: "engineFuelType", label: "Fuel Type", type: "text", required: false, order: currentFields.length + 14, section: section },
      { id: `${Date.now()}-16`, name: "engineCoolantAdditive", label: "Coolant Additive", type: "text", required: false, order: currentFields.length + 15, section: section },
      { id: `${Date.now()}-17`, name: "engineTurboModel", label: "Turbo Model", type: "text", required: false, order: currentFields.length + 16, section: section },
      { id: `${Date.now()}-18`, name: "engineTurboSN", label: "Turbo S/N", type: "text", required: false, order: currentFields.length + 17, section: section }
    ];
    setDynamicFields([...currentFields, ...engineFields]);
    setShowAddFieldMenu({ ...showAddFieldMenu, [section]: false });
    setExpandedSections({ ...expandedSections, [allSections.find(s => s.name === section)?.id || ""]: true });
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

  const handleAddSection = () => {
    if (!newSectionData.name || !newSectionData.label) {
      toast.error("Please provide both field name and label for the section");
      return;
    }

    // Validate field name (should be camelCase, no spaces)
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(newSectionData.name)) {
      toast.error("Field name must be camelCase with no spaces or special characters");
      return;
    }

    // Check if section name already exists
    const exists = allSections.some(s => s.name === newSectionData.name);
    if (exists) {
      toast.error("A section with this name already exists");
      return;
    }

    const newSection: CustomSection = {
      id: `custom-${Date.now()}`,
      name: newSectionData.name,
      label: newSectionData.label,
      order: allSections.length,
      sectionNumber: allSections.length + 1,
    };

    setCustomSections([...customSections, newSection]);
    setNewSectionData({ name: "", label: "" });
    setExpandedSections({ ...expandedSections, [newSection.id]: true });
    setShowAddSectionModal(false);
    toast.success("Section added successfully!");
  };

  const handleRemoveSection = (sectionId: string) => {
    // Don't allow removing the last section
    if (customSections.length <= 1) {
      toast.error("Cannot remove the last section. At least one section is required.");
      return;
    }

    const section = customSections.find(s => s.id === sectionId);
    if (!section) {
      toast.error("Section not found");
      return;
    }

    // Remove the section
    setCustomSections(customSections.filter(s => s.id !== sectionId));

    // Remove all fields in this section
    setDynamicFields(dynamicFields.filter(f => f.section !== section.name));

    toast.success("Section removed successfully!");
  };

  const handleToggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleDragStart = (sectionId: string) => {
    setDraggedSection(sectionId);
  };

  const handleDragOver = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSectionId) return;

    const draggedIndex = customSections.findIndex(s => s.id === draggedSection);
    const targetIndex = customSections.findIndex(s => s.id === targetSectionId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSections = [...customSections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);

    // Update both order and sectionNumber properties
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      order: index,
      sectionNumber: index + 1
    }));

    setCustomSections(updatedSections);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
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
        sections: customSections,
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
        sections: customSections,
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

                  {/* Job Order field - only shown in edit mode, disabled */}
                  {modalMode === "edit" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Order
                      </label>
                      <input
                        type="text"
                        disabled
                        value="N/A - Set when filling form"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Job Order is assigned when filling out the form
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Fields */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Form Fields
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddSectionModal(true)}
                    className="flex items-center space-x-2 px-3 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm"
                    style={{ backgroundColor: "#2B4C7E" }}
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add Section</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {allSections.map((section, index) => {
                    const sectionFields = dynamicFields.filter(
                      (field) => (field.section || "basicInformation") === section.name
                    );

                    return (
                      <div
                        key={section.id}
                        draggable
                        onDragStart={() => handleDragStart(section.id)}
                        onDragOver={(e) => handleDragOver(e, section.id)}
                        onDragEnd={handleDragEnd}
                        className={`border-2 border-gray-200 rounded-lg p-4 bg-white cursor-move transition-all ${
                          draggedSection === section.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300">
                          <div className="flex items-center space-x-3">
                            {/* Drag handle indicator */}
                            <div className="flex flex-col space-y-0.5 cursor-grab active:cursor-grabbing">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            </div>
                            <h5 className="text-md font-semibold text-gray-800">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2">
                                {index + 1}
                              </span>
                              {section.label}
                            </h5>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(section.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove Section"
                              disabled={customSections.length <= 1}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                            <div className="relative add-field-menu-container">
                              <button
                                type="button"
                                onClick={() => setShowAddFieldMenu({ ...showAddFieldMenu, [section.name]: !showAddFieldMenu[section.name] })}
                                className="flex items-center space-x-2 px-3 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm"
                                style={{ backgroundColor: "#2B4C7E" }}
                              >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Field</span>
                              </button>

                              {showAddFieldMenu[section.name] && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAddField(section.name)}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      Normal Field
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddCustomerFields(section.name)}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      Customer Fields
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddEngineFields(section.name)}
                                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      Engine Fields
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
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
                              {allSections.map((section) => (
                                <option key={section.id} value={section.name}>
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

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddSectionModal(false);
              setNewSectionData({ name: "", label: "" });
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Custom Section</h3>
              <button
                onClick={() => {
                  setShowAddSectionModal(false);
                  setNewSectionData({ name: "", label: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Name (Database) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSectionData.name}
                  onChange={(e) => setNewSectionData({ ...newSectionData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., newSection (camelCase)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be used as the field name in the database. Use camelCase with no spaces.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label (Display) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSectionData.label}
                  onChange={(e) => setNewSectionData({ ...newSectionData, label: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., New Section"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be displayed to users in the form.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddSectionModal(false);
                  setNewSectionData({ name: "", label: "" });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSection}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                style={{ backgroundColor: "#2B4C7E" }}
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
