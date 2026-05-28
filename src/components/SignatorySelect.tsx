"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FormUser } from "@/hooks/useSharedQueries";
import { useCurrentUser } from "@/stores/authStore";

interface SignatorySelectProps {
  label: string;
  name: string;
  value: string;
  signatureValue?: string;
  onChange: (name: string, value: string) => void;
  onSignatureChange: (signature: string) => void;
  users: FormUser[];
  subtitle?: string;
  showAllUsers?: boolean;
  hideSignature?: boolean;
  allowTyping?: boolean;
  disabled?: boolean;
  lockedToCurrentUser?: boolean;
  filterPositions?: string[];
  /**
   * Show only users whose position has this permission key (e.g.
   * "jo_signatory.approved_by"). Composes with filterPositions when both are set.
   * Pass undefined to skip this filter (e.g. for Super Admin override).
   * Requires the `users` payload to include each user's `permissions` array.
   */
  filterByPermission?: string;
  /**
   * If the logged-in user's position name matches one of these (case-insensitive),
   * the field auto-populates with their name + signature and locks the dropdown.
   * Other users keep the normal dropdown UX.
   */
  autoFillForPositions?: string[];
  /**
   * When true, the field locks if it already holds a name that isn't the
   * current user's. Super Admin is exempt and can always edit. Use this in
   * EDIT dialogs so UserA cannot remove/replace UserB's saved signature.
   */
  lockIfDifferentUser?: boolean;
}

export default function SignatorySelect({
  label,
  name,
  value,
  signatureValue,
  onChange,
  onSignatureChange,
  users,
  subtitle,
  showAllUsers = false,
  hideSignature = false,
  allowTyping = false,
  disabled = false,
  lockedToCurrentUser = false,
  filterPositions,
  filterByPermission,
  autoFillForPositions,
  lockIfDifferentUser = false,
}: SignatorySelectProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUser = useCurrentUser();

  // If current user's position is in autoFillForPositions, treat the field as
  // locked-to-current-user (auto-fill effect below handles the actual values).
  // Super Admin is intentionally exempt from the position-based path: the role
  // exists precisely to override signatory restrictions, so SA keeps the normal
  // dropdown to pick any user.
  const currentUserRecord = currentUser ? users.find((u) => u.id === currentUser.id) : null;
  const isCurrentUserSuperAdmin =
    currentUserRecord?.position?.name?.toLowerCase() === "super admin";
  const isPositionAutoFillEligible =
    !isCurrentUserSuperAdmin &&
    !!autoFillForPositions &&
    autoFillForPositions.length > 0 &&
    !!currentUserRecord?.position?.name &&
    autoFillForPositions.some(
      (p) => p.toLowerCase() === currentUserRecord!.position!.name.toLowerCase(),
    );
  // When the dropdown is restricted to the current user (no `showAllUsers`),
  // there is literally nothing else to pick — auto-fill with the logged-in
  // user's name + signature instead of leaving the field empty until they
  // click their own (only) option. Makes "Service Technician" and similar
  // fields work for every position, not just an allow-list.
  // Super Admin is exempt: they see all users so the field is never "current user only".
  const isCurrentUserOnlyField = !showAllUsers && !isCurrentUserSuperAdmin && !!currentUserRecord;
  const isAutoFillEligible = isPositionAutoFillEligible || isCurrentUserOnlyField;

  // Lock the field when it already holds another user's signature. Super Admin
  // bypasses this so they can correct/replace any signature. A missing
  // currentUserRecord (e.g. session not loaded) is treated as "different user"
  // so we fail closed rather than expose an edit window.
  const isDifferentUserLocked =
    lockIfDifferentUser &&
    !!value &&
    !isCurrentUserSuperAdmin &&
    (!currentUserRecord || value !== currentUserRecord.fullName);

  const isLocked =
    (lockedToCurrentUser || isAutoFillEligible || isDifferentUserLocked) && !disabled;

  // Auto-populate when eligible and the field is still empty. Skip when the
  // field is disabled — writing a value into a permission-gated field would
  // trip the server-side permission check on submit even though the user
  // never interacted with it.
  useEffect(() => {
    if (disabled) return;
    if (!isAutoFillEligible || !currentUserRecord) return;
    if (value === currentUserRecord.fullName) return;
    onChange(name, currentUserRecord.fullName);
    onSignatureChange(currentUserRecord.signature_url || "");
    // We intentionally exclude onChange/onSignatureChange from deps to avoid
    // re-firing when callers create new closures every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoFillEligible, currentUserRecord?.id, value, name, disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedUser = value ? users.find((u) => u.fullName === value) : null;
  const isCurrentUserSelected = !!currentUser && !!selectedUser && selectedUser.id === currentUser.id;

  const baseUsers = showAllUsers || isCurrentUserSuperAdmin
    ? users
    : currentUser
    ? users.filter((u) => u.id === currentUser.id)
    : [];
  let filteredBase = baseUsers;
  if (filterPositions && filterPositions.length > 0) {
    filteredBase = filteredBase.filter(
      (u) =>
        !!u.position?.name &&
        filterPositions.some(
          (p) => p.toLowerCase() === u.position!.name.toLowerCase(),
        ),
    );
  }
  if (filterByPermission && !isCurrentUserSuperAdmin) {
    filteredBase = filteredBase.filter((u) =>
      Array.isArray(u.permissions) && u.permissions.includes(filterByPermission),
    );
  }
  const allDropdownUsers = filteredBase
    .slice()
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const dropdownUsers = allowTyping && searchTerm
    ? allDropdownUsers.filter((u) =>
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allDropdownUsers;

  const handleSelectOption = (user: FormUser) => {
    onChange(name, user.fullName);
    onSignatureChange(user.signature_url || "");
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange(name, "");
    onSignatureChange("");
    setSearchTerm("");
  };

  const displaySignature = signatureValue || selectedUser?.signature_url || "";
  // Append signature_updated_at as a cache-buster so a replaced signature (or a
  // URL the browser previously cached as 404 during upload propagation) is
  // refetched instead of served from the stale image cache. Only applied when
  // we know the row's updated_at — i.e. the URL came from the live user record,
  // not a value saved on a historical form record.
  const sigVersion =
    !signatureValue && selectedUser?.signature_url && selectedUser?.signature_updated_at
      ? selectedUser.signature_updated_at
      : null;
  const versionedSignature =
    sigVersion && displaySignature
      ? `${displaySignature}${displaySignature.includes("?") ? "&" : "?"}v=${encodeURIComponent(sigVersion)}`
      : displaySignature;
  const hasNoSignature = showAllUsers
    ? !!selectedUser && !displaySignature
    : isCurrentUserSelected && !displaySignature;

  return (
    <div className="flex flex-col space-y-3">
      {/* Dropdown */}
      <div className="flex flex-col w-full" ref={dropdownRef}>
        <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
        <div className="relative">
          <input
            type="text"
            name={name}
            value={allowTyping ? (showDropdown ? searchTerm : value) : value}
            readOnly={!allowTyping || disabled || isLocked}
            disabled={disabled}
            onClick={() => {
              if (!disabled && !isLocked && !allowTyping) setShowDropdown(!showDropdown);
            }}
            onFocus={() => {
              if (!disabled && !isLocked && allowTyping) {
                setSearchTerm(value);
                setShowDropdown(true);
              }
            }}
            onChange={(e) => {
              if (!disabled && !isLocked && allowTyping) {
                setSearchTerm(e.target.value);
                onChange(name, e.target.value);
                setShowDropdown(true);
              }
            }}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-colors pr-16 ${disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : isLocked ? "bg-gray-50 cursor-default" : `bg-white ${allowTyping ? "" : "cursor-pointer"}`}`}
            placeholder={allowTyping ? "Type or select a name" : "Select a name"}
            autoComplete="off"
          />
          {value && !disabled && !isLocked && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-10 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          {!disabled && !isLocked && (
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon
              className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            />
          </button>
          )}
          {!disabled && !isLocked && showDropdown && dropdownUsers.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {dropdownUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectOption(user)}
                  className={`w-full px-4 py-2 text-left transition-colors ${
                    user.fullName === value
                      ? "text-white font-medium"
                      : "text-gray-900 hover:text-white"
                  }`}
                  style={{
                    backgroundColor: user.fullName === value ? "#2B4C7E" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (user.fullName !== value) {
                      e.currentTarget.style.backgroundColor = "#2B4C7E";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (user.fullName !== value) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {user.fullName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signature preview — visible to everyone */}
      {!hideSignature && value && displaySignature && (
        <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 flex justify-center">
          <img
            src={versionedSignature}
            alt={`${value}'s signature`}
            className="max-h-24 object-contain"
          />
        </div>
      )}
      {!hideSignature && hasNoSignature && (
        <div className="border border-yellow-300 rounded-lg p-2 bg-yellow-50 text-yellow-700 text-xs text-center">
          No saved Signature
        </div>
      )}
      {!hideSignature && subtitle && value && displaySignature && (
        <p className="text-xs text-gray-500 italic text-center">{subtitle}</p>
      )}
    </div>
  );
}
