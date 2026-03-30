"use client";

import { useState, useEffect } from "react";
import { LeaveType, LEAVE_TYPE_LABELS, CREDIT_LEAVE_TYPES } from "@/types";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";

type PerCategoryCredits = Record<string, { total_credits: number; used_credits: number }>;

export default function LeaveRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const [credits, setCredits] = useState<PerCategoryCredits | null>(null);
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

  // Get remaining credits for the selected leave type
  const getRemaining = (type: LeaveType) => {
    if (!credits) return 0;
    if (CREDIT_LEAVE_TYPES.includes(type)) {
      const c = credits[type];
      return c ? c.total_credits - c.used_credits : 0;
    }
    // LWOP doesn't consume credits
    return Infinity;
  };

  const remaining = getRemaining(leaveType);
  const requiresCredits = CREDIT_LEAVE_TYPES.includes(leaveType);
  const hasEnoughCredits = !requiresCredits || remaining >= totalDays;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalDays <= 0) {
      toast.error("Please select valid dates");
      return;
    }

    if (!hasEnoughCredits) {
      toast.error(`Insufficient ${leaveType} credits. You have ${remaining} day(s) remaining.`);
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
        <span className="text-sm font-medium text-blue-800 block mb-2">Leave Credits</span>
        {creditsLoading ? (
          <span className="text-sm text-blue-600">Loading...</span>
        ) : (
          <div className="space-y-1.5 text-sm">
            {CREDIT_LEAVE_TYPES.map((type) => {
              const c = credits?.[type];
              const total = c?.total_credits || 0;
              const rem = c ? c.total_credits - c.used_credits : 0;
              return (
                <div key={type} className="flex items-center justify-between bg-white rounded-md px-3 py-1.5 border border-blue-100">
                  <span className="text-gray-700 text-xs">{LEAVE_TYPE_LABELS[type as LeaveType]}</span>
                  <span className={`text-xs font-semibold ${rem > 0 ? "text-blue-900" : "text-gray-400"}`}>
                    {rem} / {total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
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

        {/* Show remaining for selected type */}
        {requiresCredits && !creditsLoading && (
          <div className="p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
            Available {LEAVE_TYPE_LABELS[leaveType]} credits: <strong className="text-gray-900">{remaining}</strong> day(s)
          </div>
        )}

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
          disabled={isSubmitting || totalDays <= 0 || !hasEnoughCredits}
          className="w-full px-4 py-2.5 bg-[#083459] text-white rounded-lg hover:bg-[#0a4470] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Leave Request"}
        </button>
      </form>
    </div>
  );
}
