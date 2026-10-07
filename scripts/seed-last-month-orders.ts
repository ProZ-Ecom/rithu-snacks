import "dotenv/config";
import crypto from "crypto";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

function createClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const url = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
  });
  return new PrismaClient({ adapter });
}

const prisma = createClient();

async function main() {
  console.log("🚀 Starting seed for 20 orders in last month (September 2026)...");

  // 1. Ensure Customer Role & Users exist
  let customerRole = await prisma.role.findFirst({ where: { slug: "customer" } });
  if (!customerRole) {
    customerRole = await prisma.role.create({
      data: {
        name: "CUSTOMER",
        slug: "customer",
        description: "Regular customer",
      },
    });
  }

  const customerPassword = await bcrypt.hash("customer123", 10);

  const customerProfiles = [
    { name: "John Customer", email: "customer@example.com", phone: "9876543210", city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
    { name: "Priya Sharma", email: "priya.sharma@example.com", phone: "9876543211", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
    { name: "Ramesh Kumar", email: "ramesh.kumar@example.com", phone: "9876543212", city: "Coimbatore", state: "Tamil Nadu", pincode: "641001" },
    { name: "Anita Patel", email: "anita.patel@example.com", phone: "9876543213", city: "Hyderabad", state: "Telangana", pincode: "500001" },
    { name: "Karthik Raja", email: "karthik.raja@example.com", phone: "9876543214", city: "Madurai", state: "Tamil Nadu", pincode: "625001" },
    { name: "Sneha Reddy", email: "sneha.reddy@example.com", phone: "9876543215", city: "Tiruchirappalli", state: "Tamil Nadu", pincode: "620001" },
  ];

  const users: any[] = [];
  for (const prof of customerProfiles) {
    let u = await prisma.user.findFirst({ where: { email: prof.email } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          uuid: crypto.randomUUID(),
          name: prof.name,
          email: prof.email,
          phone: prof.phone,
          password_hash: customerPassword,
          roleId: customerRole.id,
          status: "active",
          email_verified_at: new Date(2026, 7, 15),
        },
      });
    }
    users.push({ ...u, profile: prof });
  }

  console.log(`✅ ${users.length} customer users ready.`);

  // 2. Fetch available products with variants and unit prices
  let products = await prisma.product.findMany({
    where: { isActive: true, deleted_at: null },
    include: {
      variants: {
        where: { isActive: true, deleted_at: null },
        include: {
          variant_unit_prices: {
            where: { isActive: true, deleted_at: null },
            include: { product_units: true },
          },
        },
      },
    },
  });

  // Flatten available sellable items
  const catalogPool: Array<{
    productId: bigint;
    productName: string;
    variantId: bigint;
    variantName: string;
    variantUnitPriceId: bigint;
    sku: string;
    unitPrice: number;
    packSize: string;
  }> = [];

  for (const p of products) {
    for (const v of p.variants || []) {
      for (const up of v.variant_unit_prices || []) {
        catalogPool.push({
          productId: p.id,
          productName: p.name,
          variantId: v.id,
          variantName: v.variant_name || "Standard",
          variantUnitPriceId: up.id,
          sku: up.sku || `SKU-${up.id}`,
          unitPrice: Number(up.base_price || 100),
          packSize: `${Number(up.unit_value || 200)} ${up.product_units?.code || "g"}`,
        });
      }
    }
  }

  if (catalogPool.length === 0) {
    throw new Error("No sellable items in catalog to seed orders.");
  }

  console.log(`✅ Available catalog items: ${catalogPool.length}`);

  // Clean up any existing test orders with prefix RS-202609
  const existingOrders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: "RS-202609" } },
    select: { id: true },
  });

  if (existingOrders.length > 0) {
    const existingIds = existingOrders.map((o) => o.id);
    await prisma.order_status_history.deleteMany({ where: { order_id: { in: existingIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: existingIds } } });
    await prisma.orderAddress.deleteMany({ where: { orderId: { in: existingIds } } });
    await prisma.order.deleteMany({ where: { id: { in: existingIds } } });
    console.log(`🧹 Cleaned up ${existingOrders.length} previous test orders.`);
  }

  // 3. Define 20 realistic orders across September 2026 (Last Month)
  // Current time is Oct 2026 -> Last month = September 2026 (2026-09-01 to 2026-09-30)
  const orderConfigs = [
    { day: 1, hour: 10, min: 15, userIdx: 0, status: "delivered", payStatus: "paid", itemCount: 2, qty1: 2, qty2: 1, discount: 0, shipping: 50 },
    { day: 2, hour: 14, min: 30, userIdx: 1, status: "delivered", payStatus: "paid", itemCount: 1, qty1: 3, qty2: 0, discount: 20, shipping: 0 },
    { day: 4, hour: 11, min: 0, userIdx: 2, status: "delivered", payStatus: "paid", itemCount: 3, qty1: 1, qty2: 2, discount: 0, shipping: 50 },
    { day: 6, hour: 16, min: 45, userIdx: 3, status: "delivered", payStatus: "paid", itemCount: 2, qty1: 2, qty2: 2, discount: 50, shipping: 0 },
    { day: 8, hour: 9, min: 20, userIdx: 4, status: "delivered", payStatus: "paid", itemCount: 1, qty1: 4, qty2: 0, discount: 0, shipping: 50 },
    { day: 9, hour: 13, min: 10, userIdx: 5, status: "delivered", payStatus: "paid", itemCount: 2, qty1: 1, qty2: 1, discount: 0, shipping: 50 },
    { day: 11, hour: 15, min: 30, userIdx: 0, status: "delivered", payStatus: "paid", itemCount: 3, qty1: 2, qty2: 1, discount: 30, shipping: 0 },
    { day: 13, hour: 18, min: 15, userIdx: 1, status: "delivered", payStatus: "paid", itemCount: 2, qty1: 3, qty2: 1, discount: 0, shipping: 50 },
    { day: 15, hour: 10, min: 0, userIdx: 2, status: "delivered", payStatus: "paid", itemCount: 1, qty1: 2, qty2: 0, discount: 0, shipping: 50 },
    { day: 17, hour: 12, min: 45, userIdx: 3, status: "delivered", payStatus: "paid", itemCount: 2, qty1: 2, qty2: 3, discount: 40, shipping: 0 },
    { day: 18, hour: 17, min: 20, userIdx: 4, status: "delivered", payStatus: "paid", itemCount: 3, qty1: 1, qty2: 2, discount: 0, shipping: 50 },
    { day: 20, hour: 8, min: 30, userIdx: 5, status: "delivered", payStatus: "paid", itemCount: 2, qty1: 4, qty2: 1, discount: 25, shipping: 0 },
    { day: 22, hour: 14, min: 15, userIdx: 0, status: "delivered", payStatus: "paid", itemCount: 1, qty1: 5, qty2: 0, discount: 0, shipping: 50 },
    { day: 23, hour: 16, min: 50, userIdx: 1, status: "delivered", payStatus: "paid", itemCount: 2, qty1: 2, qty2: 2, discount: 35, shipping: 0 },
    { day: 25, hour: 11, min: 40, userIdx: 2, status: "delivered", payStatus: "paid", itemCount: 3, qty1: 2, qty2: 1, discount: 0, shipping: 50 },
    { day: 26, hour: 13, min: 25, userIdx: 3, status: "shipped", payStatus: "paid", itemCount: 2, qty1: 1, qty2: 3, discount: 0, shipping: 50 },
    { day: 27, hour: 19, min: 10, userIdx: 4, status: "shipped", payStatus: "paid", itemCount: 2, qty1: 3, qty2: 1, discount: 20, shipping: 0 },
    { day: 28, hour: 10, min: 5, userIdx: 5, status: "shipped", payStatus: "paid", itemCount: 1, qty1: 2, qty2: 0, discount: 0, shipping: 50 },
    { day: 29, hour: 15, min: 40, userIdx: 0, status: "processing", payStatus: "paid", itemCount: 2, qty1: 2, qty2: 2, discount: 0, shipping: 50 },
    { day: 30, hour: 18, min: 0, userIdx: 1, status: "cancelled", payStatus: "refunded", itemCount: 2, qty1: 1, qty2: 1, discount: 0, shipping: 50 },
  ];

  console.log("📦 Creating 20 orders for September 2026...");

  let createdCount = 0;
  let totalRevenue = 0;

  for (let i = 0; i < orderConfigs.length; i++) {
    const cfg = orderConfigs[i];
    const orderDate = new Date(2026, 8, cfg.day, cfg.hour, cfg.min, 0); // Month 8 is September in 0-indexed JS Date
    const userObj = users[cfg.userIdx % users.length];
    const dayStr = String(cfg.day).padStart(2, "0");
    const orderNum = `RS-202609${dayStr}-${String(i + 1).padStart(3, "0")}`;

    // Select 1 to 3 items from catalog
    const chosenItems: any[] = [];
    const item1 = catalogPool[i % catalogPool.length];
    chosenItems.push({
      ...item1,
      quantity: cfg.qty1,
      totalPrice: item1.unitPrice * cfg.qty1,
    });

    if (cfg.itemCount >= 2 && cfg.qty2 > 0) {
      const item2 = catalogPool[(i + 3) % catalogPool.length];
      chosenItems.push({
        ...item2,
        quantity: cfg.qty2,
        totalPrice: item2.unitPrice * cfg.qty2,
      });
    }

    if (cfg.itemCount >= 3) {
      const item3 = catalogPool[(i + 7) % catalogPool.length];
      chosenItems.push({
        ...item3,
        quantity: 1,
        totalPrice: item3.unitPrice * 1,
      });
    }

    const subtotal = chosenItems.reduce((acc, itm) => acc + itm.totalPrice, 0);
    const totalAmount = Math.max(0, subtotal - cfg.discount + cfg.shipping);

    if (cfg.status !== "cancelled") {
      totalRevenue += totalAmount;
    }

    // Create Order with exact September date
    const order = await prisma.order.create({
      data: {
        uuid: crypto.randomUUID(),
        orderNumber: orderNum,
        userId: userObj.id,
        order_status: cfg.status as any,
        payment_status: cfg.payStatus as any,
        subtotal: subtotal,
        discountAmount: cfg.discount,
        taxAmount: 0,
        shipping_charge: cfg.shipping,
        totalAmount: totalAmount,
        notes: `Test order #${i + 1} for September 2026 Analytics`,
        placed_at: orderDate,
        createdAt: orderDate,
        updatedAt: orderDate,
        is_active: true,
        created_by: userObj.id,
        updated_by: userObj.id,
      },
    });

    // Create Shipping & Billing Addresses
    const prof = userObj.profile;
    await prisma.orderAddress.createMany({
      data: [
        {
          uuid: crypto.randomUUID(),
          orderId: order.id,
          type: "shipping",
          full_name: prof.name,
          phone: prof.phone,
          address_line1: `Door No. ${10 + i}, Anna Salai, 2nd Cross Street`,
          address_line2: `${prof.city} Central`,
          landmark: "Near Gandhi Statue",
          city: prof.city,
          state: prof.state,
          pincode: prof.pincode,
          country: "India",
          createdAt: orderDate,
          updated_at: orderDate,
          is_active: true,
          created_by: userObj.id,
          updated_by: userObj.id,
        },
        {
          uuid: crypto.randomUUID(),
          orderId: order.id,
          type: "billing",
          full_name: prof.name,
          phone: prof.phone,
          address_line1: `Door No. ${10 + i}, Anna Salai, 2nd Cross Street`,
          address_line2: `${prof.city} Central`,
          landmark: "Near Gandhi Statue",
          city: prof.city,
          state: prof.state,
          pincode: prof.pincode,
          country: "India",
          createdAt: orderDate,
          updated_at: orderDate,
          is_active: true,
          created_by: userObj.id,
          updated_by: userObj.id,
        },
      ],
    });

    // Create Order Items
    await prisma.orderItem.createMany({
      data: chosenItems.map((itm) => ({
        uuid: crypto.randomUUID(),
        orderId: order.id,
        productId: itm.productId,
        variantId: itm.variantId,
        variantUnitPriceId: itm.variantUnitPriceId,
        product_name_snapshot: itm.productName,
        variant_snapshot: `${itm.variantName} (${itm.packSize})`,
        sku_snapshot: itm.sku,
        quantity: itm.quantity,
        unit_price: itm.unitPrice,
        discount_amount: 0,
        tax_amount: 0,
        total_price: itm.totalPrice,
        createdAt: orderDate,
        updated_at: orderDate,
        is_active: true,
        created_by: userObj.id,
        updated_by: userObj.id,
      })),
    });

    // Create Status History
    await prisma.order_status_history.create({
      data: {
        order_id: order.id,
        status: cfg.status as any,
        note: cfg.status === "delivered"
          ? "Package delivered successfully to customer"
          : cfg.status === "shipped"
          ? "Package handed over to courier partner"
          : cfg.status === "processing"
          ? "Order packed and ready for dispatch"
          : "Order cancelled upon customer request",
        changed_by: userObj.id,
        created_at: orderDate,
        updated_at: orderDate,
        is_active: true,
        created_by: userObj.id,
        updated_by: userObj.id,
      },
    });

    createdCount++;
    console.log(`  [${createdCount}/20] Created ${orderNum} on ${orderDate.toLocaleDateString("en-IN")} — Total: ₹${totalAmount} (${cfg.status.toUpperCase()})`);
  }

  console.log("\n🎉 --- Seeding Complete ---");
  console.log(`Total Orders Created: ${createdCount}`);
  console.log(`Total September Revenue: ₹${totalRevenue.toFixed(2)}`);
  console.log("Admin Dashboard 'Last Month' chart and order lists will now display full data points!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
