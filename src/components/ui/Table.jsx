import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

const shimmer = 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer';

export const Table = ({
    columns,
    data,
    currentPage = 1,
    pageSize = 10,
    onPageChange,
    onEdit,
    onDelete,
    loading = false,
    skeletonRows = 5,
    emptyState,
    variant = 'default',   // 'default' | 'compact' | 'striped' | 'borderless'
    onRowClick,
    rowClassName,          // (row, index) => string — for conditional row styles
    className = ''
}) => {
    const totalPages = Math.ceil((data?.length || 0) / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = data?.slice(startIndex, startIndex + pageSize) || [];

    const isCompact = variant === 'compact';
    const isStriped = variant === 'striped';
    const isBorderless = variant === 'borderless';

    const cellPad = isCompact ? 'px-4 py-2.5' : 'px-5 py-4';
    const headPad = isCompact ? 'px-4 py-3' : 'px-5 py-4';
    const headTextSize = isCompact ? 'text-[11px]' : 'text-xs';

    const context = { onEdit, onDelete };

    const outerClass = isBorderless
        ? `overflow-hidden ${className}`
        : `bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden ${className}`;

    return (
        <div className={outerClass}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`${headPad} ${headTextSize} font-medium text-slate-400 uppercase tracking-wider ${
                                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                                    } ${col.width ? `w-${col.width}` : ''} ${col.sticky === 'right' ? `sticky ${col.stickyOffset || 'right-0'} bg-slate-50/80 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]` : ''}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: skeletonRows }).map((_, i) => (
                                <tr key={i} className="bg-white">
                                    {columns.map((col) => (
                                        <td key={col.key} className={cellPad}>
                                            <div className={`h-4 rounded ${shimmer} ${
                                                col.align === 'center' ? 'mx-auto w-2/3' :
                                                col.align === 'right' ? 'ml-auto w-1/2' : 'w-3/4'
                                            }`} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-16 text-center">
                                    <div className="text-slate-400">
                                        <p className="text-lg font-medium mb-1">
                                            {emptyState?.title || 'No data found'}
                                        </p>
                                        <p className="text-sm">
                                            {emptyState?.description || 'Try adjusting your search query'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, idx) => {
                                const rowBg = isStriped && idx % 2 !== 0 ? 'bg-slate-50/50' : 'bg-white';
                                const extraClass = rowClassName ? rowClassName(row, idx) : '';
                                return (
                                    <tr
                                        key={row.id ?? idx}
                                        onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                                        className={`${rowBg} hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${extraClass}`}
                                    >
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={`${cellPad} text-sm ${
                                                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                                                } ${col.sticky === 'right' ? `sticky ${col.stickyOffset || 'right-0'} ${rowBg} shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]` : ''}`}
                                            >
                                                {col.render ? col.render(row[col.key], row, context) : (row[col.key] ?? '—')}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && totalPages > 1 && onPageChange && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Showing {paginatedData.length === 0 ? 0 : startIndex + 1}–
                        {Math.min(startIndex + pageSize, data.length)} of {data.length} items
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, idx) =>
                                p === '...' ? (
                                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">...</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                            currentPage === p
                                                ? 'bg-indigo-600 border-indigo-600 text-white font-medium'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ColumnTemplates = {
    // Name + avatar initial + optional subtitle row
    avatarInfo: (key, label, subtitleKey, opts = {}) => ({
        key,
        label,
        render: (value, row) => (
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${opts.avatarClass || 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                    {String(value || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{value}</div>
                    {subtitleKey && (
                        <div className="text-sm text-slate-400 truncate">{row[subtitleKey]}</div>
                    )}
                </div>
            </div>
        ),
    }),

    // Dot + label status pill
    status: (key, label, colorMap = {}) => ({
        key,
        label,
        align: 'center',
        render: (value) => {
            const colors = {
                active: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
                pending: { dot: 'bg-amber-500', text: 'text-amber-600' },
                inactive: { dot: 'bg-slate-400', text: 'text-slate-500' },
                completed: { dot: 'bg-blue-500', text: 'text-blue-600' },
                archived: { dot: 'bg-slate-300', text: 'text-slate-400' },
                rejected: { dot: 'bg-red-400', text: 'text-red-600' },
                approved: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
                ...colorMap,
            };
            const color = colors[value?.toLowerCase()] || colors.inactive;
            return (
                <div className="flex items-center justify-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                    <span className={`text-sm font-medium ${color.text} capitalize`}>{value || '—'}</span>
                </div>
            );
        },
    }),

    // Pill badge (employee type, priority, etc.)
    badge: (key, label, colorMap = {}) => ({
        key,
        label,
        render: (value) => {
            const colors = {
                'Full-time': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'Part-time': 'bg-blue-50 text-blue-700 border-blue-200',
                'Intern': 'bg-amber-50 text-amber-700 border-amber-200',
                'Contractor': 'bg-slate-100 text-slate-700 border-slate-200',
                ...colorMap,
            };
            const colorClass = colors[value] || 'bg-slate-100 text-slate-700 border-slate-200';
            return value ? (
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                    {value}
                </span>
            ) : <span className="text-slate-400">—</span>;
        },
    }),

    // Plain text column
    text: (key, label, align = 'left') => ({
        key,
        label,
        align,
    }),

    // Right-aligned numeric value with optional formatter
    number: (key, label, fmt = (v) => v) => ({
        key,
        label,
        align: 'right',
        render: (value) => (
            <span className="tabular-nums text-slate-700">{fmt(value) ?? '—'}</span>
        ),
    }),

    // Date with optional format function
    date: (key, label, fmt = (v) => v ? new Date(v).toLocaleDateString() : '—') => ({
        key,
        label,
        render: (value) => (
            <span className="text-slate-600 tabular-nums">{fmt(value)}</span>
        ),
    }),

    // Array of string tags as chips
    tags: (key, label) => ({
        key,
        label,
        render: (value) => {
            const items = Array.isArray(value) ? value : [];
            if (items.length === 0) return <span className="text-slate-400">—</span>;
            return (
                <div className="flex flex-wrap gap-1">
                    {items.map((tag, i) => (
                        <span key={i} className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {tag}
                        </span>
                    ))}
                </div>
            );
        },
    }),

    // Currency value (right-aligned, formatted)
    currency: (key, label, symbol = '₹') => ({
        key,
        label,
        align: 'right',
        render: (value) => (
            <span className="font-medium text-slate-800 tabular-nums">
                {symbol}{Number(value || 0).toLocaleString('en-IN')}
            </span>
        ),
    }),

    // Edit + Delete action buttons — uses onEdit/onDelete from Table props via context
    actions: (opts = {}) => ({
        key: opts.key || '_actions',
        label: opts.label || 'Actions',
        align: 'right',
        sticky: opts.sticky,
        stickyOffset: opts.stickyOffset,
        render: (_, row, ctx) => (
            <div className="flex items-center justify-end gap-1">
                {ctx?.onEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); ctx.onEdit(row); }}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}
                {ctx?.onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); ctx.onDelete(row); }}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                {opts.extra && opts.extra(row, ctx)}
            </div>
        ),
    }),
};

export default Table;
