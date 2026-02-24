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
}: SignatorySelectProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUser = useCurrentUser();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedUser = value ? users.find((u) => u.fullName === value) : null;
  const isCurrentUserSelected = !!currentUser && !!selectedUser && selectedUser.id === currentUser.id;

  const dropdownUsers = showAllUsers
    ? users
    : currentUser
    ? users.filter((u) => u.id === currentUser.id)
    : [];

  const handleSelectOption = (user: FormUser) => {
    onChange(name, user.fullName);
    onSignatureChange(user.signature_url || "");
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChange(name, "");
    onSignatureChange("");
  };

  const displaySignature = signatureValue || selectedUser?.signature_url || "";
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
            value={value}
            readOnly
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors pr-16 cursor-pointer"
            placeholder="Select a name"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-10 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon
              className={`h-5 w-5 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            />
          </button>
          {showDropdown && dropdownUsers.length > 0 && (
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
      {value && displaySignature && (
        <div className="border border-gray-300 rounded-lg p-2 bg-gray-50 flex justify-center">
          <img
            src={displaySignature}
            alt={`${value}'s signature`}
            className="max-h-24 object-contain"
          />
        </div>
      )}
      {hasNoSignature && (
        <div className="border border-yellow-300 rounded-lg p-2 bg-yellow-50 text-yellow-700 text-xs text-center">
          You have no saved signature
        </div>
      )}
      {subtitle && value && displaySignature && (
        <p className="text-xs text-gray-500 italic text-center">{subtitle}</p>
      )}
    </div>
  );
}
