"use client";

import { useState } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

// Mock Data for Audit Logs
interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: "Create" | "Update" | "Delete" | "Login" | "Logout";
  entity: string;
  details: string;
  status: "Success" | "Failed";
}

const MOCK_LOGS: AuditLog[] = [
  {
    id: "1",
    timestamp: "2023-10-27 14:30:00",
    user: "John Doe",
    role: "Admin",
    action: "Create",
    entity: "Company",
    details: "Created new company 'Acme Corp'",
    status: "Success",
  },
  {
    id: "2",
    timestamp: "2023-10-27 14:15:00",
    user: "Jane Smith",
    role: "User",
    action: "Login",
    entity: "Auth",
    details: "User logged in successfully",
    status: "Success",
  },
  {
    id: "3",
    timestamp: "2023-10-27 13:45:00",
    user: "John Doe",
    role: "Admin",
    action: "Update",
    entity: "Engine",
    details: "Updated engine specifications for SN-12345",
    status: "Success",
  },
  {
    id: "4",
    timestamp: "2023-10-27 11:20:00",
    user: "Mike Johnson",
    role: "User",
    action: "Delete",
    entity: "Form Record",
    details: "Deleted form record #4421",
    status: "Success",
  },
  {
    id: "5",
    timestamp: "2023-10-27 09:10:00",
    user: "Jane Smith",
    role: "User",
    action: "Login",
    entity: "Auth",
    details: "Failed login attempt (Invalid password)",
    status: "Failed",
  },
  {
    id: "6",
    timestamp: "2023-10-26 16:55:00",
    user: "Admin User",
    role: "Super Admin",
    action: "Update",
    entity: "User",
    details: "Changed role for user 'mike.j' to 'Admin'",
    status: "Success",
  },
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>(MOCK_LOGS);

  // Filter logs based on search
  const filteredLogs = logs.filter(
    (log) =>
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track system activities and user actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search logs..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
             {/* Placeholder for more filters */}
             <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <FunnelIcon className="h-5 w-5" />
                <span>Filter</span>
            </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Timestamp
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                 <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Action
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell"
                >
                  Entity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell"
                >
                  Details
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                            {log.user.charAt(0)}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.user}
                        </div>
                      </div>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                      {log.entity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate hidden lg:table-cell">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.status === "Success"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No logs found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
           <span className="text-sm text-gray-700">
             Showing <span className="font-medium">{filteredLogs.length}</span> results
           </span>
           <div className="flex gap-2">
             <button disabled className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
               Previous
             </button>
             <button disabled className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
               Next
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
