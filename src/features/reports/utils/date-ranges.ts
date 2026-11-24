import { ReportPeriod } from "../types";

export interface ResolvedDateRange {
  startDate: Date;
  endDate: Date;
  label: string;
  startIso: string;
  endIso: string;
}

export function resolveReportDateRange(
  period: ReportPeriod = "this_month",
  customStart?: string,
  customEnd?: string
): ResolvedDateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let label = "This Month";

  switch (period) {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = "Today";
      break;
    }
    case "yesterday": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      label = "Yesterday";
      break;
    }
    case "this_week": {
      const day = now.getDay();
      const diff = now.getDate() - (day === 0 ? 6 : day - 1); // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = "This Week";
      break;
    }
    case "last_week": {
      const day = now.getDay();
      const diff = now.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff - 7, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), diff - 1, 23, 59, 59, 999);
      label = "Last Week";
      break;
    }
    case "last_month": {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const monthName = startDate.toLocaleString("en-IN", { month: "short", year: "numeric" });
      label = `Last Month (${monthName})`;
      break;
    }
    case "this_year": {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      label = `This Year (${now.getFullYear()})`;
      break;
    }
    case "custom": {
      if (customStart && customEnd) {
        const [sy, sm, sd] = customStart.split("-").map(Number);
        const [ey, em, ed] = customEnd.split("-").map(Number);
        startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        const startFormatted = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const endFormatted = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        label = `${startFormatted} – ${endFormatted}`;
      } else {
        // Fallback to last 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = "Past 30 Days";
      }
      break;
    }
    case "this_month":
    default: {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const monthName = now.toLocaleString("en-IN", { month: "short", year: "numeric" });
      label = `This Month (${monthName})`;
      break;
    }
  }

  const formatIsoDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    startDate,
    endDate,
    label,
    startIso: formatIsoDate(startDate),
    endIso: formatIsoDate(endDate),
  };
}
