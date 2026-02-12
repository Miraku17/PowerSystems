"use client";

import { useState, useEffect } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { TableSkeleton } from "./Skeletons";
import ViewJobOrderRequest from "./ViewJobOrderRequest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from "@/components/ui/pagination";

interface PendingJO {
  id: string;
  jo_number: string;
  full_customer_name: string;
  date_prepared: string;
  created_at: string;
  approval_status: string;
  requester_name: string;
  requester_address: string;
  level_1_approved_by_name: string | null;
  level_1_approved_at: string | null;
  level_1_notes: string | null;
  level_2_approved_by_name: string | null;
  level_2_approved_at: string | null;
  level_2_notes: string | null;
  level_3_approved_by_name: string | null;
  level_3_approved_at: string | null;
  level_3_notes: string | null;
}

export default function PendingJORequests() {
  const [records, setRecords] = useState<PendingJO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; joNumber: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [meta, setMeta] = useState<{ approvalLevel: number; positionName: string; isRequester: boolean } | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const fetchPending = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/forms/job-order-request/pending");
      if (response.data.success) {
        setRecords(response.data.data || []);
        setMeta(response.data.meta || null);
      }
    } catch (error) {
      console.error("Error fetching pending JO requests:", error);
      toast.error("Failed to load pending requests");
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
      const response = await apiClient.post(`/forms/job-order-request/${id}/approve`, {
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
      const response = await apiClient.post(`/forms/job-order-request/${rejectModal.id}/approve`, {
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

  const { data: viewData, isFetching: loadingView } = useQuery({
    queryKey: ["jo-request-detail", selectedRecordId],
    queryFn: async () => {
      const response = await apiClient.get(`/forms/job-order-request/${selectedRecordId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error("Failed to load JO request details");
    },
    enabled: !!selectedRecordId,
  });

  const handleViewRecord = (id: string) => {
    setSelectedRecordId(id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_level_1":
        return { label: "Pending Level 1", color: "bg-yellow-100 text-yellow-800" };
      case "pending_level_2":
        return { label: "Pending Level 2", color: "bg-blue-100 text-blue-800" };
      case "pending_level_3":
        return { label: "Pending Level 3", color: "bg-purple-100 text-purple-800" };
      case "approved":
        return { label: "Approved", color: "bg-green-100 text-green-800" };
      case "rejected":
        return { label: "Rejected", color: "bg-red-100 text-red-800" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
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
      (r.jo_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.full_customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.requester_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.requester_address || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">JO Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta?.isRequester
              ? "Track the approval status of your Job Order Requests."
              : "Review and approve Job Order Requests."}
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
            placeholder="Search by JO number, customer, requester..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-sm text-gray-500">
          {filteredRecords.length} request{filteredRecords.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  JO Number
                </TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
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
                  <TableCell colSpan={meta?.isRequester ? 7 : 8}>
                    <TableSkeleton rows={5} />
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => {
                  const badge = getStatusBadge(record.approval_status);
                  return (
                    <TableRow
                      key={record.id}
                      className="hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => handleViewRecord(record.id)}
                    >
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {record.jo_number || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.full_customer_name || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                        {formatDate(record.date_prepared || record.created_at)}
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
                            <span className={`w-2 h-2 rounded-full ${record.level_1_approved_by_name ? (record.level_1_notes?.startsWith("REJECTED:") ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`} />
                            <span className="text-gray-400">L1:</span>
                            <span className={record.level_1_approved_by_name ? "text-gray-700 font-medium" : "text-gray-400"}>
                              {record.level_1_approved_by_name || "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${record.level_2_approved_by_name ? (record.level_2_notes?.startsWith("REJECTED:") ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`} />
                            <span className="text-gray-400">L2:</span>
                            <span className={record.level_2_approved_by_name ? "text-gray-700 font-medium" : "text-gray-400"}>
                              {record.level_2_approved_by_name || "Pending"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${record.level_3_approved_by_name ? (record.level_3_notes?.startsWith("REJECTED:") ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`} />
                            <span className="text-gray-400">L3:</span>
                            <span className={record.level_3_approved_by_name ? "text-gray-700 font-medium" : "text-gray-400"}>
                              {record.level_3_approved_by_name || "Pending"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      {!meta?.isRequester && (
                        <TableCell className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          {record.approval_status === `pending_level_${meta?.approvalLevel}` || (meta?.approvalLevel === 0 && record.approval_status.startsWith("pending_level_")) ? (
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
                                    joNumber: record.jo_number || record.id,
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
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={meta?.isRequester ? 7 : 8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <MagnifyingGlassIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No JO requests found</p>
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
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{ cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
                    aria-disabled={currentPage === 1}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, idx) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={currentPage === page}
                        onClick={() => setCurrentPage(page)}
                        style={{ cursor: "pointer" }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{ cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
                    aria-disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* View JO Request Modal */}
      {viewData && selectedRecordId && (
        <ViewJobOrderRequest
          data={viewData}
          onClose={() => setSelectedRecordId(null)}
        />
      )}

      {/* Loading overlay for view */}
      {loadingView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}>
          <div className="bg-white rounded-lg p-6 shadow-xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading details...</span>
          </div>
        </div>
      )}

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
                <h3 className="text-xl font-bold text-gray-900">Reject JO Request</h3>
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
                Rejecting <span className="font-semibold">{rejectModal.joNumber}</span>. Please provide a reason:
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
