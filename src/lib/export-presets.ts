import { ExportColumn } from "./excel-export";

/**
 * Preconfigured export columns for all admin modules.
 * Strictly aligned with the exact columns displayed in the UI data table of each respective module.
 * Non-rendered fields (such as internal database IDs, createdAt/updatedAt when not shown on screen)
 * are excluded to produce clean, user-friendly Excel sheets matching the admin dashboard table views.
 */

export const EXPORT_PRESETS = {
  // 1. Products: Product Name, Category, Product Code, HSN Code, Product Image
  products: [
    { header: "Product Name", key: "name", format: "text" },
    {
      header: "Category",
      accessor: (row: any) => row.categoryName || row.category?.name || "—",
      format: "text",
    },
    { header: "Product Code", key: "slug", format: "text" },
    {
      header: "HSN Code",
      accessor: (row: any) =>
        row.hsnCodeName ||
        row.hsnCode?.code ||
        row.product_hsn_codes?.code ||
        "—",
      format: "text",
    },
    {
      header: "Product Image",
      accessor: (row: any) =>
        row.imageUrl ||
        (Array.isArray(row.images) && row.images.length > 0
          ? row.images[0].image_url || row.images[0].url || ""
          : "") ||
        row.image ||
        "—",
      format: "text",
    },
  ] as ExportColumn[],

  // 2. Items: Product, Item Name, Item Code, Dietary Type, Best Before, Featured Item, Ready to Mix, Cooking Recipe, Short Description, Description, Ingredients, Item Image, SKU, Pack Sizes, Price, Stock, Status
  items: [
    {
      header: "Product",
      accessor: (row: any) => row.productName || row.product?.name || "—",
      format: "text",
    },
    {
      header: "Item Name",
      accessor: (row: any) => row.variantName || row.name || "—",
      format: "text",
    },
    {
      header: "Item Code",
      accessor: (row: any) => row.slug || "—",
      format: "text",
    },
    {
      header: "Dietary Type",
      accessor: (row: any) => {
        const vt = (row.vegType || "").toLowerCase();
        if (vt === "veg") return "Vegetarian (Veg)";
        if (vt === "nonveg" || vt === "non-veg") return "Non-Vegetarian (Non-Veg)";
        if (vt === "vegan") return "Vegan";
        if (vt === "na" || vt === "n/a") return "Not Applicable (N/A)";
        return row.vegType ? String(row.vegType).toUpperCase() : "Not Applicable (N/A)";
      },
      format: "text",
    },
    {
      header: "Best Before",
      accessor: (row: any) => row.shelfLife || "—",
      format: "text",
    },
    {
      header: "Featured Item",
      accessor: (row: any) => (row.isFeatured ? "Yes" : "No"),
      format: "text",
    },
    {
      header: "Ready to Mix",
      accessor: (row: any) => (row.isReadyToMix ? "Yes" : "No"),
      format: "text",
    },
    {
      header: "Cooking Recipe",
      accessor: (row: any) => row.cookingRecipe || "—",
      format: "text",
    },
    {
      header: "Short Description",
      accessor: (row: any) => row.shortDescription || "—",
      format: "text",
    },
    {
      header: "Description",
      accessor: (row: any) => {
        if (!row.description) return "—";
        return String(row.description).replace(/<[^>]*>?/gm, "").trim() || "—";
      },
      format: "text",
    },
    {
      header: "Ingredients",
      accessor: (row: any) => row.ingredients || "—",
      format: "text",
    },
    {
      header: "Item Image",
      accessor: (row: any) =>
        row.primaryImage ||
        row.imageUrl ||
        (Array.isArray(row.images) && row.images.length > 0
          ? row.images[0].imageUrl || row.images[0].image_url || row.images[0].url || ""
          : "") ||
        row.image ||
        "—",
      format: "text",
    },
    {
      header: "SKU",
      accessor: (row: any) => {
        const prices = row.unitPrices ?? [];
        if (prices.length > 0) {
          const skus = prices.map((p: any) => p.sku).filter(Boolean);
          if (skus.length > 0) return skus.join(", ");
        }
        return row.sku || "—";
      },
      format: "text",
    },
    {
      header: "Pack Sizes",
      accessor: (row: any) => {
        const prices = row.unitPrices ?? [];
        if (prices.length > 0) {
          return prices
            .map((p: any) => {
              if (p.measurement && p.measurement.value && p.measurement.unit) {
                return `${p.measurement.value} ${p.measurement.unit}`.trim();
              }
              if (p.unitValue && (p.unitCode || p.unitName)) {
                return `${p.unitValue} ${p.unitCode || p.unitName}`.trim();
              }
              return "";
            })
            .filter(Boolean)
            .join(", ");
        }
        const m = row.measurement;
        return m && m.value && m.unit ? `${m.value} ${m.unit}` : "—";
      },
      format: "text",
    },
    {
      header: "Price",
      accessor: (row: any) => {
        const prices = row.unitPrices ?? [];
        if (prices.length > 0) {
          const list = prices
            .map((p: any) => {
              const size = p.measurement
                ? `${p.measurement.value} ${p.measurement.unit}`.trim()
                : p.unitValue && (p.unitCode || p.unitName)
                ? `${p.unitValue} ${p.unitCode || p.unitName}`.trim()
                : "";
              const priceVal =
                typeof p.basePrice === "number" ? `₹${p.basePrice}` : "";
              if (size && priceVal) {
                return `${size}: ${priceVal}`;
              }
              return priceVal || size || "";
            })
            .filter(Boolean);

          if (list.length > 0) {
            return list.join(", ");
          }
        }

        if (typeof row.basePrice === "number") {
          const m = row.measurement;
          if (m && m.value && m.unit) {
            return `${m.value} ${m.unit}: ₹${row.basePrice}`;
          }
          return `₹${row.basePrice}`;
        }

        return "—";
      },
      format: "text",
    },
    {
      header: "Stock",
      accessor: (row: any) => (!row.outOfStock ? "In Stock" : "Out of Stock"),
      format: "status",
    },
    {
      header: "Status",
      accessor: (row: any) => (row.isActive ? "Active" : "Inactive"),
      format: "status",
    },
  ] as ExportColumn[],

  // Alias for backward compatibility
  get variants() {
    return this.items;
  },

  // 3. Categories: Category Name, Category Code, Description, Sort Order
  categories: [
    { header: "Category Name", key: "name", format: "text" },
    { header: "Category Code", key: "slug", format: "text" },
    {
      header: "Description",
      accessor: (row: any) => row.description || "—",
      format: "text",
    },
    { header: "Sort Order", key: "sortOrder", format: "number" },
  ] as ExportColumn[],

  // 4. Brands Table: [Image], Brand Name, Brand Code, Products, Created Date
  brands: [
    { header: "Brand Name", key: "name", format: "text" },
    { header: "Brand Code", key: "slug", format: "text" },
    {
      header: "Products",
      accessor: (row: any) => `${row._count?.products || 0} Items`,
      format: "text",
    },
    { header: "Created Date", key: "createdAt", format: "date" },
  ] as ExportColumn[],

  // 5. Units Table: Unit Name, Code, Type, Base Unit, Conversion, Order
  units: [
    { header: "Unit Name", key: "name", format: "text" },
    { header: "Code", key: "code", format: "text" },
    { header: "Type", key: "type", format: "text" },
    {
      header: "Base Unit",
      accessor: (row: any) =>
        row.baseUnit
          ? `${row.baseUnit.name} (${row.baseUnit.code})`
          : row.baseUnitName || "—",
      format: "text",
    },
    { header: "Conversion", key: "conversionFactor", format: "number" },
    { header: "Order", key: "sortOrder", format: "number" },
  ] as ExportColumn[],

  // 6. GST Rates Table: GST Name, CGST %, SGST %, IGST %
  gstRates: [
    { header: "GST Name", key: "name", format: "text" },
    { header: "CGST (%)", key: "cgstPercent", format: "number" },
    { header: "SGST (%)", key: "sgstPercent", format: "number" },
    { header: "IGST (%)", key: "igstPercent", format: "number" },
  ] as ExportColumn[],

  // 7. HSN Codes Table: HSN Code, Description, GST Rate
  hsnCodes: [
    { header: "HSN Code", key: "code", format: "text" },
    {
      header: "Description",
      accessor: (row: any) => row.description || "—",
      format: "text",
    },
    {
      header: "GST Rate",
      accessor: (row: any) =>
        row.gstRate?.name || row.gstRateName || row.gstRateId || "—",
      format: "text",
    },
  ] as ExportColumn[],

  // 8. Orders Table: Order ID, Placed Date, Customer, Customer Contact, Items, Total, Payment, Status, Assigned Staff
  orders: [
    { header: "Order ID", key: "orderNumber", format: "text" },
    {
      header: "Placed Date",
      accessor: (row: any) => row.placedAt || row.createdAt,
      format: "datetime",
    },
    {
      header: "Customer",
      accessor: (row: any) => row.customer?.name || "Customer",
      format: "text",
    },
    {
      header: "Customer Contact",
      accessor: (row: any) =>
        row.customer?.phone ||
        row.customer?.email ||
        (row.customer?.customerId ? `ID: ${row.customer.customerId}` : "—"),
      format: "text",
    },
    { header: "Items", key: "totalItems", format: "number" },
    { header: "Total Amount (₹)", key: "totalAmount", format: "currency" },
    { header: "Payment Status", key: "paymentStatus", format: "status" },
    { header: "Status", key: "status", format: "status" },
    {
      header: "Assigned Staff",
      accessor: (row: any) => row.delivery?.staff?.name || "Unassigned",
      format: "text",
    },
  ] as ExportColumn[],

  // 9. Customers Table: Customer Name, Customer Code/ID, Email, Phone, Gender, DOB, Verification, Status, Registered, Last Login
  customers: [
    { header: "Customer Name", key: "name", format: "text" },
    {
      header: "Customer ID",
      accessor: (row: any) =>
        row.customerId
          ? `ID: ${row.customerId}`
          : row.id
          ? `ID: ${row.id.slice(0, 8)}...`
          : "—",
      format: "text",
    },
    {
      header: "Email Address",
      accessor: (row: any) => row.email || "—",
      format: "text",
    },
    {
      header: "Phone Number",
      accessor: (row: any) => row.phone || "—",
      format: "text",
    },
    {
      header: "Gender",
      accessor: (row: any) => row.gender || "—",
      format: "text",
    },
    {
      header: "DOB",
      accessor: (row: any) => row.dob || "—",
      format: "text",
    },
    {
      header: "Email Verified",
      accessor: (row: any) => (row.emailVerified ? "Yes" : "No"),
      format: "text",
    },
    {
      header: "Phone Verified",
      accessor: (row: any) => (row.phoneVerified ? "Yes" : "No"),
      format: "text",
    },
    {
      header: "Status",
      accessor: (row: any) =>
        row.isBlocked ||
        row.isActive === false ||
        row.status === "banned" ||
        row.status === "inactive"
          ? "Blocked"
          : "Active",
      format: "status",
    },
    { header: "Registered Date", key: "createdAt", format: "date" },
    {
      header: "Last Login",
      accessor: (row: any) => row.lastLoginAt || "Never",
      format: "datetime",
    },
  ] as ExportColumn[],

  // 10. Inventory Stock Table: Product Name, Item Name, Quantity, Reserved, Available, Reorder Level, Status
  inventoryStock: [
    {
      header: "Product Name",
      accessor: (row: any) => row.productName || row.product?.name || "—",
      format: "text",
    },
    {
      header: "Item Name",
      accessor: (row: any) => row.variantName || row.name || row.variant?.sku || "—",
      format: "text",
    },
    { header: "Quantity", key: "quantity", format: "number" },
    { header: "Reserved", key: "reservedQuantity", format: "number" },
    { header: "Available", key: "availableQuantity", format: "number" },
    { header: "Reorder Level", key: "reorderLevel", format: "number" },
    {
      header: "Status",
      accessor: (row: any) => {
        if (row.quantity === 0) return "Out of Stock";
        if (row.quantity <= (row.reorderLevel ?? 5)) return "Low Stock";
        return "In Stock";
      },
      format: "status",
    },
  ] as ExportColumn[],

  // 11. Inventory History Table: Date, Product, Movement Type, Quantity, Notes, Reference
  inventoryHistory: [
    { header: "Date", key: "createdAt", format: "datetime" },
    {
      header: "Product",
      accessor: (row: any) => row.productName || row.product?.name || "—",
      format: "text",
    },
    { header: "Movement Type", key: "type", format: "status" },
    { header: "Quantity", key: "quantity", format: "number" },
    {
      header: "Notes",
      accessor: (row: any) => row.notes || "—",
      format: "text",
    },
    {
      header: "Reference",
      accessor: (row: any) => row.referenceType || "—",
      format: "text",
    },
  ] as ExportColumn[],

  // 12. Coupons Table: Code, Type, Value, Usage, Status, Expiry
  coupons: [
    { header: "Code", key: "code", format: "text" },
    {
      header: "Type",
      accessor: (row: any) => {
        const typeStr =
          row.type?.toUpperCase() === "FLAT" || row.type?.toUpperCase() === "FIXED"
            ? "FIXED"
            : "PERCENTAGE";
        return typeStr;
      },
      format: "status",
    },
    {
      header: "Value",
      accessor: (row: any) =>
        row.type?.toUpperCase() === "PERCENTAGE"
          ? `${row.value}%`
          : `₹${row.value}`,
      format: "text",
    },
    {
      header: "Usage",
      accessor: (row: any) =>
        `${row.usedCount || 0}${row.usageLimit ? ` / ${row.usageLimit}` : ""}`,
      format: "text",
    },
    {
      header: "Status",
      accessor: (row: any) => (row.isActive ? "Active" : "Inactive"),
      format: "status",
    },
    {
      header: "Expiry",
      accessor: (row: any) =>
        row.expiresAt
          ? new Date(row.expiresAt).toLocaleDateString("en-IN")
          : "No expiry",
      format: "text",
    },
  ] as ExportColumn[],

  // 13. Offers Table: Offer, Level, Category / Product / Item, Type, Discount, Validity, Priority, Status
  offers: [
    { header: "Offer Name", key: "name", format: "text" },
    {
      header: "Offer Code",
      accessor: (row: any) => row.code || "—",
      format: "text",
    },
    { header: "Level", key: "level", format: "status" },
    {
      header: "Target Category / Product / Item",
      accessor: (row: any) => {
        if (row.level === "product") {
          const prods = row.products ?? [];
          if (prods.length === 0) return "—";
          return prods.map((p: any) => p.name).join(", ");
        }
        const items = row.items ?? [];
        if (items.length === 0) return "—";
        return items.map((i: any) => i.label || i.sku).join(", ");
      },
      format: "text",
    },
    { header: "Type", key: "type", format: "status" },
    {
      header: "Discount",
      accessor: (row: any) => {
        if (
          row.type === "percentage" ||
          row.type?.toUpperCase() === "PERCENTAGE"
        ) {
          return `${row.value}%`;
        }
        if (
          row.type === "fixed_amount" ||
          row.type?.toUpperCase() === "FLAT" ||
          row.type?.toUpperCase() === "FIXED"
        ) {
          return `₹${row.value}`;
        }
        return String(row.value ?? "—");
      },
      format: "text",
    },
    {
      header: "Validity",
      accessor: (row: any) => {
        const s = row.startsAt
          ? new Date(row.startsAt).toLocaleDateString("en-IN")
          : "Now";
        const e = row.endsAt
          ? new Date(row.endsAt).toLocaleDateString("en-IN")
          : "Ongoing";
        return `${s} — ${e}`;
      },
      format: "text",
    },
    { header: "Priority", key: "priority", format: "number" },
    {
      header: "Status",
      accessor: (row: any) =>
        row.status || (row.isActive ? "ACTIVE" : "INACTIVE"),
      format: "status",
    },
  ] as ExportColumn[],

  // 14. Reviews Table: Customer, Date, Product / Item, Rating, Review Title, Review Comment, Status
  reviews: [
    {
      header: "Customer",
      accessor: (row: any) =>
        row.customer?.name || row.user?.name || "Verified Customer",
      format: "text",
    },
    { header: "Submitted Date", key: "createdAt", format: "date" },
    {
      header: "Product",
      accessor: (row: any) => row.product?.name || "Product",
      format: "text",
    },
    {
      header: "Item Name",
      accessor: (row: any) => row.variant?.name || row.variant?.variantName || row.variant?.sku || "—",
      format: "text",
    },
    { header: "Rating (Stars)", key: "rating", format: "number" },
    {
      header: "Review Title",
      accessor: (row: any) => row.title || "—",
      format: "text",
    },
    {
      header: "Review Comment",
      accessor: (row: any) => row.comment || "—",
      format: "text",
    },
    {
      header: "Status",
      accessor: (row: any) => (row.isApproved ? "Approved" : "Pending"),
      format: "status",
    },
  ] as ExportColumn[],

  // 15. Delivery Orders Table: Order / Placed, Customer, Customer Contact, Delivery Address, Assigned Staff, Total, Shipment Status
  deliveryOrders: [
    {
      header: "Order Number",
      accessor: (row: any) =>
        `#${row.orderNumber || row.order?.orderNumber || "—"}`,
      format: "text",
    },
    {
      header: "Placed Date",
      accessor: (row: any) =>
        row.createdAt || row.order?.placedAt || row.order?.createdAt,
      format: "datetime",
    },
    {
      header: "Customer",
      accessor: (row: any) => row.customer?.name || "Customer",
      format: "text",
    },
    {
      header: "Customer Contact",
      accessor: (row: any) => row.customer?.phone || row.customer?.email || "—",
      format: "text",
    },
    {
      header: "Delivery Address",
      accessor: (row: any) => {
        const addr = row.shippingAddress;
        if (!addr) return "—";
        return [addr.addressLine1, addr.city, addr.pincode]
          .filter(Boolean)
          .join(", ");
      },
      format: "text",
    },
    {
      header: "Assigned Staff",
      accessor: (row: any) =>
        row.shipment?.deliveryStaff?.name ||
        row.deliveryStaff?.name ||
        row.staff?.name ||
        "Unassigned",
      format: "text",
    },
    {
      header: "Total (₹)",
      accessor: (row: any) => row.totalAmount ?? row.order?.totalAmount ?? 0,
      format: "currency",
    },
    {
      header: "Shipment Status",
      accessor: (row: any) => {
        const shipment = row.shipment;
        if (!shipment) return row.orderStatus || "—";
        const as = (shipment.assignmentStatus || "").toLowerCase();
        if (as === "pending") return "Pending Acceptance";
        if (as === "rejected") return "Rejected";
        return shipment.status || row.deliveryStatus || "—";
      },
      format: "status",
    },
  ] as ExportColumn[],

  // 16. Bulk Orders Table: Customer Name, Email, Company, Product Interest, Quantity, Phone, Status, Received At
  bulkOrders: [
    { header: "Customer Name", key: "name", format: "text" },
    { header: "Email Address", key: "email", format: "text" },
    {
      header: "Company / Org",
      accessor: (row: any) => row.companyName || "—",
      format: "text",
    },
    {
      header: "Product Interest",
      accessor: (row: any) => row.productInterest || "Not specified",
      format: "text",
    },
    {
      header: "Quantity",
      accessor: (row: any) => `${row.quantity} units`,
      format: "text",
    },
    { header: "Phone Number", key: "phone", format: "text" },
    { header: "Status", key: "status", format: "status" },
    { header: "Received At", key: "createdAt", format: "datetime" },
  ] as ExportColumn[],

  // 17. Contacts Table: Customer, Email, Phone, Subject, Message, Status, Received At
  contacts: [
    {
      header: "Customer",
      accessor: (row: any) => row.name || "Anonymous",
      format: "text",
    },
    { header: "Email Address", key: "email", format: "text" },
    {
      header: "Phone Number",
      accessor: (row: any) => row.phone || "—",
      format: "text",
    },
    {
      header: "Subject",
      accessor: (row: any) => row.subject || "No Subject",
      format: "text",
    },
    {
      header: "Message",
      accessor: (row: any) => row.message || "—",
      format: "text",
    },
    { header: "Status", key: "status", format: "status" },
    { header: "Received At", key: "createdAt", format: "datetime" },
  ] as ExportColumn[],

  // 18. Blogs Table: Title, Slug, Author, Status, Published Date
  blogs: [
    { header: "Title", key: "title", format: "text" },
    { header: "Slug", key: "slug", format: "text" },
    {
      header: "Author",
      accessor: (row: any) => row.author?.name || "—",
      format: "text",
    },
    { header: "Status", key: "status", format: "status" },
    {
      header: "Published Date",
      accessor: (row: any) =>
        row.publishedAt
          ? new Date(row.publishedAt).toLocaleDateString("en-IN")
          : "—",
      format: "text",
    },
  ] as ExportColumn[],

  // 19. Banners Table: Title, Banner Type, Schedule, Status
  banners: [
    {
      header: "Title",
      accessor: (row: any) => row.title || "Untitled Banner",
      format: "text",
    },
    {
      header: "Banner Type",
      accessor: (row: any) =>
        row.bannerPosition?.name || row.bannerPosition?.slug || "—",
      format: "text",
    },
    {
      header: "Schedule",
      accessor: (row: any) => {
        const s = row.startsAt
          ? new Date(row.startsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "";
        const e = row.endsAt
          ? new Date(row.endsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "";
        if (!s && !e) return "Always Active";
        return `${s || "Now"} — ${e || "Forever"}`;
      },
      format: "text",
    },
    {
      header: "Status",
      accessor: (row: any) => (row.isActive ? "Active" : "Inactive"),
      format: "status",
    },
  ] as ExportColumn[],

  // 20. FAQs Table: Order, Question, Answer, Category, Status
  faqs: [
    { header: "Order", key: "displayOrder", format: "number" },
    { header: "Question", key: "question", format: "text" },
    { header: "Answer", key: "answer", format: "text" },
    {
      header: "Category",
      accessor: (row: any) => row.category || "Uncategorised",
      format: "text",
    },
    {
      header: "Status",
      accessor: (row: any) => (row.status === "ACTIVE" ? "Active" : "Inactive"),
      format: "status",
    },
  ] as ExportColumn[],

  // 21. Users Table: Full Name, Email, Phone, Role, Status, Joined Date
  users: [
    { header: "Name", key: "name", format: "text" },
    { header: "Email", key: "email", format: "text" },
    {
      header: "Phone",
      accessor: (row: any) => row.phone || "-",
      format: "text",
    },
    {
      header: "Role",
      accessor: (row: any) => row.roleName || row.role?.name || "Unknown",
      format: "text",
    },
    { header: "Status", key: "status", format: "status" },
    { header: "Joined", key: "createdAt", format: "date" },
  ] as ExportColumn[],

  // 22. Staff Table: Staff Member, Role, Email Address, Phone Number, Status, Created Date
  staff: [
    { header: "Staff Member", key: "name", format: "text" },
    {
      header: "Role",
      accessor: (row: any) => row.role || "STAFF",
      format: "text",
    },
    {
      header: "Email Address",
      accessor: (row: any) => row.email || "—",
      format: "text",
    },
    {
      header: "Phone Number",
      accessor: (row: any) => {
        const rawPhone = row.phone;
        const displayPhone = rawPhone
          ? rawPhone.replace(/^\+91\s*/, "").replace(/^91\s*/, "").trim()
          : "";
        return displayPhone || "—";
      },
      format: "text",
    },
    {
      header: "Status",
      accessor: (row: any) => (row.isActive ? "Active" : "Inactive"),
      format: "status",
    },
    { header: "Created Date", key: "createdAt", format: "date" },
  ] as ExportColumn[],

  // 23. Roles Table: Role Name, Description, Users, Permissions
  roles: [
    { header: "Role Name", key: "name", format: "text" },
    {
      header: "Description",
      accessor: (row: any) => row.description || "—",
      format: "text",
    },
    {
      header: "Users",
      accessor: (row: any) => row._count?.users ?? 0,
      format: "number",
    },
    {
      header: "Permissions",
      accessor: (row: any) =>
        row._count?.rolePermissions ?? row.permissions?.length ?? 0,
      format: "number",
    },
  ] as ExportColumn[],

  // 24. Permissions Table: Permission Name, Module, Description
  permissions: [
    { header: "Permission Name", key: "name", format: "text" },
    { header: "Module", key: "module", format: "text" },
    {
      header: "Description",
      accessor: (row: any) => row.description || "—",
      format: "text",
    },
  ] as ExportColumn[],
};

export { exportProductsMatrixToExcel, exportVariantsMatrixToExcel } from "./excel-export";

