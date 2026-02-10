"use client";

import { useState, useEffect } from "react";
import { User, Position } from "@/types";
import { userService } from "@/services";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { useUserFormStore } from "@/stores/userFormStore";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  UserIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { TableSkeleton } from "./Skeletons";
import ConfirmationModal from "./ConfirmationModal";
import { usePermissions } from "@/hooks/usePermissions";

// Helper to generate consistent colors for avatars
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getPositionBadgeColor = (positionName: string | undefined) => {
  switch (positionName) {
    case "Super Admin":
      return "bg-red-100 text-red-800";
    case "Admin 1":
      return "bg-green-100 text-green-800";
    case "Admin 2":
      return "bg-yellow-100 text-yellow-800";
    case "Super User":
      return "bg-purple-100 text-purple-800";
    case "User 1":
      return "bg-blue-100 text-blue-800";
    case "User 2":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const colorClass = getAvatarColor(name);

  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${colorClass}`}
    >
      {initials}
    </div>
  );
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const { canRead, canWrite, canDelete, isLoading: permissionsLoading } = usePermissions();

  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Zustand store for persistent form data (excludes passwords for security)
  const { formData: storedFormData, setFormData: setStoredFormData, resetFormData } = useUserFormStore();

  // Local state for passwords (never persisted for security)
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });

  // Local state for edit mode (not persisted)
  const [editFormData, setEditFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    username: "",
    address: "",
    phone: "",
    position_id: "",
    // role: "user" as "user" | "admin", // commented out - now using position_id
  });

  // Combined form data for create mode
  const createFormData = {
    ...storedFormData,
    ...passwordData,
  };

  // Combined form data for edit mode
  const editFormDataWithPassword = {
    ...editFormData,
    password: "",
    confirmPassword: "",
  };

  // Use appropriate form data based on mode
  const currentFormData = modalMode === "edit" ? editFormDataWithPassword : createFormData;

  const updateFormData = (data: Partial<typeof currentFormData>) => {
    if (modalMode === "edit") {
      const { password, confirmPassword, ...rest } = data;
      setEditFormData(prev => ({ ...prev, ...rest }));
    } else {
      const { password, confirmPassword, ...rest } = data;
      if (password !== undefined || confirmPassword !== undefined) {
        setPasswordData(prev => ({
          ...prev,
          ...(password !== undefined ? { password } : {}),
          ...(confirmPassword !== undefined ? { confirmPassword } : {}),
        }));
      }
      if (Object.keys(rest).length > 0) {
        setStoredFormData(rest);
      }
    }
  };

  // Load users and positions on mount
  useEffect(() => {
    loadUsers();
    loadPositions();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userService.getAll();
      const usersData = response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      toast.error("Failed to load users");
      console.error("Error loading users:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const response = await apiClient.get("/positions");
      setPositions(response.data.data || []);
    } catch (error) {
      console.error("Error loading positions:", error);
    }
  };

  const handleOpenCreateModal = () => {
    // Reset password fields when opening create modal
    setPasswordData({ password: "", confirmPassword: "" });
    setModalMode("create");
    setShowModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setModalMode("edit");
    setSelectedUser(user);
    setEditFormData({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      username: user.username,
      address: user.address,
      phone: user.phone,
      position_id: user.position_id || "",
      // role: user.role, // commented out - now using position_id
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === "create") {
      if (passwordData.password !== passwordData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      setShowCreateConfirm(true);
    } else {
      setShowEditConfirm(true);
    }
  };

  const confirmCreate = async () => {
    setIsSubmitting(true);
    const loadingToast = toast.loading("Creating user...");
    try {
      await userService.create(currentFormData);
      await loadUsers();
      toast.success("User created successfully!", { id: loadingToast });
      resetFormData(); // Clear persisted form data
      setPasswordData({ password: "", confirmPassword: "" }); // Clear passwords
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create user", {
        id: loadingToast,
      });
      console.error("Error creating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmEdit = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    const loadingToast = toast.loading("Updating user...");
    try {
      await userService.update(selectedUser.id, currentFormData);
      await loadUsers();
      toast.success("User updated successfully!", { id: loadingToast });
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user", {
        id: loadingToast,
      });
      console.error("Error updating user:", error);
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
    const loadingToast = toast.loading("Deleting user...");
    try {
      await userService.delete(pendingDeleteId);
      await loadUsers();
      toast.success("User deleted successfully!", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete user", {
        id: loadingToast,
      });
      console.error("Error deleting user:", error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const filteredUsers = Array.isArray(users)
    ? users.filter(
        (user) =>
          user.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (permissionsLoading) {
    return <TableSkeleton rows={8} />;
  }

  if (!canRead("user_creation")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <UserIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">You do not have permission to view user accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 ease-in-out sm:text-sm"
          />
        </div>
        {canWrite("user_creation") && (
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-[#2B4C7E] hover:bg-[#1A2F4F] shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add User
          </button>
        )}
      </div>

      {/* Content Section */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Username
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    {(canWrite("user_creation") || canDelete("user_creation")) && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <UserIcon className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-gray-500 text-lg font-medium">
                            No users found
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            Try adjusting your search or add a new user.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50/50 transition-colors duration-150 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <Avatar
                                name={`${user.firstname} ${user.lastname}`}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{`${user.firstname} ${user.lastname}`}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {user.username}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 flex items-center">
                            <EnvelopeIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionBadgeColor(user.position?.name)}`}
                          >
                            {user.position?.display_name || "No Position"}
                          </span>
                        </td>
                        {(canWrite("user_creation") || canDelete("user_creation")) && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {canWrite("user_creation") && (
                                <button
                                  onClick={() => handleOpenEditModal(user)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              )}
                              {canDelete("user_creation") && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar name={`${user.firstname} ${user.lastname}`} />
                      <div>
                        <h3 className="font-semibold text-gray-900">{`${user.firstname} ${user.lastname}`}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {canWrite("user_creation") && (
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      )}
                      {canDelete("user_creation") && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col transform transition-all animate-slideUp">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {modalMode === "create" ? "Add New User" : "Edit User"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {modalMode === "create"
                    ? "Enter details for the new user account."
                    : "Update existing user information."}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow">
              <form
                id="user-form"
                onSubmit={handleSubmit}
                className="p-6 space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={currentFormData.firstname}
                      onChange={(e) =>
                        updateFormData({ firstname: e.target.value })
                      }
                      className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                      placeholder="e.g. John"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={currentFormData.lastname}
                      onChange={(e) =>
                        updateFormData({ lastname: e.target.value })
                      }
                      className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                      placeholder="e.g. Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={currentFormData.username}
                    onChange={(e) =>
                      updateFormData({ username: e.target.value })
                    }
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                    placeholder="e.g. johndoe"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <textarea
                    required
                    value={currentFormData.address}
                    onChange={(e) =>
                      updateFormData({ address: e.target.value })
                    }
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                    placeholder="e.g. 123 Main St"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={currentFormData.phone}
                    onChange={(e) =>
                      updateFormData({ phone: e.target.value })
                    }
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                    placeholder="e.g. +639123456789"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={currentFormData.email}
                    onChange={(e) =>
                      updateFormData({ email: e.target.value })
                    }
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                    placeholder="e.g. jane@example.com"
                    disabled={modalMode === "edit"}
                  />
                </div>

                {/* Role dropdown commented out - now using position_id */}
                {/* <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    required
                    value={currentFormData.role}
                    onChange={(e) =>
                      updateFormData({
                        role: e.target.value as "user" | "admin",
                      })
                    }
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div> */}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Position
                  </label>
                  <select
                    required
                    value={currentFormData.position_id}
                    onChange={(e) =>
                      updateFormData({ position_id: e.target.value })
                    }
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                  >
                    <option value="">Select a position</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                {modalMode === "create" && (
                  <>
                    <div className="space-y-2 relative">
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={passwordData.password}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, password: e.target.value })
                        }
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 top-6 flex items-center px-3 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="space-y-2 relative">
                      <label className="block text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors sm:text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 top-6 flex items-center px-3 text-gray-400 hover:text-gray-600"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="user-form"
                className="px-5 py-2.5 bg-[#2B4C7E] text-white font-medium rounded-xl hover:bg-[#1A2F4F] shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : modalMode === "create"
                  ? "Create User"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationModal
        isOpen={showCreateConfirm}
        onClose={() => setShowCreateConfirm(false)}
        onConfirm={confirmCreate}
        title="Create User"
        message="Are you sure you want to create this user?"
        confirmText="Create"
        cancelText="Cancel"
        type="info"
      />

      <ConfirmationModal
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={confirmEdit}
        title="Update User"
        message="Are you sure you want to save these changes?"
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}
