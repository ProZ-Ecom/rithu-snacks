"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  Shield,
  BarChart3,
  MessageCircle,
  Megaphone,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  BookOpen,
  Truck,
  Star,
  Crown,
  Receipt,
  Hash,
  type LucideIcon,
  Ruler,
  Layers,
  UserCheck,
  Mail,
  PackagePlus,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useSession } from "next-auth/react";
import { logoutUser } from "@/features/auth/api/auth.api";
import { Drawer } from "@/components/common/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: SidebarItem[];
  section?: string;
}

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    label: "Sales",
    href: "/admin/dashboard/sales",
    icon: ShoppingCart,
    section: "Operations",
    children: [
      { label: "Orders", href: "/admin/dashboard/orders", icon: ShoppingCart },
      { label: "Bulk Orders", href: "/admin/dashboard/bulk-orders", icon: PackagePlus },
      { label: "Customers", href: "/admin/dashboard/customers", icon: Users },
      { label: "Deliveries", href: "/admin/dashboard/delivery", icon: Truck },
    ],
  },
  {
    label: "Catalog",
    href: "/admin/dashboard/catalog",
    icon: Package,
    children: [
      { label: "Categories", href: "/admin/dashboard/categories", icon: FolderTree },
      { label: "Products", href: "/admin/dashboard/products", icon: Package },
      { label: "Items", href: "/admin/dashboard/variants", icon: Layers },
      { label: "Brands", href: "/admin/dashboard/brands", icon: Crown },
      // { label: "Attributes", href: "/admin/dashboard/attributes", icon: Tag },
      { label: "Units", href: "/admin/dashboard/units", icon: Ruler },
      { label: "Bulk Import", href: "/admin/dashboard/import", icon: PackagePlus },
    ],
  },
  {
    label: "Tax & Compliance",
    href: "/admin/dashboard/tax-compliance",
    icon: Receipt,
    children: [
      { label: "GST Rates", href: "/admin/dashboard/gst-rates", icon: Receipt },
      { label: "HSN Codes", href: "/admin/dashboard/hsn-codes", icon: Hash },
    ],
  },
  {
    label: "Marketing",
    href: "/admin/dashboard/marketing",
    icon: Tag,
    children: [
      { label: "Coupons", href: "/admin/dashboard/coupons", icon: Tag },
      { label: "Offers", href: "/admin/dashboard/offers", icon: Star },
      { label: "Banners", href: "/admin/dashboard/banners", icon: ImageIcon },
    ],
  },
  {
    label: "CMS",
    href: "/admin/dashboard/cms",
    icon: BookOpen,
    children: [
      { label: "Blogs", href: "/admin/dashboard/blogs", icon: BookOpen },
      { label: "FAQs", href: "/admin/dashboard/faqs", icon: HelpCircle },
      { label: "Contact List", href: "/admin/dashboard/contacts", icon: Mail },
    ],
  },
  {
    label: "Team & Access",
    href: "/admin/dashboard/team-access",
    icon: Shield,
    section: "Administration",
    children: [
      { label: "Staff", href: "/admin/dashboard/staff", icon: UserCheck },
      { label: "Users", href: "/admin/dashboard/users", icon: Users },
      // { label: "Roles", href: "/admin/dashboard/roles", icon: Shield },
      // { label: "Permissions", href: "/admin/dashboard/permissions", icon: Shield },
    ],
  },
  { label: "Reports", href: "/admin/dashboard/reports", icon: BarChart3 },
  {
    label: "WhatsApp",
    href: "/admin/dashboard/whatsapp",
    icon: MessageCircle,
    children: [
      { label: "Overview", href: "/admin/dashboard/whatsapp", icon: LayoutDashboard },
      { label: "Campaigns", href: "/admin/dashboard/whatsapp/campaigns", icon: Megaphone },
      { label: "Templates", href: "/admin/dashboard/whatsapp/templates", icon: Tag },
      { label: "Reports", href: "/admin/dashboard/whatsapp/reports", icon: BarChart3 },
    ],
  },
  { label: "Settings", href: "/admin/dashboard/settings", icon: Settings },
];

const activeRowClasses =
  "relative bg-white text-secondary-600 shadow-sm ring-1 ring-black/[0.04] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-secondary-600";
const inactiveRowClasses = "text-neutral-600 hover:bg-white/60 hover:text-neutral-900";

function IconChip({
  icon: Icon,
  active,
  size = "h-4 w-4",
  chipSize = "h-7 w-7",
}: {
  icon: LucideIcon;
  active: boolean;
  size?: string;
  chipSize?: string;
}) {
  return (
    <span
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-md transition-all duration-200",
        chipSize,
        active
          ? "bg-secondary-600 text-white shadow-sm"
          : "text-neutral-500 group-hover:bg-black/[0.04] group-hover:text-neutral-700"
      )}
    >
      <Icon className={size} />
    </span>
  );
}

function isRouteActive(href: string, pathname: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === "/admin/dashboard";
  }
  if (href === "/admin/dashboard/whatsapp") {
    return pathname === "/admin/dashboard/whatsapp";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarItemComponent({
  item,
  pathname,
  onNavigate,
  collapsed,
  onExpandSidebar,
}: {
  item: SidebarItem;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onExpandSidebar?: () => void;
}) {
  const isChildRouteActive = useMemo(() => {
    if (!item.children) return false;
    return item.children.some((child) => isRouteActive(child.href, pathname));
  }, [item.children, pathname]);

  const [isOpen, setIsOpen] = useState(isChildRouteActive);

  useEffect(() => {
    if (isChildRouteActive) {
      setIsOpen(true);
    }
  }, [isChildRouteActive]);

  const isActive = isRouteActive(item.href, pathname) || isChildRouteActive;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    if (collapsed) {
      return (
        <button
          title={item.label}
          onClick={() => {
            onExpandSidebar?.();
            setIsOpen(true);
          }}
          className={cn(
            "group flex w-full items-center justify-center rounded-lg py-2 transition-all duration-200 cursor-pointer",
            isActive ? activeRowClasses : inactiveRowClasses
          )}
        >
          <IconChip icon={item.icon} active={isActive} />
        </button>
      );
    }

    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-lg py-2 pl-2 pr-3 text-sm font-medium transition-all duration-200 cursor-pointer",
            isActive ? activeRowClasses : inactiveRowClasses
          )}
        >
          <IconChip icon={item.icon} active={isActive} />
          <span className={cn("flex-1 text-left", isActive && "font-semibold")}>{item.label}</span>
          <ChevronRight
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        </button>
        {isOpen && (
          <div className="mt-1 ml-[1.15rem] space-y-0.5 border-l border-neutral-300/70 pl-3">
            {item.children &&
              item.children.map((child) => {
                const childActive = isRouteActive(child.href, pathname);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200",
                      childActive
                        ? "bg-white text-secondary-600 font-semibold shadow-sm ring-1 ring-black/[0.04]"
                        : "text-neutral-600 hover:bg-white/60 hover:text-neutral-900 hover:translate-x-0.5"
                    )}
                  >
                    <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {child.label}
                  </Link>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-0" : "pl-2 pr-3",
        isActive ? activeRowClasses : inactiveRowClasses
      )}
    >
      <IconChip icon={item.icon} active={isActive} />
      {!collapsed && <span className={isActive ? "font-semibold" : undefined}>{item.label}</span>}
    </Link>
  );
}

function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      <Image
        src="/logo.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
      />
      {!collapsed && (
        <span className="flex flex-col">
          <span className="font-hanken text-secondary-600 text-base font-bold">
            {APP_NAME} Admin
          </span>
          <span className="text-xs text-neutral-500">Enterprise management</span>
        </span>
      )}
    </div>
  );
}

function SidebarNavigation({
  pathname,
  onNavigate,
  collapsed,
  onExpandSidebar,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onExpandSidebar?: () => void;
}) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isStaff = userRole === "STAFF";

  const navigationItems = useMemo(() => {
    return sidebarItems
      .map((item) => {
        if (!item.children) return item;
        const filteredChildren = item.children.filter((child) => {
          if (child.href === "/admin/dashboard/delivery") {
            return isStaff;
          }
          if (child.href === "/admin/dashboard/orders") {
            return !isStaff;
          }
          return true;
        });
        return { ...item, children: filteredChildren };
      })
      .filter((item) => !item.children || item.children.length > 0);
  }, [isStaff]);

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-hide px-3 pb-4">
      {navigationItems.map((item) => (
        <div key={item.href}>
          {item.section &&
            (collapsed ? (
              <div className="my-2.5 border-t border-neutral-300/60" />
            ) : (
              <p className="mt-4 mb-1.5 px-2.5 text-[10px] font-semibold tracking-wider text-neutral-500/80 uppercase">
                {item.section}
              </p>
            ))}
          <SidebarItemComponent
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
            onExpandSidebar={onExpandSidebar}
          />
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed?: boolean }) {
  const { data: session } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const name = session?.user?.name || "Admin";
  const role = (session?.user as { role?: string })?.role;
  const roleLabel = role ? role.charAt(0) + role.slice(1).toLowerCase() : "Administrator";

  const handleLogout = async () => {
    await logoutUser("/admin/login");
  };

  return (
    <div className="border-t border-neutral-300/70 p-3">
      {!collapsed ? (
        <Link
          href="/"
          title="Switch to Customer Storefront / Pages"
          className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/70 px-2.5 py-2.5 shadow-sm ring-1 ring-black/[0.04] hover:bg-white hover:ring-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-600 text-xs font-semibold text-white ring-2 ring-white group-hover:scale-105 transition-transform">
            {getInitials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-sm font-semibold text-neutral-800 group-hover:text-amber-900">{name}</p>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-700 shrink-0" />
            </div>
            <p className="truncate text-xs text-neutral-500 group-hover:text-amber-700/80">{roleLabel} · View Store →</p>
          </div>
        </Link>
      ) : (
        <Link
          href="/"
          title="Switch to Customer Storefront / Pages"
          className="mb-2 flex items-center justify-center rounded-xl p-2 hover:bg-white/70 transition-all cursor-pointer group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-600 text-xs font-semibold text-white ring-2 ring-white group-hover:scale-110 transition-transform">
            {getInitials(name)}
          </div>
        </Link>
      )}
      <button
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
        title={collapsed ? "Logout" : undefined}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg py-2 text-sm font-medium text-neutral-600 transition-all duration-200 cursor-pointer hover:bg-white/70 hover:text-secondary-600",
          collapsed ? "justify-center px-0" : "pl-2 pr-3"
        )}
      >
        <LogOut className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
        {!collapsed && "Logout"}
      </button>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        description="Are you sure you want to log out of the admin panel?"
        confirmText="Log Out"
        variant="destructive"
      />
    </div>
  );
}

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function AdminSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        side="left"
        title={<SidebarBrand />}
        className="w-[280px] max-w-[calc(100vw-2rem)] bg-neutral-50"
      >
        <div className="flex h-full flex-col">
          <SidebarNavigation pathname={pathname} onNavigate={onMobileClose} />
          <SidebarFooter />
        </div>
      </Drawer>
      <aside
        className={cn(
          "relative hidden h-screen flex-col border-r border-neutral-300/80 bg-secondary-100 shadow-[2px_0_12px_-4px_rgba(0,0,0,0.06)] transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-20 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 shadow-sm transition-all duration-200 hover:scale-110 hover:text-secondary-600 hover:shadow-md cursor-pointer"
        >
          <ChevronLeft
            className={cn("h-3.5 w-3.5 transition-transform duration-200", collapsed && "rotate-180")}
          />
        </button>
        <div
          className={cn(
            "border-b border-neutral-300/60 p-5 pb-4",
            collapsed && "flex justify-center px-3"
          )}
        >
          <Link href="/admin/dashboard" className="rounded-lg">
            <SidebarBrand collapsed={collapsed} />
          </Link>
        </div>
        <SidebarNavigation
          pathname={pathname}
          collapsed={collapsed}
          onExpandSidebar={onToggleCollapse}
        />
        <SidebarFooter collapsed={collapsed} />
      </aside>
    </>
  );
}

export { AdminSidebar };
