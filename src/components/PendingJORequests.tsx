"use client";

import { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
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
  status: string;
  requester_name: string;
  requester_address: string;
}

const STATUS_OPTIONS = ["In-Progress", "Pending", "Close", "Cancelled"];

export default function PendingJORequests() {
  const [records, setRecords] = useState<PendingJO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ canEdit: boolean; isRequester: boolean } | null>(null);
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
      console.error("Error fetching JO requests:", error);
      toast.error("Failed to load requests");
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

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      const response = await apiClient.patch(`/forms/job-order-request/${id}/status`, { status: newStatus });
      if (response.data.success) {
        toast.success("Status updated successfully");
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
      } else {
        toast.error(response.data.message || "Failed to update status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(null);
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

  const getStatusSelectClass = (status: string) => {
    switch (status) {
      case "In-Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Close":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In-Progress":
        return { label: "In-Progress", color: "bg-blue-100 text-blue-800" };
      case "Pending":
        return { label: "Pending", color: "bg-yellow-100 text-yellow-800" };
      case "Close":
        return { label: "Close", color: "bg-green-100 text-green-800" };
      case "Cancelled":
        return { label: "Cancelled", color: "bg-red-100 text-red-800" };
      default:
        return { label: status || "Unknown", color: "bg-gray-100 text-gray-800" };
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

  const { getScope } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const approvalScope = getScope("approvals", "edit");

  const canChangeStatusForRecord = (record: PendingJO): boolean => {
    if (!meta?.canEdit) return false;
    if (approvalScope !== "branch") return true;
    return !!currentUser?.address && record.requester_address === currentUser.address;
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
              ? "Track the status of your Job Order Requests."
              : "Manage Job Order Requests."}
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
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <TableSkeleton rows={5} />
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => {
                  const badge = getStatusBadge(record.status);
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
                      <TableCell className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {canChangeStatusForRecord(record) ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={record.status || "Pending"}
                              onChange={(e) => handleStatusChange(record.id, e.target.value)}
                              disabled={updatingStatus === record.id}
                              className={`appearance-none text-xs font-semibold rounded-full border pl-3 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusSelectClass(record.status)}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
                          </div>
                        ) : (
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
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
    </div>
  );
}
