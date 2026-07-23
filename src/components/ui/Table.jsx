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
    variant = 'default',   // 'default' | 'compact' | 'striped' | 'borderless' | 'v1'
    onRowClick,
    rowClassName,          // (row, index) => string — for conditional row styles
    className = '',
    title,                 // optional card-header title (v1)
    count,                 // optional count badge shown next to the title
    headerAction,          // optional node rendered on the right of the header
    // NEW
    expandedRowId,
    getRowId = (row) => row.id,
    renderExpandedRow,
}) => {
    const totalPages = Math.ceil((data?.length || 0) / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = data?.slice(startIndex, startIndex + pageSize) || [];

    const isCompact = variant === 'compact';
    const isStriped = variant === 'striped';
    const isBorderless = variant === 'borderless';
    const isV1 = variant === 'v1';   // airy, sentence-case, card-header (Untitled-UI style)

    const cellPad = isCompact ? 'px-4 py-2' : isV1 ? 'px-5 py-3.5' : 'px-4 py-2.5';
    const headPad = isCompact ? 'px-4 py-2.5' : isV1 ? 'px-5 py-3' : 'px-4 py-2.5';
    const headTextSize = isCompact ? 'text-[11px]' : isV1 ? 'text-xs' : 'text-[11px]';
    const headCase = isV1 ? 'normal-case tracking-normal text-slate-600 dark:text-zinc-300' : 'uppercase tracking-wider text-slate-400 dark:text-zinc-500';
    const headWeight = isV1 ? 'font-semibold' : 'font-medium';
    const theadBg = isV1 ? 'bg-slate-50 dark:bg-[#161616]' : 'bg-slate-50/80 dark:bg-white/[0.02]';

    const context = { onEdit, onDelete };

    const outerClass = isBorderless
        ? `${className}`
        : `bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-200/60 dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${isV1 ? 'overflow-hidden' : ''} ${className}`;

    return (
        <div className={outerClass}>
            {title && (
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{title}</h3>
                        {count != null && (
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-neutral-700 dark:text-zinc-400">{count}</span>
                        )}
                    </div>
                    {headerAction}
                </div>
            )}
            <div className="overflow-visible">
                <table className="w-full table-fixed border-separate border-spacing-0">
                    <thead className={`${theadBg} border-b border-slate-100 dark:border-neutral-800`}>
                        <tr>
                            {columns.map((col, cIdx) => (
                                <th
                                    key={col.key}
                                    className={`${headPad} ${headTextSize} ${headWeight} ${headCase} whitespace-nowrap ${cIdx === 0 ? 'rounded-tl-2xl' : cIdx === columns.length - 1 ? 'rounded-tr-2xl' : ''
                                        } ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                                        } ${col.width ? (col.width.startsWith('w-') ? col.width : `w-${col.width}`) : ''} ${col.sticky === 'right' ? `sticky ${col.stickyOffset || 'right-0'} bg-slate-50/80 dark:bg-[#161616] shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]` : ''}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                        {loading ? (
                            Array.from({ length: skeletonRows }).map((_, i) => (
                                <tr key={i} className="bg-white">
                                    {columns.map((col) => (
                                        <td key={col.key} className={cellPad}>
                                            <div className={`h-4 rounded ${shimmer} ${col.align === 'center' ? 'mx-auto w-2/3' :
                                                col.align === 'right' ? 'ml-auto w-1/2' : 'w-3/4'
                                                }`} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-16 text-center">
                                    <div className="text-slate-400 dark:text-zinc-500">
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
                                const rowBg = isStriped && idx % 2 !== 0 ? 'bg-slate-50/50 dark:bg-[#161616]' : 'bg-white dark:bg-[#0f0f0f]';
                                const extraClass = rowClassName ? rowClassName(row, idx) : '';
                                const isLast = idx === paginatedData.length - 1;
                                return (
                                    <React.Fragment key={getRowId(row) ?? idx}>
                                        <tr
                                            onClick={onRowClick ? () => onRowClick(row, idx) : undefined}
                                            className={`${rowBg} hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                                } ${extraClass}`}
                                        >
                                            {columns.map((col, cIdx) => (
                                                <td
                                                    key={col.key}
                                                    className={`${cellPad} text-sm ${isLast && cIdx === 0 ? 'rounded-bl-2xl' : isLast && cIdx === columns.length - 1 ? 'rounded-br-2xl' : ''
                                                        } ${col.align === 'center'
                                                            ? 'text-center'
                                                            : col.align === 'right'
                                                                ? 'text-right'
                                                                : 'text-left'
                                                        } ${col.sticky === 'right'
                                                            ? `sticky ${col.stickyOffset || 'right-0'} ${rowBg} shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.1)]`
                                                            : ''
                                                        }`}
                                                >
                                                    {col.render ? col.render(row[col.key], row, context) : row[col.key] ?? '—'}
                                                </td>
                                            ))}
                                        </tr>
                                        {renderExpandedRow &&
                                            expandedRowId === getRowId(row) && (
                                                <tr>
                                                    <td colSpan={columns.length} className="p-0">
                                                        {renderExpandedRow(row)}
                                                    </td>
                                                </tr>
                                            )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && totalPages > 1 && onPageChange && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-neutral-800">
                    <p className="text-sm text-slate-500 dark:text-zinc-400">
                        Showing {paginatedData.length === 0 ? 0 : startIndex + 1}–
                        {Math.min(startIndex + pageSize, data.length)} of {data.length} items
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-neutral-800 dark:text-zinc-300 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${currentPage === p
                                            ? 'bg-blue-600 border-blue-600 text-white font-medium'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-neutral-800 dark:text-zinc-300 dark:hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-neutral-800 dark:text-zinc-300 dark:hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const formatDateDeterministic = (v) => {
    if (!v) return '—';
    const datePart = String(v).split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${day}/${month}/${year}`;
    }
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return v;
    }
};

export const ColumnTemplates = {
    // Name + avatar initial + optional subtitle row
    avatarInfo: (key, label, subtitleKey, opts = {}) => ({
        key,
        label,
        render: (value, row) => (
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${opts.avatarClass || 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
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
    date: (key, label, fmt = (v) => formatDateDeterministic(v)) => ({
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
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
