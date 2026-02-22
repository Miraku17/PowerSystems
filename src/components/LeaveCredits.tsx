"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PencilIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface UserCredit {
  user: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    position?: {
      id: string;
      name: string;
    } | null;
  };
  credits: {
    user_id: string;
    total_credits: number;
    used_credits: number;
  };
}

export default function LeaveCredits() {
  const [userCredits, setUserCredits] = useState<UserCredit[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; user: UserCredit | null }>({
    open: false,
    user: null,
  });
  const [newCredits, setNewCredits] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { canWrite } = usePermissions();
  const canEditCredits = canWrite("leave_credits");

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/leave-credits");
      if (res.data.success) {
        setUserCredits(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching leave credits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCredits = async () => {
    if (!editModal.user) return;
    const credits = parseFloat(newCredits);
    if (isNaN(credits) || credits < 0) {
      toast.error("Please enter a valid credit amount");
      return;
    }

    // Validate: new total can't be less than used
    if (credits < editModal.user.credits.used_credits) {
      toast.error(`Total credits cannot be less than used credits (${editModal.user.credits.used_credits})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.patch("/leave-credits", {
        user_id: editModal.user.user.id,
        total_credits: credits,
      });
      if (res.data.success) {
        toast.success("Leave credits updated");
        setEditModal({ open: false, user: null });
        setNewCredits("");
        fetchCredits();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to update leave credits";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = userCredits.filter((uc) => {
    const name = `${uc.user.firstname} ${uc.user.lastname} ${uc.user.position?.name || ""}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Leave Credits Management</h2>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employees..."
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total Credits</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Used</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Remaining</th>
              {canEditCredits && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((uc) => {
              const remaining = uc.credits.total_credits - uc.credits.used_credits;
              return (
                <tr key={uc.user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {uc.user.firstname} {uc.user.lastname}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{uc.user.position?.name || "-"}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{uc.credits.total_credits}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{uc.credits.used_credits}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${remaining > 0 ? "text-green-700" : "text-gray-500"}`}>
                      {remaining}
                    </span>
                  </td>
                  {canEditCredits && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setEditModal({ open: true, user: uc });
                          setNewCredits(String(uc.credits.total_credits));
                        }}
                        className="p-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                        title="Edit credits"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="p-8 text-center text-gray-500 text-sm">No employees found.</div>
      )}

      {/* Edit Credits Modal */}
      {editModal.open && editModal.user && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditModal({ open: false, user: null })}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit Leave Credits</h3>
            <p className="text-sm text-gray-500 mb-4">
              {editModal.user.user.firstname} {editModal.user.user.lastname}
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Currently used:</span>
                <span className="font-medium text-gray-900">{editModal.user.credits.used_credits} day(s)</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Credits</label>
                <input
                  type="number"
                  value={newCredits}
                  onChange={(e) => setNewCredits(e.target.value)}
                  min={editModal.user.credits.used_credits}
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditModal({ open: false, user: null });
                  setNewCredits("");
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCredits}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-white bg-[#083459] rounded-lg hover:bg-[#0a4470] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
