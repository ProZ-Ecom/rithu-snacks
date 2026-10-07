import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function createClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
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
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const lastDayOfMonth = periodEnd.getDate();

  const orders = await prisma.order.findMany({
    where: {
      is_active: true,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    include: {
      items: {
        where: { is_active: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n📅 Daily Breakdown for September 2026 (${orders.length} total orders):`);

  for (let d = 1; d <= lastDayOfMonth; d++) {
    const sStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), d, 0, 0, 0, 0);
    const sEnd = new Date(periodStart.getFullYear(), periodStart.getMonth(), d, 23, 59, 59, 999);

    const dayOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= sStart.getTime() && t <= sEnd.getTime();
    });

    const revenue = dayOrders.reduce((sum, o) => (o.order_status !== "cancelled" ? sum + Number(o.totalAmount || 0) : sum), 0);
    const topProd = dayOrders[0]?.items?.[0]?.product_name_snapshot || "—";

    if (dayOrders.length > 0) {
      console.log(`  ⭐ Sep ${String(d).padStart(2, "0")}: ₹${revenue.toFixed(2).padStart(7)} | ${dayOrders.length} Order(s) | Top: ${topProd}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
