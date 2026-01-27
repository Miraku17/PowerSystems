"use client";

import { useState, useEffect } from "react";
import {
  UsersIcon,
  BuildingOfficeIcon,
  CogIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  BoltIcon,
  DocumentPlusIcon,
} from "@heroicons/react/24/outline";
import { StatCardSkeleton } from "@/components/Skeletons";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import apiClient from "@/lib/axios";
import toast from "react-hot-toast";
import Link from "next/link";

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalCompanies: number;
  totalForms: number;
}

interface OverviewData {
  counts: {
    customers: number;
    engines: number;
    companies: number;
    forms: number;
  };
  monthlyData: any[];
}

interface ApiResponse {
  success: boolean;
  data: OverviewData;
}

// Custom Tooltip Component for Charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg ring-1 ring-black/5">
        <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 font-medium">{entry.name}:</span>
            <span className="font-bold text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function OverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalProducts: 0,
    totalCompanies: 0,
    totalForms: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch overview data from backend
      const response = await apiClient.get<ApiResponse>("/overview");
      const overviewData = response.data.data;

      setStats({
        totalCustomers: overviewData.counts.customers || 0,
        totalProducts: overviewData.counts.engines || 0,
        totalCompanies: overviewData.counts.companies || 0,
        totalForms: overviewData.counts.forms || 0,
      });

      setMonthlyData(overviewData.monthlyData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: UsersIcon,
      trend: "+12%",
      link: "/dashboard/customers",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      trendColor: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Active Engines",
      value: stats.totalProducts,
      icon: CogIcon,
      trend: "+5%",
      link: "/dashboard/products",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      trendColor: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Partner Companies",
      value: stats.totalCompanies,
      icon: BuildingOfficeIcon,
      trend: "+2%",
      link: "/dashboard/companies",
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      trendColor: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto p-2 sm:p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl leading-relaxed">
            Monitor key metrics, track performance, and manage your operations efficiently from one central hub.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 border border-emerald-100 rounded-full">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-semibold text-emerald-700">
              System Operational
            </span>
          </div>
          <button
            onClick={loadDashboardData}
            className="p-2 text-slate-400 hover:text-[#2B4C7E] hover:bg-slate-50 rounded-lg transition-all duration-200 border border-transparent hover:border-slate-200"
            title="Refresh Data"
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          statCards.map((stat, index) => (
            <Link
              href={stat.link}
              key={index}
              className="group relative bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.12)] border border-slate-100 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div
                  className={`p-3.5 rounded-xl ${stat.iconBg} ${stat.iconColor} ring-1 ring-inset ring-black/5`}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full ${stat.trendColor}`}>
                  <ArrowTrendingUpIcon className="h-3 w-3" />
                  <span>{stat.trend}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  {stat.title}
                </p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {stat.value}
                </h3>
              </div>
              
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
          ))
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Activity Chart (Takes up 2/3) */}
        <div
          className="lg:col-span-2 bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 p-6 sm:p-8 animate-slideUp"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Activity Trends
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Visualizing form creation versus new customer acquisition over time.
              </p>
            </div>
            {/* <select className="text-sm border-slate-200 rounded-lg text-slate-600 focus:ring-[#2B4C7E] focus:border-[#2B4C7E] bg-slate-50 py-2 pl-3 pr-8 shadow-sm">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select> */}
          </div>

          <div className="h-[350px] w-full">
            {isLoading ? (
              <div className="h-full w-full bg-slate-50 rounded-xl animate-pulse flex items-center justify-center text-slate-400">
                <span className="flex items-center gap-2 text-sm font-medium">
                   <ArrowPathIcon className="h-4 w-4 animate-spin" />
                   Loading Chart Data...
                </span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorForms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2B4C7E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2B4C7E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorCustomers"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#4A6FA5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4A6FA5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey="forms"
                    stroke="#2B4C7E"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorForms)"
                    name="Forms Created"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#2B4C7E' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="customers"
                    stroke="#4A6FA5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCustomers)"
                    name="New Customers"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#4A6FA5' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column - Quick Stats & Distribution */}
        <div className="space-y-8">
          {/* Quick Actions Card */}
          <div
            className="group relative overflow-hidden bg-[#2B4C7E] rounded-2xl p-6 sm:p-8 shadow-xl text-white animate-slideUp ring-1 ring-white/10"
            style={{ animationDelay: "300ms" }}
          >
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
             <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-[#4A6FA5]/50 rounded-full blur-2xl" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center tracking-tight">
                    <BoltIcon className="h-5 w-5 mr-2 text-yellow-300" />
                    Quick Actions
                </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                <Link
                    href="/dashboard/customers"
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 hover:border-white/20 transition-all duration-300 group/item"
                >
                    <div className="p-2 bg-blue-500/20 rounded-lg mb-3 group-hover/item:scale-110 transition-transform duration-300">
                        <UsersIcon className="h-6 w-6 text-blue-100" />
                    </div>
                    <span className="text-xs font-semibold text-blue-50">New Customer</span>
                </Link>
                <Link
                    href="/dashboard/fill-up-form"
                    className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 hover:border-white/20 transition-all duration-300 group/item"
                >
                    <div className="p-2 bg-purple-500/20 rounded-lg mb-3 group-hover/item:scale-110 transition-transform duration-300">
                        <DocumentPlusIcon className="h-6 w-6 text-purple-100" />
                    </div>
                    <span className="text-xs font-semibold text-purple-50">Fill Form</span>
                </Link>
                </div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div
            className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 p-6 animate-slideUp flex flex-col h-[320px]"
            style={{ animationDelay: "400ms" }}
          >
            <div className="mb-4">
                 <h3 className="font-bold text-slate-900">Entity Distribution</h3>
                 <p className="text-xs text-slate-500">Breakdown of system records</p>
            </div>
            
            <div className="flex-1 w-full min-h-0">
              {isLoading ? (
                <div className="h-full w-full bg-slate-50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Customers",
                        count: stats.totalCustomers,
                        fill: "#2B4C7E", // Primary Blue
                      },
                      {
                        name: "Engines",
                        count: stats.totalProducts,
                        fill: "#4A6FA5", // Lighter Blue
                      },
                      {
                        name: "Companies",
                        count: stats.totalCompanies,
                        fill: "#64748b", // Slate
                      },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barSize={45}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
                      dy={10}
                    />
                     <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-800 text-white text-xs font-medium rounded-lg py-1.5 px-3 shadow-xl">
                              {`${payload[0].value} ${payload[0].payload.name}`}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                        dataKey="count" 
                        radius={[6, 6, 0, 0]} 
                        animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
