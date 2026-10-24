"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/admin/data-table/DataTable";
import { BulkActionsBar } from "@/components/admin/data-table/BulkActionsBar";
import { exportToExcel } from "@/lib/excel-export";
import { ExportExcelButton } from "@/components/admin/ExportExcelButton";
import { EXPORT_PRESETS } from "@/lib/export-presets";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  AdminPageHeader,
  AdminContent,
} from "@/components/admin/AdminPageHeader";
import { FormModal } from "@/components/common/FormModal";
import { SearchInput } from "@/components/ui/search-input";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import {
  useBanners,
  useBannerPositions,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  bannerApi,
} from "@/features/banners/hooks";
import { BannerForm } from "@/features/banners/components";
import {
  parseVideoUrl,
  getVideoThumbnailUrl,
} from "@/lib/utils/video-url.util";
import {
  getBannerTypeConfig,
  getBannerTypeLabel,
} from "@/features/banners/constants/banner-types";
import type { BannerDto } from "@/features/banners/types";
import { Video } from "lucide-react";

export default function AdminBannersPage() {
  const [search, setSearch] = useState("");
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<BannerDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    uuid: string;
    title: string;
  } | null>(null);

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedRows, setSelectedRows] = useState<BannerDto[]>([]);

  useEffect(() => {
    setPage(1);
    setSelectedRowIds({});
    setSelectedRows([]);
  }, [search, selectedPositionFilter, page, pageSize]);

  // Main banners query
  const { data, isLoading, error, refetch } = useBanners({
    page,
    limit: pageSize,
    search: search || undefined,
    bannerPositionId: selectedPositionFilter || undefined,
  });

  // Reference queries for banner positions dropdown
  const { data: positionsData } = useBannerPositions({ limit: 100 });

  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();

  const handleClearFilters = () => {
    setSearch("");
    setSelectedPositionFilter("");
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== "" || selectedPositionFilter !== "";

  const banners = data?.data ?? [];
  const positions = positionsData?.data ?? [];

  const positionOptions = useMemo(() => {
    return positions.map((p) => ({
      value: p.id,
      label: getBannerTypeLabel(p.slug, p.name),
      slug: p.slug,
    }));
  }, [positions]);

  const positionFilterOptions = useMemo(() => {
    return [{ value: "", label: "All Banner Types" }, ...positionOptions];
  }, [positionOptions]);

  const formatDateDisplay = (dateVal: unknown): string => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal as string | Date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const columns: ColumnDef<BannerDto>[] = [
    {
      accessorKey: "imageUrl",
      header: "Preview",
      cell: ({ row }) => {
        const { imageUrl, videoUrl, thumbnailUrl, mediaType, bannerPosition } =
          row.original;
        const config = getBannerTypeConfig(bannerPosition?.slug);
        const frameClassName =
          config.image?.thumbnailClassName ?? "aspect-[3/1] w-28";

        if (mediaType === "video") {
          // Reels can be an uploaded file or a link to a hosted video. Only a
          // file plays in a <video> tag; providers like YouTube are previewed
          // through their poster image instead.
          const parsedVideo = parseVideoUrl(videoUrl);
          const posterUrl =
            thumbnailUrl ||
            imageUrl ||
            getVideoThumbnailUrl(videoUrl) ||
            undefined;
          const isPlayableFile = parsedVideo?.kind === "file";

          return (
            <div className="relative flex aspect-[9/16] w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]">
              {isPlayableFile && videoUrl ? (
                <video
                  // Seek a fraction in so browsers paint a real first frame
                  // instead of a blank box when there is no poster image.
                  src={posterUrl ? videoUrl : `${videoUrl}#t=0.1`}
                  poster={posterUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={row.original.title || "Banner"}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <Video className="h-4 w-4 text-[var(--color-neutral-400)]" />
              )}
            </div>
          );
        }

        return (
          <div
            className={`relative ${frameClassName} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]`}
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={row.original.title || "Banner"}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <span className="text-[10px] text-[var(--color-neutral-400)]">
                No image
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="min-w-[160px]">
          <p className="font-semibold text-[var(--color-neutral-900)]">
            {row.original.title || "Untitled Banner"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "bannerPosition",
      header: "Banner Type",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md bg-[var(--color-primary-50)] px-2 py-1 text-xs font-medium text-[var(--color-primary-700)] ring-1 ring-inset ring-[var(--color-primary-700)]/10">
          {getBannerTypeLabel(
            row.original.bannerPosition?.slug,
            row.original.bannerPosition?.name
          )}
        </span>
      ),
    },
    {
      accessorKey: "schedule",
      header: "Schedule",
      cell: ({ row }) => {
        const starts = formatDateDisplay(row.original.startsAt);
        const ends = formatDateDisplay(row.original.endsAt);

        if (!starts && !ends) {
          return (
            <span className="text-xs text-[var(--color-neutral-500)]">
              Always Active
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-neutral-600)]">
            <Calendar className="h-3.5 w-3.5 text-[var(--color-neutral-400)]" />
            <span>
              {starts || "Now"} — {ends || "Forever"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "success" : "secondary"}
          className="text-xs"
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const banner = row.original;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedBanner(banner);
                setIsEditOpen(true);
              }}
              className="h-8 w-8 text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] hover:bg-[var(--color-neutral-100)]"
              title="Edit Banner"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setDeleteTarget({
                  uuid: banner.id,
                  title: banner.title || "Untitled Banner",
                })
              }
              className="h-8 w-8 text-[var(--color-error-500)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-700)]"
              title="Delete Banner"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading && !data) {
    return <AdminTableSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load banners"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col">
      <AdminPageHeader
        title="Banners"
        description="Manage hero, offer, popup and reels banners shown across the storefront."
      />

      <AdminContent className="flex-1">
        <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--color-background)] py-1 rounded-2xl">
          {/* Top Bar: Search, Position Filter, Add Button */}
          <div className="flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                placeholder="Search banners by title..."
                value={search}
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                className="w-full max-w-md"
              />

              <div className="w-full sm:w-64">
                <Select
                  value={selectedPositionFilter}
                  onChange={(e) => {
                    setSelectedPositionFilter(e.target.value);
                    setPage(1);
                  }}
                  options={positionFilterOptions}
                  placeholder="All Banner Types"
                  className="h-11 rounded-xl"
                />
              </div>

              {hasActiveFilters && <ClearFiltersButton onClick={handleClearFilters} />}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <ExportExcelButton
                data={banners}
                fetchData={async () => {
                  const res = await bannerApi.getBanners({
                    page: 1,
                    limit: 10000,
                    search: search.trim() || undefined,
                    bannerPositionId: selectedPositionFilter || undefined,
                  });
                  return res?.data ?? [];
                }}
                totalCount={data?.meta?.total ?? banners.length}
                filename="banners"
                sheetName="Banners"
                columns={EXPORT_PRESETS.banners}
              />

              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-11 rounded-xl bg-[var(--color-secondary-600)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-secondary-700)] shadow-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Banner
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="mt-6 flex-1 min-h-0 min-w-0 flex flex-col">
            <BulkActionsBar
              selectedCount={selectedRows.length}
              entityName="banners"
              filterNotice={search ? `Filtered by "${search}"` : undefined}
              onClearSelection={() => {
                setSelectedRowIds({});
                setSelectedRows([]);
              }}
              onExport={() => {
                exportToExcel({
                  filename: "selected_banners",
                  sheetName: "Selected Banners",
                  data: selectedRows,
                  columns: EXPORT_PRESETS.banners,
                });
              }}
            />

            <DataTable
              columns={columns}
              data={banners}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              page={data?.meta?.page ?? page}
              totalPages={data?.meta?.totalPages ?? Math.max(1, Math.ceil((data?.meta?.total ?? banners.length) / pageSize))}
              totalItems={data?.meta?.total ?? banners.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              selectedRowIds={selectedRowIds}
              onRowSelectionChange={(newSelection, items) => {
                setSelectedRowIds(newSelection);
                setSelectedRows(items);
              }}
              getRowId={(row) => String(row.id)}
              className="bg-white"
            />
          </div>
        </div>
      </AdminContent>

      {/* CREATE MODAL */}
      <FormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Banner"
        description="Pick a banner type, then add the media and schedule it needs."
        size="lg"
      >
        <BannerForm
          bannerPositions={positionOptions}
          isLoading={createMutation.isPending}
          submitLabel="Save Banner"
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={async (formData) => {
            await createMutation.mutateAsync(formData);
            setIsCreateOpen(false);
          }}
        />
      </FormModal>

      {/* EDIT MODAL */}
      <FormModal
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedBanner(null);
        }}
        title="Edit Banner"
        description="Update the banner media, link, type or schedule."
        size="lg"
      >
        {selectedBanner && (
          <BannerForm
            initialData={selectedBanner}
            bannerPositions={positionOptions}
            isLoading={updateMutation.isPending}
            submitLabel="Update Banner"
            onCancel={() => {
              setIsEditOpen(false);
              setSelectedBanner(null);
            }}
            onSubmit={async (formData) => {
              await updateMutation.mutateAsync({
                uuid: selectedBanner.id,
                data: formData,
              });
              setIsEditOpen(false);
              setSelectedBanner(null);
            }}
          />
        )}
      </FormModal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.uuid);
            setDeleteTarget(null);
          }
        }}
        title="Delete Banner"
        description={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete Banner"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
