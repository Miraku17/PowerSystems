"use client";

import Customers from "@/components/Customers";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      <Customers />
    </div>
  );
}
