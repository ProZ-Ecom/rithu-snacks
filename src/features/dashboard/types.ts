export type TimePeriod = "today" | "this_week" | "this_month" | "last_month" | "this_year" | "custom";

export type ViewState = "live" | "skeleton" | "empty" | "error";

export interface DashboardStats {
  totalProducts: number;
  productsBadgeText?: string;
  totalCategories: number;
  categoriesBadgeText?: string;
  totalCustomers: number;
  customerGrowthPercent?: number;
  totalOrders: number;
  fulfillmentRatePercent?: number;
  grossRevenue: number;
  totalRevenue?: number; // Backwards-compatible alias for grossRevenue
  revenueGrowthPercent?: number;
  pendingOrders: number;
  pendingOrdersNotice?: string;
  stockWarnings: number;
  lowStock?: number; // Backwards-compatible alias for stockWarnings
  stockWarningsNotice?: string;
  todayOrders: number;
  todayRevenue: number;
  todayAvgComparison?: number;
}

export interface OverviewMetrics {
  averageOrderValue: number;
  aovComparisonText: string;
  aovTrend?: "up" | "down" | "neutral";
  grossMarginPercent: number;
  grossMarginLabel: string;
  grossMarginTrend?: "up" | "down" | "neutral";
  returnRtoRatePercent: number;
  returnRtoComparisonText: string;
}

export interface ChartDataPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  topProduct?: string;
  isPeak?: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
  statusKey: string;
}

export interface TopSellingProduct {
  id: string;
  name: string;
  category: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  stockQuantity: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  image?: string | null;
}

export interface RecentOrderDto {
  id: string;
  orderNumber: string;
  customerName: string;
  city: string;
  state: string;
  basketSummary: string;
  itemCount?: number;
  amount: number;
  paymentMethod: string;
  paymentProvider?: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
  placedTime: string;
  createdAt: string;
}

export interface RestockAlertDto {
  id: string;
  name: string;
  sku: string;
  available: number;
  minThreshold: number;
  unit: string;
  status: "critical" | "low_stock" | "out_of_stock";
  actionLabel: string;
}

export interface DashboardFullData {
  stats: DashboardStats;
  overview: OverviewMetrics;
  chartData: ChartDataPoint[];
  pipeline: PipelineStage[];
  pipelineHealth: {
    successRate: number;
    hubSla: number;
  };
  topProducts: TopSellingProduct[];
  recentOrders: RecentOrderDto[];
  restockAlerts: RestockAlertDto[];
}
