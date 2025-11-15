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
} from "@heroicons/react/24/outline";
import { CompanyCardsGridSkeleton } from "./Skeletons";
import CustomSelect from "./CustomSelect";
interface CompanyEnginesProps {
  companyId: string;
}

export default function CompanyEngines({ companyId }: CompanyEnginesProps) {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedEngine, setSelectedEngine] = useState<Engine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load engines and companies on mount
  useEffect(() => {
    loadEngines();
    loadCompanies();
  }, []);

  const loadEngines = async () => {
    try {
      const response = await engineService.getAll();
      console.log("Engines API Response:", response);
      const enginesData = response.data || [];
      if (Array.isArray(enginesData)) {
        setEngines(enginesData);
        console.log("Loaded engines:", enginesData.length);
      } else {
        console.warn("Invalid engines data format:", response);
        setEngines([]);
      }
    } catch (error) {
      toast.error("Failed to load engines");
      console.error("Error loading engines:", error);
      setEngines([]); // Set empty array on error
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
    companyId: 0,
  });

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
      companyId: 0,
    });
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
      companyId: Number(engine.company.id),
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEngine(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (modalMode === "create") {
        const loadingToast = toast.loading("Creating engine...");
        await engineService.create(formData);
        // Reload engines list from server
        await loadEngines();
        toast.success("Engine created successfully!", { id: loadingToast });
      } else if (selectedEngine) {
        const loadingToast = toast.loading("Updating engine...");
        await engineService.update(selectedEngine.id, formData);
        // Reload engines list from server
        await loadEngines();
        toast.success("Engine updated successfully!", { id: loadingToast });
      }
      handleCloseModal();
    } catch (error) {
      toast.error(
        `Failed to ${modalMode === "create" ? "create" : "update"} engine`
      );
      console.error("Error submitting engine:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this engine?")) {
      const loadingToast = toast.loading("Deleting engine...");
      try {
        await engineService.delete(id);
        // Reload engines list from server
        await loadEngines();
        toast.success("Engine deleted successfully!", { id: loadingToast });
      } catch (error) {
        toast.error("Failed to delete engine", { id: loadingToast });
        console.error("Error deleting engine:", error);
      }
    }
  };

  // Extract unique locations from engines
  const locations = Array.from(
    new Set(
      engines
        .filter((engine) => engine.location && engine.location.trim() !== "")
        .map((engine) => engine.location)
    )
  );

  // Extract unique engine models/types
  const types = Array.from(
    new Set(
      engines
        .filter((engine) => engine.model && engine.model.trim() !== "")
        .map((engine) => engine.model)
    )
  );

  // Filter engines by company, location, type and search term
  const filteredEngines = Array.isArray(engines)
    ? engines.filter((engine) => {
        // Company ID filter
        const matchesCompanyId = String(engine.company.id) === String(companyId);

        // Company filter
        const matchesCompanyFilter =
          filterCompany === "all" ||
          String(engine.company.id) === String(filterCompany);

        // Location filter
        const matchesLocationFilter =
          filterLocation === "all" || engine.location === filterLocation;

        // Type/Model filter
        const matchesTypeFilter =
          filterType === "all" || engine.model === filterType;

        // Search filter
        const matchesSearch =
          engine.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          engine.serialNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          engine.location?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesCompanyId && matchesCompanyFilter && matchesLocationFilter && matchesTypeFilter && matchesSearch;
      })
      .sort((a, b) => {
        // Sort by model name
        const comparison = a.model.localeCompare(b.model);
        return sortOrder === "asc" ? comparison : -comparison;
      })
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
          Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products by model, serial number, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Company Filter */}
        <CustomSelect
          value={filterCompany}
          onChange={setFilterCompany}
          options={[
            { value: "all", label: "All Companies" },
            ...companies.map((company) => ({
              value: company.id,
              label: company.name,
            })),
          ]}
        />

        {/* Location Filter */}
        <CustomSelect
          value={filterLocation}
          onChange={setFilterLocation}
          options={[
            { value: "all", label: "All Locations" },
            ...locations.map((location) => ({
              value: location,
              label: location,
            })),
          ]}
        />

        {/* Type Filter */}
        <CustomSelect
          value={filterType}
          onChange={setFilterType}
          options={[
            { value: "all", label: "All Models" },
            ...types.map((type) => ({
              value: type,
              label: type,
            })),
          ]}
        />

        {/* Sort Order */}
        <CustomSelect
          value={sortOrder}
          onChange={setSortOrder}
          options={[
            { value: "asc", label: "Ascending (A-Z)" },
            { value: "desc", label: "Descending (Z-A)" },
          ]}
        />
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <CompanyCardsGridSkeleton />
      ) : filteredEngines.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CogIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm
              ? "No products found matching your search."
              : "No products yet. Click 'Add Product' to create one."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEngines.map((engine) => (
            <div
              key={engine.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Placeholder Image */}
              <div className="w-full h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <CogIcon className="h-24 w-24 text-white opacity-50" />
              </div>

              {/* Card Content */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">
                  {engine.model}
                </h3>
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Serial:</span> {engine.serialNo}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {engine.location || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Rating:</span> {engine.rating || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">RPM:</span> {engine.rpm || 'N/A'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(engine)}
                    className="flex-1 px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-1"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(engine.id)}
                    className="flex-1 px-3 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center space-x-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
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
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {modalMode === "create" ? "Add New Engine" : "Edit Engine"}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.companyId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyId: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0}>Select a company...</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Engine model"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serial No
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.serialNo}
                      onChange={(e) =>
                        setFormData({ ...formData, serialNo: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Serial number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Brand Model
                    </label>
                    <input
                      type="text"
                      value={formData.altBrandModel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          altBrandModel: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Alternative brand model"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equip Model
                    </label>
                    <input
                      type="text"
                      value={formData.equipModel}
                      onChange={(e) =>
                        setFormData({ ...formData, equipModel: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Equipment model"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equip Serial No
                    </label>
                    <input
                      type="text"
                      value={formData.equipSerialNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          equipSerialNo: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Equipment serial number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alt Serial No
                    </label>
                    <input
                      type="text"
                      value={formData.altSerialNo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          altSerialNo: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Alternative serial number"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Specifications */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Location & Specifications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating
                    </label>
                    <input
                      type="text"
                      value={formData.rating}
                      onChange={(e) =>
                        setFormData({ ...formData, rating: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Rating"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RPM
                    </label>
                    <input
                      type="text"
                      value={formData.rpm}
                      onChange={(e) =>
                        setFormData({ ...formData, rpm: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="RPM"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Voltage
                    </label>
                    <input
                      type="text"
                      value={formData.startVoltage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          startVoltage: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Start voltage"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Run Hours
                    </label>
                    <input
                      type="text"
                      value={formData.runHours}
                      onChange={(e) =>
                        setFormData({ ...formData, runHours: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Run hours"
                    />
                  </div>
                </div>
              </div>

              {/* Fuel & Pump Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Fuel & Pump Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Pump SN
                    </label>
                    <input
                      type="text"
                      value={formData.fuelPumpSN}
                      onChange={(e) =>
                        setFormData({ ...formData, fuelPumpSN: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Fuel pump serial number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Pump Code
                    </label>
                    <input
                      type="text"
                      value={formData.fuelPumpCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fuelPumpCode: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Fuel pump code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lube Oil
                    </label>
                    <input
                      type="text"
                      value={formData.lubeOil}
                      onChange={(e) =>
                        setFormData({ ...formData, lubeOil: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Lube oil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Type
                    </label>
                    <input
                      type="text"
                      value={formData.fuelType}
                      onChange={(e) =>
                        setFormData({ ...formData, fuelType: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Fuel type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coolant Additive
                    </label>
                    <input
                      type="text"
                      value={formData.coolantAdditive}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          coolantAdditive: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Coolant additive"
                    />
                  </div>
                </div>
              </div>

              {/* Turbo Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Turbo Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Turbo Model
                    </label>
                    <input
                      type="text"
                      value={formData.turboModel}
                      onChange={(e) =>
                        setFormData({ ...formData, turboModel: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Turbo model"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Turbo SN
                    </label>
                    <input
                      type="text"
                      value={formData.turboSN}
                      onChange={(e) =>
                        setFormData({ ...formData, turboSN: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Turbo serial number"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
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
                  {modalMode === "create" ? "Create Engine" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
