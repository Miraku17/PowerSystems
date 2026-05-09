import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

export interface ReportHeaderContent {
  company_name: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
  branches: string;
}

const DEFAULTS: ReportHeaderContent = {
  company_name: "Power Systems, Incorporated",
  address: "2nd Floor TOPY’s Place #3 Calle Industria cor. Economia Street, Bagumbayan, Quezon City",
  tel: "(+63-2) 8687-9275",
  fax: "(+63-2) 8633-6678",
  email: "sales@psi-deutz.com",
  branches: "NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA • ILO-ILO • SURIGAO",
};

export function useReportHeaderContent() {
  const q = useQuery<ReportHeaderContent>({
    queryKey: ["reportHeaderContent"],
    queryFn: async () => {
      const r = await apiClient.get("/report-header");
      return r.data?.data as ReportHeaderContent;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return { content: q.data ?? DEFAULTS, isLoading: q.isLoading };
}

export const REPORT_HEADER_DEFAULTS = DEFAULTS;
