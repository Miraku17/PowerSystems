import apiClient from "@/lib/axios";

export interface ReportParams {
  reportType: "generated" | "status" | "wip" | "cancelled";
  startDate?: string;
  endDate?: string;
  status?: string[];
}

export const reportService = {
  downloadReport: async (params: ReportParams) => {
    const searchParams = new URLSearchParams();
    searchParams.set("reportType", params.reportType);
    if (params.startDate) searchParams.set("startDate", params.startDate);
    if (params.endDate) searchParams.set("endDate", params.endDate);
    if (params.status && params.status.length > 0) {
      searchParams.set("status", params.status.join(","));
    }

    const response = await apiClient.get(
      `/reports/job-orders?${searchParams.toString()}`,
      { responseType: "blob" }
    );

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers["content-disposition"];
    let filename = "report.csv";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    // Trigger browser download
    const blob = new Blob([response.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
