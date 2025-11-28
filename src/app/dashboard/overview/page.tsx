"use client";

import { useState, useEffect } from "react";
import {
  UsersIcon,
  BuildingOfficeIcon,
  CogIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  ArrowPathIcon,
  BoltIcon
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

interface DatabaseCounts {
  forms: number;
  customer: number;
  engine: number;
  companies: number;
}

interface ApiResponse {
  status: string;
  data: DatabaseCounts;
}

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalCompanies: number;
  totalForms: number;
}

// Custom Tooltip Component for Charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl">
        <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
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

      // Fetch counts from backend
      const response = await apiClient.get<ApiResponse>("/database/counts");
      const counts = response.data.data;

      setStats({
        totalCustomers: counts.customer || 0,
        totalProducts: counts.engine || 0,
        totalCompanies: counts.companies || 0,
        totalForms: counts.forms || 0,
      });

      // Generate mock monthly data for the last 6 months with a more realistic curve
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      const monthlyStats = months.map((month, index) => ({
        month,
        forms: 10 + Math.floor(Math.random() * 15) + (index * 2), // Upward trend
        customers: 5 + Math.floor(Math.random() * 8) + (index * 1.5),
      }));
      setMonthlyData(monthlyStats);
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
      color: "blue",
      trend: "+12%",
      link: "/dashboard/customers",
      bgGradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Active Engines",
      value: stats.totalProducts,
      icon: CogIcon,
      color: "green",
      trend: "+5%",
      link: "/dashboard/products",
      bgGradient: "from-emerald-500 to-teal-600"
    },
    {
      title: "Partner Companies",
      value: stats.totalCompanies,
      icon: BuildingOfficeIcon,
      color: "purple",
      trend: "+2%",
      link: "/dashboard/companies",
      bgGradient: "from-violet-500 to-purple-600"
    },
    {
      title: "Form Templates",
      value: stats.totalForms,
      icon: DocumentTextIcon,
      color: "orange",
      trend: "+8%",
      link: "/dashboard/forms",
      bgGradient: "from-orange-500 to-amber-600"
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <span className="text-sm font-medium text-gray-600">System Operational</span>
          <span className="text-gray-300">|</span>
          <button 
            onClick={loadDashboardData}
            className="text-gray-400 hover:text-[#2B4C7E] transition-colors"
            title="Refresh Data"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          statCards.map((stat, index) => (
            <Link 
              href={stat.link} 
              key={index}
              className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.bgGradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-500`} />
              
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bgGradient} text-white shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="flex items-center space-x-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  <ArrowTrendingUpIcon className="h-3 w-3" />
                  <span>{stat.trend}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</h3>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Activity Chart (Takes up 2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Activity Trends</h2>
              <p className="text-sm text-gray-500">Forms created vs New customers over time</p>
            </div>
            <select className="text-sm border-gray-200 rounded-lg text-gray-600 focus:ring-[#2B4C7E] focus:border-[#2B4C7E]">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>

          <div className="h-[350px] w-full">
            {isLoading ? (
              <div className="h-full w-full bg-gray-50 rounded-xl animate-pulse flex items-center justify-center text-gray-300">Loading Chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorForms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2B4C7E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2B4C7E" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="forms" 
                    stroke="#2B4C7E" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorForms)" 
                    name="Forms"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="customers" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCustomers)" 
                    name="Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column - Quick Stats & Distribution */}
        <div className="space-y-8">
          
          {/* Quick Actions Card */}
          <div className="bg-[#2B4C7E] rounded-2xl p-6 shadow-lg text-white animate-slideUp" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center">
                <BoltIcon className="h-5 w-5 mr-2 text-yellow-300" />
                Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/customers" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center transition-all backdrop-blur-sm">
                <UsersIcon className="h-6 w-6 mx-auto mb-2 text-blue-200" />
                <span className="text-xs font-medium block">New Customer</span>
              </Link>
              <Link href="/dashboard/forms" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center transition-all backdrop-blur-sm">
                <DocumentTextIcon className="h-6 w-6 mx-auto mb-2 text-purple-200" />
                <span className="text-xs font-medium block">Create Form</span>
              </Link>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-[300px] animate-slideUp" style={{ animationDelay: '400ms' }}>
            <h3 className="font-bold text-gray-900 mb-4">Distribution</h3>
            <div className="h-[220px] w-full">
               {isLoading ? (
                 <div className="h-full w-full bg-gray-50 rounded-xl animate-pulse" />
               ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Cust", count: stats.totalCustomers, fill: "#3B82F6" },
                      { name: "Eng", count: stats.totalProducts, fill: "#10B981" },
                      { name: "Comp", count: stats.totalCompanies, fill: "#8B5CF6" },
                      { name: "Forms", count: stats.totalForms, fill: "#F59E0B" },
                    ]}
                    barSize={40}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg">
                              {`${payload[0].value} items`}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
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
