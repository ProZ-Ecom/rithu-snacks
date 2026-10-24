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
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const customerPassword = await bcrypt.hash("customer123", 12);

  // Helper to upsert role by slug
  const getOrCreateRole = async (name: string, slug: string, description: string) => {
    let role = await prisma.role.findFirst({ where: { slug } });
    if (!role) {
      role = await prisma.role.create({
        data: { name, slug, description },
      });
    }
    return role;
  };

  const adminRole = await getOrCreateRole("ADMIN", "admin", "Administrator with full access");
  const staffRole = await getOrCreateRole("STAFF", "staff", "Staff member with limited access");
  const customerRole = await getOrCreateRole("CUSTOMER", "customer", "Regular customer");

  console.log("Roles created");

  const permissions = [
    { name: "PRODUCT_VIEW", slug: "product-view", module: "PRODUCT" },
    { name: "PRODUCT_CREATE", slug: "product-create", module: "PRODUCT" },
    { name: "PRODUCT_UPDATE", slug: "product-update", module: "PRODUCT" },
    { name: "PRODUCT_DELETE", slug: "product-delete", module: "PRODUCT" },
    { name: "CATEGORY_VIEW", slug: "category-view", module: "CATEGORY" },
    { name: "CATEGORY_CREATE", slug: "category-create", module: "CATEGORY" },
    { name: "CATEGORY_UPDATE", slug: "category-update", module: "CATEGORY" },
    { name: "CATEGORY_DELETE", slug: "category-delete", module: "CATEGORY" },
    { name: "ORDER_VIEW", slug: "order-view", module: "ORDER" },
    { name: "ORDER_UPDATE", slug: "order-update", module: "ORDER" },
    { name: "USER_VIEW", slug: "user-view", module: "USER" },
    { name: "USER_UPDATE", slug: "user-update", module: "USER" },
  ];

  for (const perm of permissions) {
    let created = await prisma.permission.findFirst({ where: { slug: perm.slug } });
    if (!created) {
      created = await prisma.permission.create({ data: perm });
    }
    const existingRp = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionId: created.id },
    });
    if (!existingRp) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: created.id },
      });
    }
  }

  console.log("Permissions created and assigned to admin role");

  let adminUser = await prisma.user.findFirst({ where: { email: "admin@rithusnacks.com" } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        uuid: crypto.randomUUID(),
        name: "Admin",
        email: "admin@rithusnacks.com",
        password_hash: adminPassword,
        role: { connect: { id: adminRole.id } },
        status: "active",
        email_verified_at: new Date(),
      },
    });
  } else if (!adminUser.uuid) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { uuid: crypto.randomUUID() },
    });
  }

  let customerUser = await prisma.user.findFirst({ where: { email: "customer@example.com" } });
  if (!customerUser) {
    customerUser = await prisma.user.create({
      data: {
        uuid: crypto.randomUUID(),
        name: "John Customer",
        email: "customer@example.com",
        password_hash: customerPassword,
        role: { connect: { id: customerRole.id } },
        status: "active",
        email_verified_at: new Date(),
      },
    });
  } else if (!customerUser.uuid) {
    await prisma.user.update({
      where: { id: customerUser.id },
      data: { uuid: crypto.randomUUID() },
    });
  }

  console.log("Users created/updated with UUIDs");

  const defaultBannerPositions = [
    { name: "Home Hero Banner", slug: "home-hero", page: "home" },
    { name: "Home Offer Banner", slug: "home-offer", page: "home" },
    { name: "Home Popup Offer", slug: "home-popup-offer", page: "home" },
    { name: "Home Reels", slug: "home-reels", page: "home" },
  ];

  for (const position of defaultBannerPositions) {
    const existing = await prisma.banner_positions.findFirst({
      where: { slug: position.slug },
    });
    if (!existing) {
      await prisma.banner_positions.create({
        data: {
          uuid: crypto.randomUUID(),
          name: position.name,
          slug: position.slug,
          page: position.page,
          created_by: adminUser.id,
          updated_by: adminUser.id,
        },
      });
    }
  }
  console.log("Default banner positions created/verified");

  // Default Delivery Partners
  const stCourier = await prisma.delivery_partners.findFirst({
    where: { code: "ST_COURIER" },
  });
  if (!stCourier) {
    await prisma.delivery_partners.create({
      data: {
        name: "ST Courier",
        code: "ST_COURIER",
        contact_number: "+91 44 4000 0000",
        is_active: true,
        created_by: adminUser.id,
        updated_by: adminUser.id,
      },
    });
    console.log("ST Courier delivery partner seeded");
  }

  console.log("\n--- Seed Complete ---");
  console.log("Admin Login: admin@rithusnacks.com / admin123");
  console.log("Customer Login: customer@example.com / customer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
