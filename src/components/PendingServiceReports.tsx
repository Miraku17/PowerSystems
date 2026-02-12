"use client";

import { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "./Skeletons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from "@/components/ui/pagination";
import ViewDeutzCommissioning from "@/components/ViewDeutzCommissioning";
import ViewDeutzService from "@/components/ViewDeutzService";
import ViewSubmersiblePumpCommissioning from "@/components/ViewSubmersiblePumpCommissioning";
import ViewSubmersiblePumpService from "@/components/ViewSubmersiblePumpService";
import ViewSubmersiblePumpTeardown from "@/components/ViewSubmersiblePumpTeardown";
import ViewElectricSurfacePumpCommissioning from "@/components/ViewElectricSurfacePumpCommissioning";
import ViewElectricSurfacePumpService from "@/components/ViewElectricSurfacePumpService";
import ViewEngineSurfacePumpService from "@/components/ViewEngineSurfacePumpService";
import ViewEngineSurfacePumpCommissioning from "@/components/ViewEngineSurfacePumpCommissioning";
import ViewEngineTeardown from "@/components/ViewEngineTeardown";
import ViewElectricSurfacePumpTeardown from "@/components/ViewElectricSurfacePumpTeardown";
import ViewEngineInspectionReceiving from "@/components/ViewEngineInspectionReceiving";
import ViewComponentsTeardownMeasuring from "@/components/ViewComponentsTeardownMeasuring";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [viewModal, setViewModal] = useState<{ formType: string; data: Record<string, any> } | null>(null);
  const [viewLoading, setViewLoading] = useState<string | null>(null);
  const recordsPerPage = 5;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const handleClose = async (id: string) => {
    setProcessing(id);
    try {
      const response = await apiClient.post(`/approvals/${id}`, {
        action: "close",
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchPending();
      } else {
        toast.error(response.data.message || "Failed to close");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to close");
    } finally {
      setProcessing(null);
    }
  };

  const handleViewRecord = async (record: PendingApproval) => {
    setViewLoading(record.id);
    try {
      const response = await apiClient.get(`/forms/${record.form_type}`);
      const records = response.data?.data || response.data || [];
      const formRecord = Array.isArray(records)
        ? records.find((r: any) => String(r.id) === String(record.report_id))
        : null;

      if (formRecord) {
        setViewModal({ formType: record.form_type, data: formRecord.data || formRecord });
      } else {
        toast.error("Form record not found");
      }
    } catch (error) {
      console.error("Error fetching form record:", error);
      toast.error("Failed to load form details");
    } finally {
      setViewLoading(null);
    }
  };

  const getStatusBadge = (record: PendingApproval) => {
    if (record.is_rejected) {
      return { label: "Rejected", color: "bg-red-100 text-red-800" };
    }
    // Both levels approved
    if (record.level1_status === "completed" && record.level2_status === "completed") {
      if (record.status === "closed") {
        return { label: "Closed", color: "bg-purple-100 text-purple-800" };
      }
      return { label: "In Progress", color: "bg-blue-100 text-blue-800" };
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

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const renderPaginationItems = () => {
    const items: React.ReactNode[] = [];

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          onClick={() => setCurrentPage(1)}
          isActive={currentPage === 1}
          style={{ cursor: "pointer" }}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (currentPage > 3) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Pages adjacent to current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
            style={{ cursor: "pointer" }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
            style={{ cursor: "pointer" }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Form Type
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  JO Number
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  Customer
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  Date
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  Requester
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  Branch
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  Approval Trail
                </TableHead>
                {!meta?.isRequester && (
                  <TableHead className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={meta?.isRequester ? 8 : 9}>
                    <TableSkeleton rows={5} />
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => {
                  const badge = getStatusBadge(record);
                  return (
                    <TableRow
                      key={record.id}
                      className="hover:bg-blue-50/50 transition-all duration-200 group cursor-pointer"
                      onClick={() => handleViewRecord(record)}
                    >
                      <TableCell className="px-6 py-4 text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors max-w-[160px]">
                        <div className="flex items-center gap-2">
                          {viewLoading === record.id ? (
                            <div className="h-4 w-4 flex-shrink-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <EyeIcon className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          )}
                          <span className="break-words leading-tight">{record.form_type_label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.job_order_no || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden sm:table-cell">
                        {record.customer_name || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                        {formatDate(record.date_created)}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">
                        {record.requester_name}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                        {record.requester_address || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs text-gray-500 hidden lg:table-cell">
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
                      </TableCell>
                      {!meta?.isRequester && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const canAct =
                              (meta?.approvalLevel === 0 && (record.level1_status === "pending" || (record.level1_status === "completed" && record.level2_status === "pending"))) ||
                              (meta?.approvalLevel === 1 && record.level1_status === "pending") ||
                              (meta?.approvalLevel === 2 && record.level1_status === "completed" && record.level2_status === "pending");
                            const canClose =
                              !record.is_rejected &&
                              record.level1_status === "completed" &&
                              record.level2_status === "completed" &&
                              record.status !== "closed" &&
                              (meta?.positionName === "Admin 2" || meta?.positionName === "Super Admin");

                            return canAct || canClose ? (
                              <div className="flex items-center justify-end gap-2">
                                {canAct && (
                                  <>
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
                                  </>
                                )}
                                {canClose && (
                                  <button
                                    onClick={() => handleClose(record.id)}
                                    disabled={processing === record.id}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <CheckCircleIcon className="h-4 w-4" />
                                    Close
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            );
                          })()}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={meta?.isRequester ? 8 : 9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <MagnifyingGlassIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No service reports found</p>
                      <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    style={{ cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    style={{ cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
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

      {/* View Form Modal */}
      {viewModal && viewModal.formType === "deutz-commissioning" && (
        <ViewDeutzCommissioning data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "deutz-service" && (
        <ViewDeutzService data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "submersible-pump-commissioning" && (
        <ViewSubmersiblePumpCommissioning data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "submersible-pump-service" && (
        <ViewSubmersiblePumpService data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "submersible-pump-teardown" && (
        <ViewSubmersiblePumpTeardown data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "electric-surface-pump-commissioning" && (
        <ViewElectricSurfacePumpCommissioning data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "electric-surface-pump-service" && (
        <ViewElectricSurfacePumpService data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "engine-surface-pump-service" && (
        <ViewEngineSurfacePumpService data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "engine-surface-pump-commissioning" && (
        <ViewEngineSurfacePumpCommissioning data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "engine-teardown" && (
        <ViewEngineTeardown data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "electric-surface-pump-teardown" && (
        <ViewElectricSurfacePumpTeardown data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "engine-inspection-receiving" && (
        <ViewEngineInspectionReceiving data={viewModal.data} onClose={() => setViewModal(null)} />
      )}
      {viewModal && viewModal.formType === "components-teardown-measuring" && (
        <ViewComponentsTeardownMeasuring data={viewModal.data} recordId={viewModal.data.id} onClose={() => setViewModal(null)} />
      )}
    </div>
  );
}
