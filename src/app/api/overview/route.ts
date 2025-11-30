import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/auth-middleware";

export const GET = withAuth(async (request, { user }) => {
  try {
    const supabase = getServiceSupabase();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);

    const [
      customersCount,
      enginesCount,
      companiesCount,
      formsCount,
      monthlyForms,
      monthlyCustomers,
    ] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact" }),
      supabase.from("engines").select("id", { count: "exact" }),
      supabase.from("companies").select("id", { count: "exact" }),
      supabase.from("forms").select("id", { count: "exact" }),
      supabase
        .from("forms")
        .select("created_at")
        .gte("created_at", sixMonthsAgo.toISOString()),
      supabase
        .from("customers")
        .select("created_at")
        .gte("created_at", sixMonthsAgo.toISOString()),
    ]);

    const processMonthlyData = (data: any[] | null, dataKey: string) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyCounts: { [key: string]: number } = {};
      if (data) {
        for (const item of data) {
          const date = new Date(item.created_at);
          const month = monthNames[date.getUTCMonth()];
          monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
        }
      }

      const result = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setUTCMonth(date.getUTCMonth() - i);
        const month = monthNames[date.getUTCMonth()];
        result.push({
          month,
          [dataKey]: monthlyCounts[month] || 0,
        });
      }
      return result;
    };

    const formsMonthly = processMonthlyData(monthlyForms.data, "forms");
    const customersMonthly = processMonthlyData(
      monthlyCustomers.data,
      "customers"
    );

    const combinedMonthlyData = formsMonthly.map((form) => {
      const customerData = customersMonthly.find(
        (cust) => cust.month === form.month
      );
      return {
        ...form,
        customers: customerData ? customerData.customers : 0,
      };
    });

    const data = {
      counts: {
        customers: customersCount.count,
        engines: enginesCount.count,
        companies: companiesCount.count,
        forms: formsCount.count,
      },
      monthlyData: combinedMonthlyData,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
});
