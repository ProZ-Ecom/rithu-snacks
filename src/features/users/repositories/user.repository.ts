import crypto from "crypto";
import { db } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma";
import type { GetUserParams } from "../types";

const userSelect = {
  id: true,
  uuid: true,
  cust_id: true,
  name: true,
  email: true,
  phone: true,
  roleId: true,
  status: true,
  is_active: true,
  is_blocked: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
  deleted_at: true,
  role: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.UserSelect;

function formatUser<T extends Record<string, any>>(user: T) {
  if (!user) return user;
  const userUuid = user.uuid || String(user.id);
  return {
    ...user,
    id: userUuid, // Expose UUID as primary "id" property to frontend
    uuid: userUuid,
    internalId: typeof user.id === "bigint" ? Number(user.id) : user.id,
    roleId: typeof user.roleId === "bigint" ? Number(user.roleId) : user.roleId,
    custId: user.cust_id ?? null,
    roleName: user.role?.name,
    isActive: Boolean(user.is_active),
    isBlocked: user.is_blocked !== null && Number(user.is_blocked) > 0,
  };
}

function buildUserWhere(params: GetUserParams): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (params.status) {
    where.status = params.status as Prisma.Enumusers_statusFilter["equals"];
  }

  if (params.roleId) {
    where.roleId = BigInt(params.roleId);
  }

  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { email: { contains: params.search } },
      { phone: { contains: params.search } },
    ];
  }

  return where;
}

export const userRepository = {
  async findAll(params: GetUserParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const where = buildUserWhere(params);

    const [data, total] = await Promise.all([
      db.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return {
      data: data.map((user) => formatUser(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(idOrUuidOrEmail: string | number | bigint) {
    if (!idOrUuidOrEmail) return null;

    const identifier = String(idOrUuidOrEmail).trim();
    if (!identifier) return null;

    const isNumeric = /^\d+$/.test(identifier);

    const user = await db.user.findFirst({
      where: {
        OR: [
          { uuid: identifier },
          { email: identifier },
          ...(isNumeric ? [{ id: BigInt(identifier) }] : []),
        ],
      },
      select: userSelect,
    });
    return user ? formatUser(user) : null;
  },

  async findByEmail(email: string) {
    const user = await db.user.findUnique({
      where: { email },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });
    return user ? formatUser(user) : null;
  },

  async findByPhone(phone: string) {
    const user = await db.user.findFirst({
      where: { phone },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });
    return user ? formatUser(user) : null;
  },

  async create(data: Prisma.UserCreateInput) {
    const userToCreate = {
      ...data,
      uuid: data.uuid || crypto.randomUUID(),
    };

    const user = await db.user.create({
      data: userToCreate,
      select: userSelect,
    });
    return formatUser(user);
  },

  async update(idOrUuid: string | number | bigint, data: Prisma.UserUpdateInput) {
    const existing = await this.findById(idOrUuid);
    if (!existing) return null;

    const user = await db.user.update({
      where: { id: BigInt(existing.internalId) },
      data,
      select: userSelect,
    });
    return formatUser(user);
  },

  async delete(idOrUuid: string | number | bigint) {
    const existing = await this.findById(idOrUuid);
    if (!existing) return null;

    const deleted = await db.user.delete({
      where: { id: BigInt(existing.internalId) },
    });
    return formatUser(deleted);
  },

  async resetPassword(idOrUuid: string | number | bigint, hashedPassword: string) {
    const existing = await this.findById(idOrUuid);
    if (!existing) return null;

    const updated = await db.user.update({
      where: { id: BigInt(existing.internalId) },
      data: { password_hash: hashedPassword },
      select: { id: true, uuid: true },
    });
    return { id: updated.uuid || updated.id.toString() };
  },

  async count(where?: Prisma.UserWhereInput) {
    return db.user.count({ where });
  },
};
