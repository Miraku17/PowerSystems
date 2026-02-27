"use client";

import { useState, useEffect } from "react";
import { LeaveRequest, LEAVE_TYPE_LABELS, LeaveType } from "@/types";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import {
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

interface LeaveRequestsProps {
  refreshKey?: number;
  showAll?: boolean;
  onAction?: () => void;
}

export default function LeaveRequests({ refreshKey, showAll, onAction }: LeaveRequestsProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<{ id: string; name: string; open: boolean }>({ id: "", name: "", open: false });
  const [rejectionModal, setRejectionModal] = useState<{ id: string; name: string; open: boolean }>({ id: "", name: "", open: false });
  const [rejectionReason, setRejectionReason] = useState("");

  const { canEdit, getScope } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const canApprove = canEdit("leave_approval");
  const approvalScope = getScope("leave_approval", "edit");

  const canApproveRequest = (req: LeaveRequest): boolean => {
    if (!canApprove) return false;
    if (approvalScope !== "branch") return true;
    return !!currentUser?.address && (req.user as any)?.address === currentUser.address;
  };

  useEffect(() => {
    fetchRequests();
  }, [refreshKey]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/leave-requests");
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModal.id) return;
    setProcessingId(approveModal.id);
    try {
      const res = await apiClient.patch(`/leave-requests/${approveModal.id}`, { status: "approved" });
      if (res.data.success) {
        toast.success("Leave request approved");
        setApproveModal({ id: "", name: "", open: false });
        fetchRequests();
        onAction?.();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to approve leave request";
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionModal.id) return;
    setProcessingId(rejectionModal.id);
    try {
      const res = await apiClient.patch(`/leave-requests/${rejectionModal.id}`, {
        status: "rejected",
        rejection_reason: rejectionReason || undefined,
      });
      if (res.data.success) {
        toast.success("Leave request rejected");
        setRejectionModal({ id: "", name: "", open: false });
        setRejectionReason("");
        fetchRequests();
        onAction?.();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to reject leave request";
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const getRequestName = (req: LeaveRequest) => {
    return req.user ? `${req.user.firstname} ${req.user.lastname}` : "this employee";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {showAll ? "All Leave Requests" : "My Leave Requests"}
        </h2>
      </div>

      {requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">No leave requests found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {showAll && <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Start</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">End</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Days</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Filed</th>
                {canApprove && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}

              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  {showAll && (
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {req.user ? `${req.user.firstname} ${req.user.lastname}` : "-"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {LEAVE_TYPE_LABELS[req.leave_type as LeaveType] || req.leave_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(req.start_date)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(req.end_date)}</td>
                  <td className="px-4 py-3 text-gray-700">{req.total_days}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{req.reason || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[req.status]}`}>
                      {req.status}
                    </span>
                    {req.status === "rejected" && req.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1 truncate max-w-[150px]" title={req.rejection_reason}>
                        {req.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(req.created_at)}</td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      {req.status === "pending" && canApproveRequest(req) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setApproveModal({ id: req.id, name: getRequestName(req), open: true })}
                            disabled={processingId === req.id}
                            className="p-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setRejectionModal({ id: req.id, name: getRequestName(req), open: true })}
                            disabled={processingId === req.id}
                            className="p-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {req.status !== "pending" && req.approver && (
                        <span className="text-xs text-gray-500">
                          by {req.approver.firstname} {req.approver.lastname}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setApproveModal({ id: "", name: "", open: false })}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Approve Leave Request</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to approve the leave request for <strong>{approveModal.name}</strong>? This will deduct from their leave credits.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setApproveModal({ id: "", name: "", open: false })}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processingId === approveModal.id}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processingId === approveModal.id ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setRejectionModal({ id: "", name: "", open: false }); setRejectionReason(""); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Leave Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject the leave request for <strong>{rejectionModal.name}</strong>?
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (optional)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectionModal({ id: "", name: "", open: false });
                  setRejectionReason("");
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === rejectionModal.id}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processingId === rejectionModal.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
