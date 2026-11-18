export type ReportPeriod =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export interface ReportDateFilter {
  period: ReportPeriod;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

// -------------------------------------------------------------
// 1. Sales Report Types
// -------------------------------------------------------------
export interface SalesSummary {
  grossSales: number;
  netSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalDiscount: number;
  totalTax: number;
  totalShipping: number;
  totalItemsSold: number;
}

export interface SalesChartPoint {
  date: string;
  label: string;
  sales: number;
  orders: number;
}

export interface SalesTableRow {
  date: string;
  orderCount: number;
  itemsSold: number;
  grossSales: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  netSales: number;
}

export interface SalesReportResponse {
  period: ReportPeriod;
  dateRange: { start: string; end: string };
  summary: SalesSummary;
  chart: SalesChartPoint[];
  table: SalesTableRow[];
}

// -------------------------------------------------------------
// 2. Orders Report Types
// -------------------------------------------------------------
export interface OrdersSummary {
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  fulfillmentRatePercent: number;
  totalAmount: number;
}

export interface OrderStatusCount {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface OrderReportRow {
  id: string;
  orderNumber: string;
  placedAt: string;
  customerName: string;
  customerPhone: string;
  city: string;
  state: string;
  itemCount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  totalAmount: number;
}

export interface OrdersReportResponse {
  period: ReportPeriod;
  dateRange: { start: string; end: string };
  summary: OrdersSummary;
  statusDistribution: OrderStatusCount[];
  table: OrderReportRow[];
  totalRecords: number;
}

// -------------------------------------------------------------
// 3. Products Report Types
// -------------------------------------------------------------
export interface ProductsSummary {
  distinctProductsSold: number;
  totalUnitsSold: number;
  totalRevenue: number;
  topProduct: {
    name: string;
    units: number;
    revenue: number;
  } | null;
}

export interface CategoryBreakdown {
  categoryName: string;
  units: number;
  revenue: number;
  sharePercent: number;
}

export interface ProductReportRow {
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  currentStock: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
}

export interface ProductsReportResponse {
  period: ReportPeriod;
  dateRange: { start: string; end: string };
  summary: ProductsSummary;
  categoryBreakdown: CategoryBreakdown[];
  table: ProductReportRow[];
}

// -------------------------------------------------------------
// 4. Inventory Report Types
// -------------------------------------------------------------
export interface InventorySummary {
  totalSkus: number;
  totalStockUnits: number;
  totalInventoryValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
}

export interface InventoryReportRow {
  variantUnitPriceId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitName: string;
  basePrice: number;
  availableStock: number;
  reservedStock: number;
  reorderLevel: number;
  totalStockValue: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface InventoryReportResponse {
  summary: InventorySummary;
  table: InventoryReportRow[];
}

// -------------------------------------------------------------
// 5. Revenue & Tax Report Types
// -------------------------------------------------------------
export interface RevenueSummary {
  grossInvoiced: number;
  discountsGranted: number;
  taxableBase: number;
  totalTaxCollected: number;
  totalShippingCollected: number;
  netRevenue: number;
  refundsIssued: number;
}

export interface PaymentGatewaySplit {
  gateway: string;
  label: string;
  amount: number;
  count: number;
  sharePercent: number;
}

export interface RevenueTableRow {
  periodDate: string;
  ordersCount: number;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  shippingAmount: number;
  netRevenue: number;
}

export interface RevenueReportResponse {
  period: ReportPeriod;
  dateRange: { start: string; end: string };
  summary: RevenueSummary;
  paymentSplit: PaymentGatewaySplit[];
  table: RevenueTableRow[];
}

// -------------------------------------------------------------
// 6. Customers Report Types
// -------------------------------------------------------------
export interface CustomersSummary {
  totalCustomers: number;
  newCustomersInPeriod: number;
  repeatCustomersInPeriod: number;
  totalSpentInPeriod: number;
  averageCustomerLifetimeSpend: number;
}

export interface CustomerReportRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  registeredAt: string;
  ordersInPeriod: number;
  spentInPeriod: number;
  lifetimeOrders: number;
  lifetimeSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  customerType: "new" | "repeat" | "one-time";
}

export interface CustomersReportResponse {
  period: ReportPeriod;
  dateRange: { start: string; end: string };
  summary: CustomersSummary;
  table: CustomerReportRow[];
}
