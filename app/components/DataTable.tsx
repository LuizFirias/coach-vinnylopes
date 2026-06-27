import React, { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyState?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  pagination?: { pageSize: number };
}

export default function DataTable<T>({
  columns,
  data,
  onRowClick,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  emptyState,
  rowActions,
  pagination,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Search logic
  const filteredData = React.useMemo(() => {
    if (!searchable || !searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((row: any) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, searchable, searchTerm]);

  // Sort logic
  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    const sorted = [...filteredData].sort((a: any, b: any) => {
      let valA = a[sortKey];
      let valB = b[sortKey];
      
      // Fallback formatting/conversions if necessary
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortKey, sortAsc]);

  // Pagination logic
  const pageSize = pagination?.pageSize;
  const paginatedData = React.useMemo(() => {
    if (!pageSize) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = pageSize ? Math.ceil(sortedData.length / pageSize) : 1;

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {searchable && (
        <div className="flex-shrink-0">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full max-w-sm px-3 py-2 bg-surface-2 border border-border-subtle rounded-md text-xs text-text-primary placeholder:text-text-disabled focus:border-brand/40 outline-none transition-colors"
          />
        </div>
      )}

      <div className="overflow-x-auto w-full border border-border-subtle rounded-lg bg-surface-1 shadow-sm">
        <table className="min-w-full divide-y divide-border-subtle/50 text-left text-xs border-collapse">
          <thead className="bg-surface-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width }}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={cn(
                    "px-6 py-4.5 font-bold tracking-caps text-[10px]",
                    col.sortable && "cursor-pointer select-none hover:text-text-primary",
                    col.align === 'center' && "text-center",
                    col.align === 'right' && "text-right"
                  )}
                >
                  <div className={cn(
                    "flex items-center gap-1.5",
                    col.align === 'center' && "justify-center",
                    col.align === 'right' && "justify-end"
                  )}>
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-[10px] font-mono leading-none">
                        {sortAsc ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {rowActions && (
                <th scope="col" className="relative px-6 py-4.5">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/30 bg-surface-1">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    "group transition-colors border-l-[3px] border-transparent",
                    onRowClick && "cursor-pointer hover:border-brand",
                    "hover:bg-brand/5"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-6 py-4 text-text-primary font-medium",
                        col.align === 'center' && "text-center",
                        col.align === 'right' && "text-right"
                      )}
                    >
                      {col.render ? col.render(row) : (row as any)[col.key] || '—'}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-6 py-4 text-right align-middle">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {rowActions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-6 py-12 text-center text-text-tertiary">
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm font-semibold">Nenhum registro encontrado</p>
                      <p className="text-xs">Não existem dados para exibir nesta tabela.</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-surface-1 border border-border-subtle rounded-lg text-xs">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-border-subtle text-xs font-medium rounded-md text-text-primary bg-surface-2 hover:bg-surface-3 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-border-subtle text-xs font-medium rounded-md text-text-primary bg-surface-2 hover:bg-surface-3 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-text-secondary">
                Mostrando <span className="font-semibold text-text-primary">{(currentPage - 1) * pageSize + 1}</span> a{' '}
                <span className="font-semibold text-text-primary">
                  {Math.min(currentPage * pageSize, sortedData.length)}
                </span>{' '}
                de <span className="font-semibold text-text-primary">{sortedData.length}</span> registros
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border-subtle bg-surface-2 text-xs font-medium text-text-secondary hover:bg-surface-3 disabled:opacity-50"
                >
                  <span>Anterior</span>
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "relative inline-flex items-center px-4 py-2 border border-border-subtle text-xs font-medium",
                        isCurrent
                          ? "z-10 bg-brand/10 border-brand text-brand"
                          : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border-subtle bg-surface-2 text-xs font-medium text-text-secondary hover:bg-surface-3 disabled:opacity-50"
                >
                  <span>Próximo</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
