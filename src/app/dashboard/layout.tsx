"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  HomeIcon,
  UsersIcon,
  UserPlusIcon,
  BuildingOfficeIcon,
  CogIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Company } from "@/types";
import apiClient from "@/lib/axios";
import Chatbot from "@/components/Chatbot";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import OfflineProvider from "@/components/OfflineProvider";
import { CloudArrowUpIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect this route - redirect to login if not authenticated
  useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [companiesExpanded, setCompaniesExpanded] = useState(false);
  const [formsExpanded, setFormsExpanded] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyTab, setActiveCompanyTab] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<string | null>(null);
  const [activeProductTab, setActiveProductTab] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("user");
  const [userPosition, setUserPosition] = useState<string>("");
  const [userLoading, setUserLoading] = useState(true);

  // Auth store actions
  const setAuthUser = useAuthStore((state) => state.setUser);
  const clearAuthUser = useAuthStore((state) => state.clearUser);
  const queryClient = useQueryClient();

  // Permissions
  const { canAccess } = usePermissions();

  // Load companies and forms on mount
  useEffect(() => {
    loadCompanies();
    loadUserData();
  }, []);

  const loadUserData = () => {
    setUserLoading(true);
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      console.log("User from localStorage:", user);

      // Sync to auth store
      setAuthUser(user);

      if (user && user.firstName && user.firstName) {
        setUserName(`${user.firstName} ${user.lastName}`);
      } else if (user && user.username) {
        setUserName(user.username);
      } else if (user && user.email) {
        setUserName(user.email);
      }

      if (user && user.role) {
        setUserRole(user.role);
      }
      if (user && user.position) {
        setUserPosition(user.position);
      }
    }
    setUserLoading(false);
  };

  // Auto-expand companies menu and sync active tab when on companies page
  useEffect(() => {
    if (pathname.includes("/companies")) {
      setCompaniesExpanded(true);
    }
  }, [pathname]);

  // Auto-expand forms menu when on forms page
  useEffect(() => {
    if (pathname.includes("/forms")) {
      setFormsExpanded(true);
    }
  }, [pathname]);

  // Auto-expand products menu when on products page
  useEffect(() => {
    if (pathname.includes("/products")) {
      setProductsExpanded(true);
    }
  }, [pathname]);

  // Update active tabs whenever URL changes
  useEffect(() => {
    const updateActiveTabs = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");

        if (pathname.includes("/companies")) {
          setActiveCompanyTab(tabParam);
          setActiveFormTab(null);
          setActiveProductTab(null);
        } else if (pathname.includes("/forms")) {
          setActiveFormTab(tabParam);
          setActiveCompanyTab(null);
          setActiveProductTab(null);
        } else if (pathname.includes("/products")) {
          setActiveProductTab(tabParam);
          setActiveCompanyTab(null);
          setActiveFormTab(null);
        } else {
          setActiveCompanyTab(null);
          setActiveFormTab(null);
          setActiveProductTab(null);
        }
      }
    };

    // Update on mount and pathname/search changes
    updateActiveTabs();

    // Set up interval to check for URL changes (handles Next.js routing)
    const interval = setInterval(updateActiveTabs, 100);

    return () => clearInterval(interval);
  }, [pathname]);

  const loadCompanies = async () => {
    try {
      const response = await apiClient.get("/companies");
      const companiesData = response.data.data || [];
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      console.error("Error loading companies:", error);
      setCompanies([]);
    }
  };

  const handleLogout = async () => {
    try {
      // Call server-side logout to invalidate session
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Error during logout:", error);
      // Continue with client-side logout even if server call fails
    } finally {
      // Clear local storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      // Clear auth store
      clearAuthUser();
      // Clear TanStack Query cache so stale data doesn't persist across accounts
      queryClient.clear();
      // Clear authToken cookie
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      // Redirect to login page
      router.push("/login");
    }
  };

  const allNavigation = [
    { name: "Overview", icon: HomeIcon, href: "/dashboard/overview" },
    { name: "Customers", icon: UsersIcon, href: "/dashboard/customers" },
    { name: "User Creation", icon: UserPlusIcon, href: "/dashboard/user-creation" },
    {
      name: "Products",
      icon: CogIcon,
      href: "/dashboard/products",
      hasSubmenu: true,
      submenuType: "products",
    },
    {
      name: "Companies",
      icon: BuildingOfficeIcon,
      href: "/dashboard/companies",
      hasSubmenu: true,
      submenuType: "companies",
    },

    {
      name: "Fill Up Form",
      icon: DocumentTextIcon,
      href: "/dashboard/fill-up-form",
    },
    {
      name: "Daily Time Sheet",
      icon: ClockIcon,
      href: "/dashboard/daily-time-sheet",
    },
    {
      name: "Form Records",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/records",
    },
    {
      name: "Pending Offline Forms",
      icon: CloudArrowUpIcon,
      href: "/dashboard/pending-forms",
    },
    {
      name: "JO Requests",
      icon: ShieldCheckIcon,
      href: "/dashboard/pending-jo-requests",
    },
    {
      name: "DTS Requests",
      icon: ClockIcon,
      href: "/dashboard/pending-dts",
    },
    {
      name: "Service Reports",
      icon: ShieldCheckIcon,
      href: "/dashboard/pending-service-reports",
    },
    {
      name: "Audit Logs",
      icon: ClipboardDocumentCheckIcon,
      href: "/dashboard/audit-logs",
    },
  ];

  const navigation = allNavigation.filter((item: any) => {
    // Permission-gated items: only show if user has the required permission
    if (item.permission) {
      return canAccess(item.permission.module);
    }
    // Role-based filtering for regular users
    if (userRole === "user") {
      return (
        item.href === "/dashboard/fill-up-form" ||
        item.href === "/dashboard/daily-time-sheet" ||
        item.href === "/dashboard/records" ||
        item.href === "/dashboard/pending-forms" ||
        item.href === "/dashboard/pending-jo-requests" ||
        item.href === "/dashboard/pending-dts" ||
        item.href === "/dashboard/pending-service-reports"
      );
    }
    return true;
  });

  // Redirect restricted users
  useEffect(() => {
    if (!userLoading && userRole === "user") {
      const isAllowed =
        pathname.startsWith("/dashboard/fill-up-form") ||
        pathname.startsWith("/dashboard/daily-time-sheet") ||
        pathname.startsWith("/dashboard/records") ||
        pathname.startsWith("/dashboard/pending-forms") ||
        pathname.startsWith("/dashboard/pending-jo-requests") ||
        pathname.startsWith("/dashboard/pending-dts") ||
        pathname.startsWith("/dashboard/pending-service-reports");
      if (!isAllowed) {
        router.push("/dashboard/fill-up-form");
      }
    }
  }, [pathname, userRole, userLoading, router]);

  return (
    <OfflineProvider>
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] bg-[#083459] text-slate-300 shadow-xl border-r border-white/5 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-20" : "w-[280px]"}`}
      >
        {/* Logo Section */}
        <div className="flex items-center h-[72px] px-6 border-b border-white/5 relative bg-[#052642]">
          {sidebarCollapsed ? (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 relative">
                <Image
                  src="/images/powersystemslogov2.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 relative flex-shrink-0">
                <Image
                  src="/images/powersystemslogov2.png"
                  alt="Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-base tracking-tight leading-none">
                  Power Systems
                </span>
                <span className="text-[10px] text-blue-200/60 font-medium uppercase tracking-wider mt-1">
                  Admin Panel
                </span>
              </div>
            </div>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-4 text-blue-200/60 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Toggle Button (Desktop) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-[88px] bg-white text-slate-700 p-1.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-slate-200 hover:bg-slate-50 hover:text-[#083459] transition-all z-50 items-center justify-center group"
        >
          <ChevronLeftIcon
            className={`h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 ${
              sidebarCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Section Label (Optional, only show if not collapsed) */}
          {!sidebarCollapsed && (
            <div className="px-3 mb-2 text-xs font-semibold text-blue-200/40 uppercase tracking-wider">
              Main Menu
            </div>
          )}
          
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            if (item.hasSubmenu) {
              const isExpanded =
                item.submenuType === "companies"
                  ? companiesExpanded
                  : item.submenuType === "forms"
                  ? formsExpanded
                  : productsExpanded;
              const setExpanded =
                item.submenuType === "companies"
                  ? setCompaniesExpanded
                  : item.submenuType === "forms"
                  ? setFormsExpanded
                  : setProductsExpanded;

              return (
                <div key={item.href} className="group/menu">
                  <button
                    onClick={() => {
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false);
                        setExpanded(true);
                      } else {
                        setExpanded(!isExpanded);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 relative group ${
                      isActive
                        ? "bg-[#4A6FA5] text-white font-medium shadow-md"
                        : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                    }`}
                    title={sidebarCollapsed ? item.name : ""}
                  >
                    <div
                      className={`flex items-center ${
                        sidebarCollapsed ? "justify-center w-full" : "gap-3"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 flex-shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-blue-100/60 group-hover:text-white"
                        }`}
                      />
                      {!sidebarCollapsed && (
                        <span className="text-sm">{item.name}</span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <ChevronDownIcon
                        className={`h-4 w-4 text-blue-200/40 transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Submenu */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded && !sidebarCollapsed
                        ? "max-h-[800px] opacity-100 mt-1"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="space-y-0.5 py-1">
                      {/* Submenu Items Logic */}
                      {item.submenuType === "companies" && (
                        <>
                          <button
                            onClick={() => {
                              router.push(item.href);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 pl-11 pr-3 py-2 text-sm transition-colors relative before:absolute before:left-[22px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:content-[''] hover:before:bg-blue-300 ${
                              pathname === item.href && !activeCompanyTab
                                ? "text-white font-medium before:bg-blue-300"
                                : "text-blue-100/60 hover:text-white before:bg-blue-200/20"
                            }`}
                          >
                            All Companies
                          </button>
                          {companies.map((company) => (
                            <button
                              key={company.id}
                              onClick={() => {
                                router.push(`${item.href}?tab=${company.id}`);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 pl-11 pr-3 py-2 text-sm transition-colors relative before:absolute before:left-[22px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:content-[''] hover:before:bg-blue-300 truncate ${
                                pathname.includes("/companies") &&
                                activeCompanyTab === String(company.id)
                                  ? "text-white font-medium before:bg-blue-300"
                                  : "text-blue-100/60 hover:text-white before:bg-blue-200/20"
                              }`}
                            >
                                <span className="truncate">{company.name}</span>
                            </button>
                          ))}
                        </>
                      )}

                      {item.submenuType === "products" && (
                        <>
                          <button
                            onClick={() => {
                              router.push(`${item.href}?tab=engines`);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 pl-11 pr-3 py-2 text-sm transition-colors relative before:absolute before:left-[22px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:content-[''] hover:before:bg-blue-300 ${
                              pathname.includes("/products") &&
                              activeProductTab === "engines"
                                ? "text-white font-medium before:bg-blue-300"
                                : "text-blue-100/60 hover:text-white before:bg-blue-200/20"
                            }`}
                          >
                            Engines
                          </button>
                          <button
                            onClick={() => {
                              router.push(`${item.href}?tab=pumps`);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 pl-11 pr-3 py-2 text-sm transition-colors relative before:absolute before:left-[22px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:content-[''] hover:before:bg-blue-300 ${
                              pathname.includes("/products") &&
                              activeProductTab === "pumps"
                                ? "text-white font-medium before:bg-blue-300"
                                : "text-blue-100/60 hover:text-white before:bg-blue-200/20"
                            }`}
                          >
                            Pumps
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? "bg-[#4A6FA5] text-white font-medium shadow-md"
                    : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                } ${sidebarCollapsed ? "justify-center" : "gap-3"}`}
                title={sidebarCollapsed ? item.name : ""}
              >
                <Icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-blue-100/60 group-hover:text-white"
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="text-sm">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/5 bg-[#052642]">
          <div
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#2B4C7E] to-[#4A6FA5] flex items-center justify-center text-white font-bold text-sm shadow-inner ring-2 ring-blue-900/50">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {userName}
                </p>
                <p className="text-[11px] text-blue-200/60 truncate mt-0.5">{userPosition}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-blue-100/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Logout"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="mt-4 w-full p-2 flex justify-center text-blue-100/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Logout"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-[280px]"
        }`}
      >
        {/* Top Mobile Bar */}
        <header className="lg:hidden bg-white shadow-sm sticky top-0 z-30 border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-[#2B4C7E] transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <span className="font-bold text-gray-800">Power Systems</span>
            <div className="w-8 h-8 rounded-full bg-[#2B4C7E] flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 bg-[#F8F9FA] flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
    </OfflineProvider>
  );
}

// Helper Component for Menu Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}
