import apiClient from "@/lib/axios";

export interface ReportParams {
  reportType: "generated" | "status" | "wip" | "cancelled" | "engine";
  startDate?: string;
  endDate?: string;
  status?: string[];
  engineModel?: string;
  serialNumber?: string;
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
    if (params.engineModel) searchParams.set("engineModel", params.engineModel);
    if (params.serialNumber) searchParams.set("serialNumber", params.serialNumber);

    let response;
    try {
      response = await apiClient.get(
        `/reports/job-orders?${searchParams.toString()}`,
        { responseType: "blob" }
      );
    } catch (err: any) {
      // When responseType is "blob", error response data is a Blob — parse it to get the JSON message
      if (err?.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Failed to generate report");
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) {
            throw new Error(text || "Failed to generate report");
          }
          throw parseErr;
        }
      }
      throw err;
    }

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
