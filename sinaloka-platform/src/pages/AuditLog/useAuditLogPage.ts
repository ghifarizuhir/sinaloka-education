import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogService, AuditLogQueryParams } from '@/src/services/audit-log.service';

export function useAuditLogPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [filters, setFilters] = useState<{
    action?: string;
    resource_type?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
  }>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryParams = useMemo<AuditLogQueryParams>(
    () => ({
      page,
      limit,
      ...filters,
      sort_order: 'desc' as const,
    }),
    [page, limit, filters],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditLogService.getAll(queryParams),
    placeholderData: (prev) => prev,
  });

  const updateFilter = (key: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({});
    setPage(1);
  };

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return {
    data: data?.data ?? [],
    meta: data?.meta ?? { total: 0, page: 1, limit: 25, totalPages: 0 },
    isLoading,
    isFetching,
    page,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    expandedId,
    toggleExpanded,
  };
}
