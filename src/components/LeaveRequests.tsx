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
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

function ActionButton({
  onClick,
  disabled,
  className,
  tooltip,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <button onClick={onClick} disabled={disabled} className={className}>
        {children}
      </button>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {tooltip}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  conditional: "bg-orange-100 text-orange-800",
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
  const [conditionalModal, setConditionalModal] = useState<{ id: string; name: string; open: boolean }>({ id: "", name: "", open: false });
  const [rejectionModal, setRejectionModal] = useState<{ id: string; name: string; open: boolean }>({ id: "", name: "", open: false });
  const [revokeModal, setRevokeModal] = useState<{ id: string; name: string; currentStatus: string; open: boolean }>({ id: "", name: "", currentStatus: "", open: false });
  const [rejectionReason, setRejectionReason] = useState("");

  const { canEdit, getScope } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const canApprove = canEdit("leave_approval");
  const canFullApprove = canEdit("leave_approval_full");
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

  const handleAction = async (id: string, status: string, reason?: string) => {
    setProcessingId(id);
    try {
      const payload: any = { status };
      if (reason) payload.rejection_reason = reason;

      const res = await apiClient.patch(`/leave-requests/${id}`, payload);
      if (res.data.success) {
        const messages: Record<string, string> = {
          conditional: "Leave request set to conditional",
          approved: "Leave request approved",
          rejected: "Leave request rejected",
          pending: "Leave request revoked back to pending",
        };
        toast.success(messages[status] || "Leave request updated");
        fetchRequests();
        onAction?.();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to update leave request";
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = () => {
    if (approveModal.id) {
      handleAction(approveModal.id, "approved");
      setApproveModal({ id: "", name: "", open: false });
    }
  };

  const handleConditional = () => {
    if (conditionalModal.id) {
      handleAction(conditionalModal.id, "conditional");
      setConditionalModal({ id: "", name: "", open: false });
    }
  };

  const handleReject = () => {
    if (rejectionModal.id) {
      handleAction(rejectionModal.id, "rejected", rejectionReason || undefined);
      setRejectionModal({ id: "", name: "", open: false });
      setRejectionReason("");
    }
  };

  const handleRevoke = () => {
    if (revokeModal.id) {
      handleAction(revokeModal.id, "pending");
      setRevokeModal({ id: "", name: "", currentStatus: "", open: false });
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
              {requests.map((req) => {
                const canManage = canApproveRequest(req);
                const isPending = req.status === "pending";
                const isConditional = req.status === "conditional";
                const isProcessed = req.status === "approved" || req.status === "rejected" || req.status === "conditional";

                return (
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
                        {canManage && (
                          <div className="flex gap-1 flex-wrap">
                            {/* Pending: show conditional, approve (if full), reject */}
                            {isPending && (
                              <>
                                <ActionButton
                                  onClick={() => setConditionalModal({ id: req.id, name: getRequestName(req), open: true })}
                                  disabled={processingId === req.id}
                                  className="p-1.5 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50"
                                  tooltip="Set Conditional"
                                >
                                  <ExclamationTriangleIcon className="h-4 w-4" />
                                </ActionButton>
                                {canFullApprove && (
                                  <ActionButton
                                    onClick={() => setApproveModal({ id: req.id, name: getRequestName(req), open: true })}
                                    disabled={processingId === req.id}
                                    className="p-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                                    tooltip="Approve"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </ActionButton>
                                )}
                                <ActionButton
                                  onClick={() => setRejectionModal({ id: req.id, name: getRequestName(req), open: true })}
                                  disabled={processingId === req.id}
                                  className="p-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                                  tooltip="Reject"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </ActionButton>
                              </>
                            )}

                            {/* Conditional: show approve (if full), reject, revoke */}
                            {isConditional && (
                              <>
                                {canFullApprove && (
                                  <ActionButton
                                    onClick={() => setApproveModal({ id: req.id, name: getRequestName(req), open: true })}
                                    disabled={processingId === req.id}
                                    className="p-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
                                    tooltip="Approve"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </ActionButton>
                                )}
                                <ActionButton
                                  onClick={() => setRejectionModal({ id: req.id, name: getRequestName(req), open: true })}
                                  disabled={processingId === req.id}
                                  className="p-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                                  tooltip="Reject"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </ActionButton>
                                <ActionButton
                                  onClick={() => setRevokeModal({ id: req.id, name: getRequestName(req), currentStatus: req.status, open: true })}
                                  disabled={processingId === req.id}
                                  className="p-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                                  tooltip="Revoke to Pending"
                                >
                                  <ArrowUturnLeftIcon className="h-4 w-4" />
                                </ActionButton>
                              </>
                            )}

                            {/* Approved or Rejected: show revoke only */}
                            {(req.status === "approved" || req.status === "rejected") && (
                              <ActionButton
                                onClick={() => setRevokeModal({ id: req.id, name: getRequestName(req), currentStatus: req.status, open: true })}
                                disabled={processingId === req.id}
                                className="p-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                                tooltip="Revoke to Pending"
                              >
                                <ArrowUturnLeftIcon className="h-4 w-4" />
                              </ActionButton>
                            )}

                            {/* Show who processed it */}
                            {isProcessed && req.approver && (
                              <span className="text-xs text-gray-500 self-center ml-1">
                                by {req.approver.firstname} {req.approver.lastname}
                              </span>
                            )}
                          </div>
                        )}
                        {!canManage && isProcessed && req.approver && (
                          <span className="text-xs text-gray-500">
                            by {req.approver.firstname} {req.approver.lastname}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
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
              Are you sure you want to <strong>fully approve</strong> the leave request for <strong>{approveModal.name}</strong>? This will deduct from their leave credits.
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

      {/* Conditional Confirmation Modal */}
      {conditionalModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConditionalModal({ id: "", name: "", open: false })}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Set as Conditional</h3>
            <p className="text-sm text-gray-600 mb-6">
              Set the leave request for <strong>{conditionalModal.name}</strong> as <strong>conditional</strong>? This means the leave is acknowledged but subject to explanation/endorsement to managers. No credits will be deducted yet.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConditionalModal({ id: "", name: "", open: false })}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConditional}
                disabled={processingId === conditionalModal.id}
                className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {processingId === conditionalModal.id ? "Processing..." : "Set Conditional"}
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

      {/* Revoke Confirmation Modal */}
      {revokeModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRevokeModal({ id: "", name: "", currentStatus: "", open: false })}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Revoke Decision</h3>
            <p className="text-sm text-gray-600 mb-2">
              Revoke the <strong className="capitalize">{revokeModal.currentStatus}</strong> status for <strong>{revokeModal.name}</strong>&apos;s leave request? This will set it back to <strong>pending</strong>.
            </p>
            {revokeModal.currentStatus === "approved" && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mb-4">
                Since this leave was approved, revoking will restore the deducted leave credits.
              </p>
            )}
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setRevokeModal({ id: "", name: "", currentStatus: "", open: false })}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={processingId === revokeModal.id}
                className="px-4 py-2 text-sm text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {processingId === revokeModal.id ? "Revoking..." : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
