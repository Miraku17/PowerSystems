"use client";

import { useState } from "react";
import Engines from "./Engines";

export default function Machines() {
  const [activeSubTab, setActiveSubTab] = useState("engines");

  const machineTabs = [
    { name: "Engines", id: "engines" },
    { name: "Pumps", id: "pumps", disabled: true },
    { name: "Other Machines", id: "other", disabled: true },
  ];

  return (
    <div className="space-y-6">
      {/* Machine Type Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6" aria-label="Machine Types">
            {machineTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveSubTab(tab.id)}
                disabled={tab.disabled}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSubTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : tab.disabled
                    ? "border-transparent text-gray-400 cursor-not-allowed"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.name}
                {tab.disabled && (
                  <span className="ml-2 text-xs text-gray-400">(Coming Soon)</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeSubTab === "engines" && <Engines />}
          {activeSubTab === "pumps" && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Pumps management will be available soon.
              </p>
            </div>
          )}
          {activeSubTab === "other" && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Other machines management will be available soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
