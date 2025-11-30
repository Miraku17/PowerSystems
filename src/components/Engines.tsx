"use client";

import { useState, useEffect } from "react";
import { Engine, Company } from "@/types";
import { engineService, companyService } from "@/services";
import toast from "react-hot-toast";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CogIcon,
  PlusIcon,
  MapPinIcon,
  TagIcon,
  BoltIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";
import { CompanyCardsGridSkeleton } from "./Skeletons";
import CustomSelect from "./CustomSelect";
import ConfirmationModal from "./ConfirmationModal";
import Image from "next/image";

interface EnginesProps {
  companyId?: string;
  withFilterOptions?: boolean;
}

export default function Engines({
  companyId,
  withFilterOptions,
}: EnginesProps = {}) {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Filter states
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [filterType, setFilterType] = useState<string>("all");

  const [formData, setFormData] = useState({
    model: "",
    serialNo: "",
    altBrandModel: "",
    equipModel: "",
    equipSerialNo: "",
    altSerialNo: "",
    location: "",
    rating: "",
    rpm: "",
    startVoltage: "",
    runHours: "",
    fuelPumpSN: "",
    fuelPumpCode: "",
    lubeOil: "",
    fuelType: "",
    coolantAdditive: "",
    turboModel: "",
    turboSN: "",
    companyId: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  // Load engines and companies on mount
  useEffect(() => {
    loadEngines();
    loadCompanies();
  }, []);

  const loadEngines = async () => {
    try {
      const response = await engineService.getAll();
      const enginesData = response.data || [];
      setEngines(Array.isArray(enginesData) ? enginesData : []);
    } catch (error) {
      toast.error("Failed to load engines");
      console.error("Error loading engines:", error);
      setEngines([]);
    } finally {
      setIsLoading(false);
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

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setFormData({
      model: "",
      serialNo: "",
      altBrandModel: "",
      equipModel: "",
      equipSerialNo: "",
      altSerialNo: "",
      location: "",
      rating: "",
      rpm: "",
      startVoltage: "",
      runHours: "",
      fuelPumpSN: "",
      fuelPumpCode: "",
      lubeOil: "",
      fuelType: "",
      coolantAdditive: "",
      turboModel: "",
      turboSN: "",
      companyId: "",
    });
    setSelectedImage(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (engine: Engine) => {
    setModalMode("edit");
    setSelectedEngine(engine);
    setFormData({
      model: engine.model,
      serialNo: engine.serialNo,
      altBrandModel: engine.altBrandModel,
      equipModel: engine.equipModel,
      equipSerialNo: engine.equipSerialNo,
      altSerialNo: engine.altSerialNo,
      location: engine.location,
      rating: engine.rating,
      rpm: engine.rpm,
      startVoltage: engine.startVoltage,
      runHours: engine.runHours,
      fuelPumpSN: engine.fuelPumpSN,
      fuelPumpCode: engine.fuelPumpCode,
      lubeOil: engine.lubeOil,
      fuelType: engine.fuelType,
      coolantAdditive: engine.coolantAdditive,
      turboModel: engine.turboModel,
      turboSN: engine.turboSN,
      companyId: engine.company.id,
    });
    setSelectedImage(null);
    setImagePreview(engine.imageUrl || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEngine(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
      const loadingToast = toast.loading("Creating engine...");
      const dataToSubmit = {
        ...formData,
        ...(selectedImage && { image: selectedImage }),
      };
      await engineService.create(dataToSubmit);
      await loadEngines();
      toast.success("Engine created successfully!", { id: loadingToast });
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to create engine");
      console.error("Error creating engine:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmEdit = async () => {
    if (!selectedEngine) return;
    setIsSubmitting(true);
    try {
      const loadingToast = toast.loading("Updating engine...");
      const dataToSubmit = {
        ...formData,
        ...(selectedImage && { image: selectedImage }),
      };
      await engineService.update(selectedEngine.id, dataToSubmit);
      await loadEngines();
      toast.success("Engine updated successfully!", { id: loadingToast });
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to update engine");
      console.error("Error updating engine:", error);
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
    const loadingToast = toast.loading("Deleting engine...");
    try {
      await engineService.delete(pendingDeleteId);
      await loadEngines();
      toast.success("Engine deleted successfully!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to delete engine", { id: loadingToast });
      console.error("Error deleting engine:", error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  // Filter logic
  const locations = Array.from(new Set(engines.map((e) => e.location).filter(Boolean)));
  const types = Array.from(new Set(engines.map((e) => e.model).filter(Boolean)));

  const filteredEngines = Array.isArray(engines)
    ? engines
        .filter((engine) => {
          const matchesSearch =
            engine.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            engine.serialNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            engine.location?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCompanyId = companyId ? String(engine.company.id) === String(companyId) : true;
          const matchesCompany = filterCompany === "all" || String(engine.company.id) === filterCompany;
          const matchesLocation = filterLocation === "all" || engine.location === filterLocation;
          const matchesType = filterType === "all" || engine.model === filterType;
          return matchesSearch && matchesCompanyId && matchesCompany && matchesLocation && matchesType;
        })
        .sort((a, b) => {
          const modelA = a.model?.toLowerCase() || "";
          const modelB = b.model?.toLowerCase() || "";
          return sortOrder === "asc" ? modelA.localeCompare(modelB) : modelB.localeCompare(modelA);
        })
    : [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by model, serial, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 ease-in-out sm:text-sm"
            />
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-[#2B4C7E] hover:bg-[#1A2F4F] shadow-sm hover:shadow transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Engine
          </button>
        </div>

        {/* Filters */}
        {withFilterOptions && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <CustomSelect
              value={filterCompany}
              onChange={setFilterCompany}
              options={[
                { value: "all", label: "All Companies" },
                ...companies.map((company) => ({ value: company.id, label: company.name })),
              ]}
            />
            <CustomSelect
              value={filterLocation}
              onChange={setFilterLocation}
              options={[
                { value: "all", label: "All Locations" },
                ...locations.map((location) => ({ value: location, label: location })),
              ]}
            />
            <CustomSelect
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: "all", label: "All Models" },
                ...types.map((type) => ({ value: type, label: type })),
              ]}
            />
            <CustomSelect
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: "asc", label: "Ascending (A-Z)" },
                { value: "desc", label: "Descending (Z-A)" },
              ]}
            />
          </div>
        )}
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <CompanyCardsGridSkeleton />
      ) : filteredEngines.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CogIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No engines found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters, or add a new engine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEngines.map((engine, index) => (
            <div
              key={engine.id}
              className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Image Area */}
              <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent z-10 opacity-60" />
                
                {/* Actions Overlay */}
                <div className="absolute top-3 right-3 flex space-x-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleOpenEditModal(engine)}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors shadow-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(engine.id)}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors shadow-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                {engine.imageUrl ? (
                  <Image
                    src={engine.imageUrl}
                    alt={engine.model}
                    fill
                    className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <PhotoIcon className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                
                {/* Location Badge */}
                {engine.location && (
                  <div className="absolute bottom-3 left-3 z-20">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm border border-white/10">
                      <MapPinIcon className="h-3 w-3 mr-1" />
                      {engine.location}
                    </span>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={engine.model}>
                    {engine.model}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center">
                    <TagIcon className="h-3 w-3 mr-1" />
                    SN: {engine.serialNo}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-50 pt-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Rating</p>
                    <p className="font-medium text-gray-700 truncate">{engine.rating || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">RPM</p>
                    <p className="font-medium text-gray-700 truncate">{engine.rpm || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Company</p>
                    <p className="font-medium text-blue-600 truncate">{engine.company.name}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {modalMode === "create" ? "Add New Engine" : "Edit Engine Details"}
                </h3>
                <p className="text-sm text-gray-500">Enter technical specifications for the unit.</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Section: Basic Info */}
              <section>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <BoltIcon className="h-4 w-4 mr-2 text-blue-500" />
                  Core Specifications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Company <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    >
                      <option value="">Select a company...</option>
                      {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                  
                  {/* Reusable Input Field Component Logic */}
                  {[
                    { label: "Engine Model", key: "model", required: true },
                    { label: "Engine Serial No", key: "serialNo", required: true },
                    { label: "Main Alternator/Transmission brand/model", key: "altBrandModel" },
                    { label: "Equipment Model", key: "equipModel" },
                    { label: "Equipment Serial No", key: "equipSerialNo" },
                    { label: "Main Alternator/Transmission Serial No.", key: "altSerialNo" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={field.required}
                        value={(formData as any)[field.key]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Section: Performance & Location */}
              <section>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-2 text-green-500" />
                  Performance & Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { label: "Location", key: "location" },
                    { label: "Rating", key: "rating" },
                    { label: "RPM", key: "rpm" },
                    { label: "Starting Voltage", key: "startVoltage" },
                    { label: "Running Hours", key: "runHours" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">{field.label}</label>
                      <input
                        type="text"
                        value={(formData as any)[field.key]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Section: Technical Details */}
              <section>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <CogIcon className="h-4 w-4 mr-2 text-purple-500" />
                  Technical Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { label: "Fuel Pump S/N", key: "fuelPumpSN" },
                    { label: "Fuel Pump Code", key: "fuelPumpCode" },
                    { label: "Lube Oil Type", key: "lubeOil" },
                    { label: "Fuel Type", key: "fuelType" },
                    { label: "Cooling Water Additives", key: "coolantAdditive" },
                    { label: "Turbo Model", key: "turboModel" },
                    { label: "Turbo S/N", key: "turboSN" },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-500 uppercase">{field.label}</label>
                      <input
                        type="text"
                        value={(formData as any)[field.key]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Section: Image */}
              <section>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center">
                  <PhotoIcon className="h-4 w-4 mr-2 text-orange-500" />
                  Visuals
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <PhotoIcon className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-gray-50" />
                    </div>
                  )}
                </div>
              </section>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100 sticky bottom-0 bg-white py-4 -mx-6 px-6 mt-8">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {modalMode === "create" ? "Create Engine" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Engine"
        message="Are you sure you want to delete this engine? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showCreateConfirm}
        onClose={() => setShowCreateConfirm(false)}
        onConfirm={confirmCreate}
        title="Create Engine"
        message="Are you sure you want to create this engine?"
        confirmText="Create"
        cancelText="Cancel"
        type="info"
      />

      <ConfirmationModal
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={confirmEdit}
        title="Update Engine"
        message="Are you sure you want to save these changes?"
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}
