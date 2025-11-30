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
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Company } from "@/types";
import apiClient from "@/lib/axios";
import Chatbot from "@/components/Chatbot";
import { useAuth } from "@/hooks/useAuth";

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
  const [userLoading, setUserLoading] = useState(true);

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
      if (user && user.firstName && user.lastName) {
        setUserName(`${user.firstName} ${user.lastName}`);
      } else if (user && user.username) {
        setUserName(user.username);
      } else if (user && user.email) {
        setUserName(user.email);
      }

      if (user && user.role) {
        setUserRole(user.role);
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
      name: "Form Records",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/records",
    },
  ];

  const navigation =
    userRole === "user"
      ? allNavigation.filter((item) => item.href === "/dashboard/fill-up-form")
      : allNavigation;

  // Redirect restricted users
  useEffect(() => {
    if (!userLoading && userRole === "user") {
      const isAllowed = pathname.startsWith("/dashboard/fill-up-form");
      if (!isAllowed) {
        router.push("/dashboard/fill-up-form");
      }
    }
  }, [pathname, userRole, userLoading, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out bg-gradient-to-b from-[#2B4C7E] to-[#1A2F4F] shadow-2xl lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-20" : "w-72"}`}
      >
        {/* Logo Section */}
        <div className="flex items-center h-20 px-6 border-b border-white/10 relative">
          {sidebarCollapsed ? (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 relative">
                <Image
                  src="/images/powersystemslogov2.png"
                  alt="Logo"
                  fill
                  className="object-contain drop-shadow-md"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 relative flex-shrink-0">
                <Image
                  src="/images/powersystemslogov2.png"
                  alt="Logo"
                  fill
                  className="object-contain drop-shadow-md"
                />
              </div>
              <span className="text-white font-bold text-lg tracking-tight truncate">
                Power Systems
              </span>
            </div>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-4 text-white/70 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Toggle Button (Desktop) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-24 bg-white text-[#2B4C7E] p-1 rounded-full shadow-md border border-gray-100 hover:bg-gray-50 transition-transform hover:scale-110 z-50"
        >
          <ChevronLeftIcon
            className={`h-4 w-4 transition-transform duration-300 ${
              sidebarCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
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
                <div key={item.href} className="group">
                  <button
                    onClick={() => {
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false);
                        setExpanded(true);
                      } else {
                        setExpanded(!isExpanded);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 relative ${
                      isActive
                        ? "bg-white/10 text-white shadow-lg backdrop-blur-sm"
                        : "text-blue-100 hover:bg-white/5 hover:text-white"
                    }`}
                    title={sidebarCollapsed ? item.name : ""}
                  >
                    <div
                      className={`flex items-center ${
                        sidebarCollapsed ? "justify-center w-full" : "space-x-3"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 flex-shrink-0 ${
                          isActive
                            ? "text-blue-300"
                            : "group-hover:text-blue-300 transition-colors"
                        }`}
                      />
                      {!sidebarCollapsed && (
                        <span className="font-medium text-sm">{item.name}</span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <ChevronDownIcon
                        className={`h-4 w-4 text-blue-200 transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                    {sidebarCollapsed && isActive && (
                      <div className="absolute left-0 w-1 h-8 bg-blue-400 rounded-r-full top-1/2 -translate-y-1/2" />
                    )}
                  </button>

                  {/* Submenu */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded && !sidebarCollapsed
                        ? "max-h-[500px] opacity-100 mt-1"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="pl-10 pr-2 space-y-1 border-l border-white/10 ml-6 my-1">
                      {/* Submenu Items Logic */}
                      {item.submenuType === "companies" && (
                        <>
                          <button
                            onClick={() => {
                              router.push(item.href);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                              pathname === item.href && !activeCompanyTab
                                ? "text-white font-medium bg-white/10"
                                : "text-blue-200/80 hover:text-white hover:bg-white/5"
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
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                                pathname.includes("/companies") &&
                                activeCompanyTab === String(company.id)
                                  ? "text-white font-medium bg-white/10"
                                  : "text-blue-200/80 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              {company.name}
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
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                              pathname.includes("/products") &&
                              activeProductTab === "engines"
                                ? "text-white font-medium bg-white/10"
                                : "text-blue-200/80 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            Engines
                          </button>
                          <button
                            onClick={() => {
                              router.push(`${item.href}?tab=pumps`);
                              setSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                              pathname.includes("/products") &&
                              activeProductTab === "pumps"
                                ? "text-white font-medium bg-white/10"
                                : "text-blue-200/80 hover:text-white hover:bg-white/5"
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
                className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? "bg-white/10 text-white shadow-lg backdrop-blur-sm"
                    : "text-blue-100 hover:bg-white/5 hover:text-white"
                } ${sidebarCollapsed ? "justify-center" : "space-x-3"}`}
                title={sidebarCollapsed ? item.name : ""}
              >
                <Icon
                  className={`h-6 w-6 flex-shrink-0 ${
                    isActive
                      ? "text-blue-300"
                      : "group-hover:text-blue-300 transition-colors"
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
                {sidebarCollapsed && isActive && (
                  <div className="absolute left-0 w-1 h-8 bg-blue-400 rounded-r-full top-1/2 -translate-y-1/2" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/10 bg-[#1A2F4F]/50">
          <div
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center" : "space-x-3"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-md border-2 border-white/20">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-blue-200 truncate capitalize">{userRole}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Logout"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="mt-4 w-full p-2 flex justify-center text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Logout"
            >
              <ArrowLeftOnRectangleIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        {/* Top Mobile Bar */}
        <header className="lg:hidden bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-[#2B4C7E] transition-colors"
            >
              <Bars3Icon className="h-7 w-7" />
            </button>
            <span className="font-bold text-gray-800">Power Systems</span>
            <div className="w-8 h-8 rounded-full bg-[#2B4C7E] flex items-center justify-center text-white text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 bg-gray-50 flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}

// Helper Component for Menu Icons (Optional internal usage)
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
