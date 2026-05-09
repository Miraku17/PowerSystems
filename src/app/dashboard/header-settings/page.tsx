"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheckIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import {
  REPORT_HEADER_DEFAULTS,
  type ReportHeaderContent,
} from "@/hooks/useReportHeader";

type FormState = ReportHeaderContent;

const FIELD_LABELS: Record<keyof FormState, string> = {
  company_name: "Company Name",
  address: "Address",
  tel: "Telephone",
  fax: "Fax",
  email: "Email",
  branches: "Branches",
};

const MULTILINE_FIELDS: Array<keyof FormState> = ["address", "branches"];

export default function HeaderSettingsPage() {
  const [position, setPosition] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState<FormState | null>(null);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user position
  useEffect(() => {
    apiClient
      .get("/auth/position")
      .then((res) => setPosition(res.data?.positionName ?? null))
      .catch(() => setPosition(null));
  }, []);

  // Fetch current header content (only when authorized)
  useEffect(() => {
    if (position !== "Super Admin") return;
    let cancelled = false;
    setLoadingContent(true);
    apiClient
      .get("/report-header")
      .then((r) => {
        if (cancelled) return;
        const data = r.data?.data as FormState | undefined;
        if (data) {
          setForm({
            company_name: data.company_name ?? "",
            address: data.address ?? "",
            tel: data.tel ?? "",
            fax: data.fax ?? "",
            email: data.email ?? "",
            branches: data.branches ?? "",
          });
          setInitial({
            company_name: data.company_name ?? "",
            address: data.address ?? "",
            tel: data.tel ?? "",
            fax: data.fax ?? "",
            email: data.email ?? "",
            branches: data.branches ?? "",
          });
        }
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load report header";
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [position]);

  const isDirty = useMemo(() => {
    if (!form || !initial) return false;
    return (Object.keys(form) as Array<keyof FormState>).some(
      (k) => form[k] !== initial[k]
    );
  }, [form, initial]);

  const hasEmpty = useMemo(() => {
    if (!form) return true;
    return (Object.keys(form) as Array<keyof FormState>).some(
      (k) => form[k].trim().length === 0
    );
  }, [form]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleResetToDefaults = () => {
    setForm({ ...REPORT_HEADER_DEFAULTS });
  };

  const handleSave = async () => {
    if (!form) return;
    if (hasEmpty) {
      toast.error("All fields are required");
      return;
    }
    if (!isDirty) {
      toast("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const r = await apiClient.patch("/report-header", form);
      const data = r.data?.data as FormState | undefined;
      if (data) {
        setInitial({ ...data });
        setForm({ ...data });
      }
      queryClient.invalidateQueries({ queryKey: ["reportHeaderContent"] });
      toast.success("Report header saved");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save report header";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (position === undefined) {
    return <div className="p-6 text-sm text-gray-600">Loading…</div>;
  }
  if (position !== "Super Admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500 mt-2">
          Only Super Admin can edit the report header.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
          <ShieldCheckIcon className="h-7 w-7 text-[#2B4C7E]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A2F4F] tracking-tight">
            Report Header Settings
          </h1>
          <p className="text-sm text-[#607D8B] mt-0.5">
            Edit the company name, address, contact info, and branch list shown
            at the top of every printable report.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {loadingContent || !form ? (
          <div className="text-sm text-gray-600">Loading current content…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(Object.keys(FIELD_LABELS) as Array<keyof FormState>).map(
                (field) => {
                  const isMulti = MULTILINE_FIELDS.includes(field);
                  const isEmpty = form[field].trim().length === 0;
                  const wrapperClass = isMulti ? "md:col-span-2" : "";
                  return (
                    <div key={field} className={wrapperClass}>
                      <label
                        htmlFor={`hdr-${field}`}
                        className="block text-sm font-semibold text-[#1A2F4F] mb-1.5"
                      >
                        {FIELD_LABELS[field]}
                      </label>
                      {isMulti ? (
                        <textarea
                          id={`hdr-${field}`}
                          value={form[field]}
                          onChange={(e) =>
                            handleChange(field, e.target.value)
                          }
                          rows={field === "address" ? 2 : 3}
                          className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2B4C7E]/40 focus:border-[#2B4C7E] resize-y ${
                            isEmpty
                              ? "border-red-300 bg-red-50/30"
                              : "border-gray-300 bg-white"
                          }`}
                        />
                      ) : (
                        <input
                          id={`hdr-${field}`}
                          type="text"
                          value={form[field]}
                          onChange={(e) =>
                            handleChange(field, e.target.value)
                          }
                          className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2B4C7E]/40 focus:border-[#2B4C7E] ${
                            isEmpty
                              ? "border-red-300 bg-red-50/30"
                              : "border-gray-300 bg-white"
                          }`}
                        />
                      )}
                      {isEmpty ? (
                        <p className="text-xs text-red-600 mt-1">
                          {FIELD_LABELS[field]} cannot be empty
                        </p>
                      ) : null}
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-[#607D8B]">
                Note: the form-specific title (e.g. "Job Order Request",
                "Service Report") is set per form and is not editable here.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#1A2F4F] bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Reset to defaults
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || hasEmpty || !isDirty}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#2B4C7E] hover:bg-[#1A2F4F] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
