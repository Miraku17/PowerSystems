"use client";

import { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "./Skeletons";

interface PendingApproval {
  id: string;
  report_table: string;
  report_id: string;
  form_type: string;
  form_type_label: string;
  job_order_no: string;
  customer_name: string;
  date_created: string;
  status: string;
  level1_status: string;
  level1_remarks: string | null;
  level1_approved_by_name: string | null;
  level2_status: string;
  level2_remarks: string | null;
  level2_approved_by_name: string | null;
  requester_name: string;
  requester_address: string;
  is_rejected: boolean;
}

export default function PendingServiceReports() {
  const [records, setRecords] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; label: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [meta, setMeta] = useState<{ approvalLevel: number; positionName: string; isRequester: boolean } | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/approvals/pending");
      if (response.data.success) {
        setRecords(response.data.data || []);
        setMeta(response.data.meta || null);
      }
    } catch (error) {
      console.error("Error fetching pending service reports:", error);
      toast.error("Failed to load pending service reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const response = await apiClient.post(`/approvals/${id}`, {
        action: "approve",
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchPending();
      } else {
        toast.error(response.data.message || "Failed to approve");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      const response = await apiClient.post(`/approvals/${rejectModal.id}`, {
        action: "reject",
        notes: rejectNotes,
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setRejectModal(null);
        setRejectNotes("");
        fetchPending();
      } else {
        toast.error(response.data.message || "Failed to reject");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (record: PendingApproval) => {
    if (record.is_rejected) {
      return { label: "Rejected", color: "bg-red-100 text-red-800" };
    }
    // Both levels approved — fully approved, awaiting user completion
    if (record.level1_status === "completed" && record.level2_status === "completed") {
      return { label: "Approved", color: "bg-green-100 text-green-800" };
    }
    if (record.level1_status === "completed" && record.level2_status === "pending") {
      return { label: "Pending (L2)", color: "bg-blue-100 text-blue-800" };
    }
    if (record.level1_status === "pending") {
      return { label: "Pending (L1)", color: "bg-yellow-100 text-yellow-800" };
    }
    if (record.status === "completed") {
      return { label: "Completed", color: "bg-emerald-100 text-emerald-800" };
    }
    return { label: record.status, color: "bg-gray-100 text-gray-800" };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredRecords = records.filter(
    (r) =>
      (r.job_order_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.requester_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.form_type_label || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.requester_address || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Service Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta?.isRequester
              ? "Track the approval status of your submitted service reports."
              : "Review and approve service reports."}
            {meta?.positionName && !meta?.isRequester && (
              <span className="ml-1 font-medium text-gray-600">
                ({meta.positionName})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by form type, JO number, customer, requester..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-sm text-gray-500">
          {filteredRecords.length} report{filteredRecords.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Form Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  JO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Requester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Approval Trail
                </th>
                {!meta?.isRequester && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={meta?.isRequester ? 8 : 9}>
                    <TableSkeleton rows={5} />
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const badge = getStatusBadge(record);
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.form_type_label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.job_order_no || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden sm:table-cell">
                        {record.customer_name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {formatDate(record.date_created)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">
                        {record.requester_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {record.requester_address || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 hidden lg:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${record.level1_approved_by_name ? (record.level1_remarks?.startsWith("REJECTED:") ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`} />
                            <span className="text-gray-400">L1:</span>
                            <span className={record.level1_approved_by_name ? "text-gray-700 font-medium" : "text-gray-400"}>
                              {record.level1_approved_by_name || "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${record.level2_approved_by_name ? (record.level2_remarks?.startsWith("REJECTED:") ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`} />
                            <span className="text-gray-400">L2:</span>
                            <span className={record.level2_approved_by_name ? "text-gray-700 font-medium" : "text-gray-400"}>
                              {record.level2_approved_by_name || "Pending"}
                            </span>
                          </div>
                        </div>
                      </td>
                      {!meta?.isRequester && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {(() => {
                            const canAct =
                              (meta?.approvalLevel === 0 && (record.level1_status === "pending" || (record.level1_status === "completed" && record.level2_status === "pending"))) ||
                              (meta?.approvalLevel === 1 && record.level1_status === "pending") ||
                              (meta?.approvalLevel === 2 && record.level1_status === "completed" && record.level2_status === "pending");
                            return canAct ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApprove(record.id)}
                                  disabled={processing === record.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    setRejectModal({
                                      id: record.id,
                                      label: record.job_order_no || record.form_type_label,
                                    })
                                  }
                                  disabled={processing === record.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            );
                          })()}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={meta?.isRequester ? 8 : 9} className="px-6 py-10 text-center text-gray-500">
                    No service reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRejectModal(null);
              setRejectNotes("");
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Reject Service Report</h3>
              </div>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectNotes("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Rejecting <span className="font-semibold">{rejectModal.label}</span>. Please provide a reason:
              </p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectNotes("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === rejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing === rejectModal.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
