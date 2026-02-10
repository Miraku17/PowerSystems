"use client";

import { useState, useEffect } from "react";
import { Company } from "@/types";
import { companyService } from "@/services";
import toast from "react-hot-toast";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  PlusIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";
import { CompanyCardsGridSkeleton } from "./Skeletons";
import ConfirmationModal from "./ConfirmationModal";
import Image from "next/image";
import { usePermissions } from "@/hooks/usePermissions";

interface CompaniesProps {
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  onCompanyClick?: (companyId: string) => void;
}

export default function Companies({
  companies,
  setCompanies,
  onCompanyClick,
}: CompaniesProps) {
  const { canWrite, canDelete } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await companyService.getAll();
      const companiesData = response.data || [];
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      toast.error("Failed to load companies");
      console.error("Error loading companies:", error);
      setCompanies([]); // Set empty array on error
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (modalMode === "edit") {
      setFormData({ name: "" });
      setSelectedImage(null);
      setImagePreview(null);
    }
    setModalMode("create");
    setShowModal(true);
  };

  const handleOpenEditModal = (company: Company) => {
    setModalMode("edit");
    setSelectedCompany(company);
    setFormData({ name: company.name });
    setSelectedImage(null);
    setImagePreview(company.imageUrl || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCompany(null);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);

      // Create preview URL
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
    setIsLoading(true);
    try {
      const loadingToast = toast.loading("Creating company...");
      const dataToSubmit = {
        ...formData,
        ...(selectedImage && { image: selectedImage }),
      };
      await companyService.create(dataToSubmit);
      await loadCompanies();
      toast.success("Company created successfully!", { id: loadingToast });
      setFormData({ name: "" });
      setSelectedImage(null);
      setImagePreview(null);
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to create company");
      console.error("Error creating company:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEdit = async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    try {
      const loadingToast = toast.loading("Updating company...");
      const dataToSubmit = {
        ...formData,
        ...(selectedImage && { image: selectedImage }),
      };
      await companyService.update(selectedCompany.id, dataToSubmit);
      await loadCompanies();
      toast.success("Company updated successfully!", { id: loadingToast });
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to update company");
      console.error("Error updating company:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const loadingToast = toast.loading("Deleting company...");
    try {
      await companyService.delete(pendingDeleteId);
      await loadCompanies();
      toast.success("Company deleted successfully!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to delete company", { id: loadingToast });
      console.error("Error deleting company:", error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 ease-in-out sm:text-sm"
          />
        </div>
        {canWrite("company") && (
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-[#2B4C7E] hover:bg-[#1A2F4F] shadow-sm hover:shadow transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Company
          </button>
        )}
      </div>

      {/* Cards Grid */}
      {isInitialLoading ? (
        <CompanyCardsGridSkeleton />
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            {searchTerm ? "No companies found matching your search." : "No companies yet."}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Click &apos;Add Company&apos; to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompanies.map((company, index) => (
            <div
              key={company.id}
              className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => onCompanyClick?.(company.id)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Image Area */}
              <div className="relative h-48 w-full bg-gray-50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Actions Overlay */}
                {(canWrite("company") || canDelete("company")) && (
                  <div className="absolute top-3 right-3 flex space-x-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {canWrite("company") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(company);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors shadow-sm"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete("company") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(company.id);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors shadow-sm"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {company.imageUrl ? (
                  <>
                   {loadingImages[company.id] && (
                      <div className="absolute inset-0 w-full h-full bg-gray-200 animate-pulse z-20" />
                    )}
                    <Image
                      src={company.imageUrl}
                      alt={company.name}
                      fill
                      className="object-contain p-4 transform group-hover:scale-110 transition-transform duration-500"
                      onLoadingComplete={() => setLoadingImages(prev => ({ ...prev, [company.id]: false }))}
                      onLoadStart={() => setLoadingImages(prev => ({ ...prev, [company.id]: true }))}
                      unoptimized
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BuildingOfficeIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-4 border-t border-gray-50">
                <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {company.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Active Partner
                </p>
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
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-slideUp overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {modalMode === "create" ? "Add New Company" : "Edit Company"}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Manage partner details.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                    placeholder="Enter company name"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Company Logo/Image</label>
                
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
                  <div className="relative w-full h-48 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <img
                      src={imagePreview}
                      alt="Company preview"
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  style={{ backgroundColor: "#2B4C7E" }}
                >
                  {isLoading ? "Saving..." : modalMode === "create" ? "Create Company" : "Save Changes"}
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
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showCreateConfirm}
        onClose={() => setShowCreateConfirm(false)}
        onConfirm={confirmCreate}
        title="Create Company"
        message="Are you sure you want to create this company?"
        confirmText="Create"
        cancelText="Cancel"
        type="info"
      />

      <ConfirmationModal
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={confirmEdit}
        title="Update Company"
        message="Are you sure you want to save these changes?"
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}
