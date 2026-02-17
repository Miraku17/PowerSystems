"use client";

import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export interface ApprovedJobOrder {
  id: string;
  shop_field_jo_number: string;
  full_customer_name: string;
  address: string;
}

interface JobOrderAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (jo: ApprovedJobOrder) => void;
  jobOrders: ApprovedJobOrder[];
  required?: boolean;
}

const JobOrderAutocomplete = ({
  label,
  value,
  onChange,
  onSelect,
  jobOrders,
  required = false,
}: JobOrderAutocompleteProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJO, setSelectedJO] = useState<ApprovedJobOrder | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync selectedJO with value prop (e.g. when editing existing record)
  useEffect(() => {
    if (value && !selectedJO) {
      const match = jobOrders.find(
        (jo) => jo.shop_field_jo_number === value
      );
      if (match) {
        setSelectedJO(match);
      }
    }
  }, [value, jobOrders, selectedJO]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredJOs = jobOrders.filter((jo) => {
    const search = searchTerm.toLowerCase();
    return (
      (jo.shop_field_jo_number || "").toLowerCase().includes(search) ||
      (jo.full_customer_name || "").toLowerCase().includes(search)
    );
  });

  const handleSelect = (jo: ApprovedJobOrder) => {
    setSelectedJO(jo);
    setSearchTerm("");
    setShowDropdown(false);
    onSelect(jo);
  };

  const handleClear = () => {
    setSelectedJO(null);
    setSearchTerm("");
    onChange("");
  };

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {selectedJO ? (
          <div className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md p-2.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="font-semibold">{selectedJO.shop_field_jo_number}</span>
              <span className="text-gray-500 ml-2 text-xs">{selectedJO.full_customer_name}</span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors duration-200 ease-in-out shadow-sm"
              placeholder="Search by JO number or customer name"
              autoComplete="off"
            />
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredJOs.length > 0 ? (
                  filteredJOs.map((jo) => (
                    <div
                      key={jo.id}
                      onClick={() => handleSelect(jo)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
                    >
                      <div className="font-semibold">{jo.shop_field_jo_number}</div>
                      <div className="text-xs text-gray-500">
                        {jo.full_customer_name}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No pending job orders found
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobOrderAutocomplete;
