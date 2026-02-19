"use client";

import { useState, useCallback } from "react";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";

interface UseSignatoryApprovalOptions {
  table: string;
  recordId: string;
  onChanged?: (field: "noted_by" | "approved_by", checked: boolean) => void;
}

interface PendingToggle {
  field: "noted_by" | "approved_by";
  checked: boolean;
}

export function useSignatoryApproval({ table, recordId, onChanged }: UseSignatoryApprovalOptions) {
  const [notedByChecked, setNotedByChecked] = useState(false);
  const [approvedByChecked, setApprovedByChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);

  const initCheckedState = useCallback((notedBy: boolean, approvedBy: boolean) => {
    setNotedByChecked(notedBy);
    setApprovedByChecked(approvedBy);
  }, []);

  const requestToggle = useCallback((field: "noted_by" | "approved_by", checked: boolean) => {
    setPendingToggle({ field, checked });
    setShowConfirm(true);
  }, []);

  const cancelToggle = useCallback(() => {
    setPendingToggle(null);
    setShowConfirm(false);
  }, []);

  const confirmToggle = useCallback(async () => {
    if (!pendingToggle) return;

    const { field, checked } = pendingToggle;
    setShowConfirm(false);
    setIsLoading(true);

    try {
      await apiClient.patch("/forms/signatory-approval", {
        table,
        recordId,
        field,
        checked,
      });
      if (field === "noted_by") setNotedByChecked(checked);
      else setApprovedByChecked(checked);
      onChanged?.(field, checked);
      toast.success(`${field === "noted_by" ? "Noted" : "Approved"} status updated`);
    } catch (error: any) {
      const message = error?.response?.data?.error || "Failed to update approval";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setPendingToggle(null);
    }
  }, [pendingToggle, table, recordId, onChanged]);

  const confirmTitle = pendingToggle
    ? pendingToggle.checked
      ? `Confirm ${pendingToggle.field === "noted_by" ? "Noted" : "Approved"}`
      : `Remove ${pendingToggle.field === "noted_by" ? "Noted" : "Approved"}`
    : "";

  const confirmMessage = pendingToggle
    ? pendingToggle.checked
      ? `Are you sure you want to mark this as ${pendingToggle.field === "noted_by" ? "noted" : "approved"}?`
      : `Are you sure you want to remove the ${pendingToggle.field === "noted_by" ? "noted" : "approved"} status?`
    : "";

  return {
    notedByChecked,
    approvedByChecked,
    isLoading,
    showConfirm,
    confirmTitle,
    confirmMessage,
    initCheckedState,
    requestToggle,
    cancelToggle,
    confirmToggle,
  };
}
