"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CogIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { Company } from "@/types";
import { companyService, companyFormService, authService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import Chatbot from "@/components/Chatbot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protect this route - redirect to login if no token
  useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [companiesExpanded, setCompaniesExpanded] = useState(false);
  const [formsExpanded, setFormsExpanded] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyForms, setCompanyForms] = useState<any[]>([]);
  const [activeCompanyTab, setActiveCompanyTab] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<string | null>(null);
  const [activeProductTab, setActiveProductTab] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Admin User");

  // Load companies and forms on mount
  useEffect(() => {
    loadCompanies();
    loadCompanyForms();
    loadUserData();
  }, []);

  const loadUserData = () => {
    const user = authService.getUser();
    if (user) {
      setUserName(`${user.firstName} ${user.lastName}`);
    }
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
      const response = await companyService.getAll();
      const companiesData = response.data || [];
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      console.error("Error loading companies:", error);
      setCompanies([]);
    }
  };

  const loadCompanyForms = async () => {
    try {
      const response = await companyFormService.getAll();
      const formsData = response.data || [];
      setCompanyForms(Array.isArray(formsData) ? formsData : []);
    } catch (error) {
      console.error("Error loading company forms:", error);
      setCompanyForms([]);
    }
  };

  const handleLogout = async () => {
    // Clear auth token and user data
    await authService.logout();
    // Redirect to login page
    router.push("/login");
  };

  const navigation = [
    { name: "Overview", icon: HomeIcon, href: "/dashboard/overview" },
    { name: "Customers", icon: UsersIcon, href: "/dashboard/customers" },
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
      name: "Form Templates",
      icon: DocumentDuplicateIcon,
      href: "/dashboard/forms",
      hasSubmenu: true,
      submenuType: "forms",
    },
    {
      name: "Form Records",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/records",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-transparent bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-20" : "w-64"}`}
        style={{ backgroundColor: "#2B4C7E" }}
      >
        <div className="flex flex-col h-screen">
          {/* Logo Section with Menu Toggle */}
          <div
            className={`flex items-center ${
              sidebarCollapsed
                ? "flex-col justify-center px-4 py-4 space-y-3"
                : "justify-between px-6 py-4"
            }`}
          >
            {sidebarCollapsed ? (
              <>
                <Image
                  src="/images/powersystemslogov2.png"
                  alt="Power Systems Inc"
                  width={70}
                  height={70}
                />
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:block text-white hover:text-gray-300 transition-colors"
                  title="Expand sidebar"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:block text-white hover:text-gray-300 transition-colors"
                    title="Collapse sidebar"
                  >
                    <Bars3Icon className="h-6 w-6" />
                  </button>
                  <Image
                    src="/images/powersystemslogov2.png"
                    alt="Power Systems Inc"
                    width={40}
                    height={40}
                  />
                  <span className="text-white font-bold text-lg">
                    Power Systems Inc.
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-white hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 px-4 py-6 space-y-2 overflow-y-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
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
                  <div key={item.href}>
                    <button
                      onClick={() => {
                        if (sidebarCollapsed) {
                          setSidebarCollapsed(false);
                          setExpanded(true);
                        } else {
                          setExpanded(!isExpanded);
                        }
                      }}
                      className={`w-full flex items-center rounded-lg transition-colors ${
                        sidebarCollapsed
                          ? "justify-center px-4 py-3"
                          : "justify-between px-4 py-3"
                      } ${isActive ? "text-white" : "text-blue-100"}`}
                      style={
                        isActive
                          ? { backgroundColor: "rgba(255, 255, 255, 0.15)" }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(74, 111, 165, 0.3)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "";
                        }
                      }}
                      title={sidebarCollapsed ? item.name : ""}
                    >
                      {sidebarCollapsed ? (
                        <Icon className="h-6 w-6" />
                      ) : (
                        <>
                          <div className="flex items-center space-x-3">
                            <Icon className="h-6 w-6" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <ChevronDownIcon
                            className={`h-5 w-5 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      )}
                    </button>

                    {/* Submenu */}
                    {isExpanded && !sidebarCollapsed && (
                      <div className="mt-2 ml-4 space-y-1">
                        {item.submenuType === "companies" ? (
                          <>
                            {/* All Companies */}
                            <button
                              onClick={() => {
                                router.push(item.href);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                                pathname === item.href && !activeCompanyTab
                                  ? "text-white bg-white/10"
                                  : "text-blue-100 hover:bg-white/5"
                              }`}
                            >
                              All Companies
                            </button>

                            {/* Individual Companies */}
                            {companies.length === 0 ? (
                              // Skeleton loaders for companies
                              <>
                                {[1, 2, 3].map((i) => (
                                  <div
                                    key={i}
                                    className="w-full px-4 py-2 animate-pulse"
                                  >
                                    <div className="h-4 bg-blue-300/20 rounded w-3/4"></div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              companies.map((company) => {
                                // Convert both to strings for comparison
                                const isCompanyActive =
                                  pathname.includes("/companies") &&
                                  activeCompanyTab === String(company.id);

                                return (
                                  <button
                                    key={company.id}
                                    onClick={() => {
                                      router.push(
                                        `${item.href}?tab=${company.id}`
                                      );
                                      setSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                                      isCompanyActive
                                        ? "text-white bg-white/10"
                                        : "text-blue-100 hover:bg-white/5"
                                    }`}
                                  >
                                    {company.name}
                                  </button>
                                );
                              })
                            )}
                          </>
                        ) : item.submenuType === "products" ? (
                          <>
                            {/* Engines */}
                            <button
                              onClick={() => {
                                router.push(`${item.href}?tab=engines`);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                                pathname.includes("/products") &&
                                activeProductTab === "engines"
                                  ? "text-white bg-white/10"
                                  : "text-blue-100 hover:bg-white/5"
                              }`}
                            >
                              Engines
                            </button>

                            {/* Pumps */}
                            <button
                              onClick={() => {
                                router.push(`${item.href}?tab=pumps`);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                                pathname.includes("/products") &&
                                activeProductTab === "pumps"
                                  ? "text-white bg-white/10"
                                  : "text-blue-100 hover:bg-white/5"
                              }`}
                            >
                              Pumps
                            </button>
                          </>
                        ) : item.submenuType === "forms" ? (
                          <>
                            {/* Create Form */}
                            {/* <button
                              onClick={() => {
                                router.push(item.href);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                                pathname === item.href && !activeFormTab
                                  ? "text-white bg-white/10"
                                  : "text-blue-100 hover:bg-white/5"
                              }`}
                            >
                              All Form Templates
                            </button> */}

                            {/* Individual Forms */}
                            {companyForms.length === 0 ? (
                              // Skeleton loaders for forms
                              <>
                                {[1, 2, 3].map((i) => (
                                  <div
                                    key={i}
                                    className="w-full px-4 py-2 animate-pulse"
                                  >
                                    <div className="h-4 bg-blue-300/20 rounded w-3/4"></div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              companyForms.map((form) => {
                                // Convert both to strings for comparison
                                const isFormActive =
                                  pathname.includes("/forms") &&
                                  activeFormTab === String(form.id);

                                return (
                                  <button
                                    key={form.id}
                                    onClick={() => {
                                      router.push(
                                        `${item.href}?tab=${form.id}`
                                      );
                                      setSidebarOpen(false);
                                    }}
                                    className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                                      isFormActive
                                        ? "text-white bg-white/10"
                                        : "text-blue-100 hover:bg-white/5"
                                    }`}
                                  >
                                    {form.name}
                                  </button>
                                );
                              })
                            )}
                          </>
                        ) : null}
                      </div>
                    )}
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
                  className={`w-full flex items-center rounded-lg transition-colors ${
                    sidebarCollapsed
                      ? "justify-center px-4 py-3"
                      : "space-x-3 px-4 py-3"
                  } ${isActive ? "text-white" : "text-blue-100"}`}
                  style={
                    isActive
                      ? { backgroundColor: "rgba(255, 255, 255, 0.15)" }
                      : {}
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(74, 111, 165, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "";
                    }
                  }}
                  title={sidebarCollapsed ? item.name : ""}
                >
                  <Icon className="h-6 w-6" />
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="px-4 py-4">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center rounded-lg text-blue-100 transition-colors ${
                sidebarCollapsed
                  ? "justify-center px-4 py-3"
                  : "space-x-3 px-4 py-3"
              }`}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(74, 111, 165, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "";
              }}
              title={sidebarCollapsed ? "Logout" : ""}
            >
              <ArrowLeftOnRectangleIcon className="h-6 w-6" />
              {!sidebarCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 relative ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Top Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-30 relative">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline text-sm text-gray-600">
                {userName}
              </span>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: "#2B4C7E" }}
              >
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
