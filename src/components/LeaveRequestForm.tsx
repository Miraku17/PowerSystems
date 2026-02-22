"use client";

import { useState, useEffect } from "react";
import { LeaveType, LeaveCredits, LEAVE_TYPE_LABELS } from "@/types";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";

export default function LeaveRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const [credits, setCredits] = useState<LeaveCredits | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [leaveType, setLeaveType] = useState<LeaveType>("VL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    fetchCredits();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end >= start) {
        // Calculate business days (Mon-Fri)
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) count++;
          current.setDate(current.getDate() + 1);
        }
        setTotalDays(count);
      } else {
        setTotalDays(0);
      }
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

  const fetchCredits = async () => {
    try {
      const res = await apiClient.get("/leave-credits/me");
      if (res.data.success) {
        setCredits(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching leave credits:", error);
    } finally {
      setCreditsLoading(false);
    }
  };

  const remaining = credits ? credits.total_credits - credits.used_credits : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalDays <= 0) {
      toast.error("Please select valid dates");
      return;
    }

    if (totalDays > remaining) {
      toast.error(`Insufficient leave credits. You have ${remaining} day(s) remaining.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/leave-requests", {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason || undefined,
      });

      if (res.data.success) {
        toast.success("Leave request submitted successfully");
        setLeaveType("VL");
        setStartDate("");
        setEndDate("");
        setReason("");
        setTotalDays(0);
        fetchCredits();
        onSuccess?.();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to submit leave request";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">File Leave Request</h2>

      {/* Credit Balance */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">Leave Credits</span>
          {creditsLoading ? (
            <span className="text-sm text-blue-600">Loading...</span>
          ) : (
            <div className="flex gap-4 text-sm">
              <span className="text-blue-700">
                Total: <strong>{credits?.total_credits || 0}</strong>
              </span>
              <span className="text-blue-700">
                Used: <strong>{credits?.used_credits || 0}</strong>
              </span>
              <span className="text-blue-900 font-semibold">
                Remaining: <strong>{remaining}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label} ({key})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Total Days */}
        {totalDays > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">
              Total working days: <strong className="text-gray-900">{totalDays}</strong>
            </span>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for leave..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || totalDays <= 0 || totalDays > remaining}
          className="w-full px-4 py-2.5 bg-[#083459] text-white rounded-lg hover:bg-[#0a4470] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Leave Request"}
        </button>
      </form>
    </div>
  );
}
