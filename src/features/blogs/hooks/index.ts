"use client";

import { useQuery } from "@tanstack/react-query";
import { blogKeys } from "@/lib/api/query-keys";
import { getBlogs, getBlog } from "../api/get-blogs";
import type { GetBlogsParams } from "../types";

export function useBlogs(params?: GetBlogsParams) {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.search) queryParams.search = params.search;
  if (params?.status) queryParams.status = params.status;

  return useQuery({
    queryKey: blogKeys.list(queryParams),
    queryFn: () => getBlogs(queryParams),
  });
}

export function useBlog(slugOrId: string | null) {
  return useQuery({
    queryKey: blogKeys.detail(slugOrId ?? ""),
    queryFn: () => getBlog(slugOrId!),
    enabled: !!slugOrId,
  });
}

export { getBlogs, getBlog } from "../api/get-blogs";
export { useCreateBlog, useUpdateBlog, useDeleteBlog } from "./use-blog-mutations";
