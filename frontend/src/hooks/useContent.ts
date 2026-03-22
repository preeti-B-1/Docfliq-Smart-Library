"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { apiClient } from "@/lib/api-client";
import type { ContentFilters, ContentListItem, PaginatedResponse } from "@/types";

interface UseContentResult {
  data: PaginatedResponse<ContentListItem> | null;
  isLoading: boolean;
  error: string | null;
}

export function useContent(filters: ContentFilters, token: string | null): UseContentResult {
  const [data, setData] = useState<PaginatedResponse<ContentListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersKey = JSON.stringify(filters);
  const latestKey = useRef(filtersKey);

  useEffect(() => {
    latestKey.current = filtersKey;
    const key = filtersKey;

    setIsLoading(true);
    setError(null);

    if (token) apiClient.setToken(token);

    apiClient
      .getContent(filters)
      .then((result) => {
        if (latestKey.current === key) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (latestKey.current === key) {
          setError(err instanceof Error ? err.message : "Failed to load content");
        }
      })
      .finally(() => {
        if (latestKey.current === key) {
          setIsLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, token]);

  return { data, isLoading, error };
}
