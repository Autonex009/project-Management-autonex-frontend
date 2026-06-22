import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2, Info } from 'lucide-react';

const VARIANTS = {
    danger: {
        icon: Trash2,
        iconWrap: 'bg-rose-50 text-rose-500',
        confirmBtn: 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400',
    },
    warning: {
        icon: AlertTriangle,
        iconWrap: 'bg-amber-50 text-amber-500',
        confirmBtn: 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300',
    },
    info: {
        icon: Info,
        iconWrap: 'bg-blue-50 text-blue-500',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
    },
};

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = '',
    details = null,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isPending = false,
}) {
    if (!isOpen) return null;

    const styles = VARIANTS[variant] || VARIANTS.danger;
    const Icon = styles.icon;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={isPending ? undefined : onClose}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {message && <p className="text-sm leading-relaxed text-slate-600">{message}</p>}

                    {details && details.length > 0 && (
                        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
                            {details.map((row) => (
                                <div key={row.label} className="flex items-center justify-between text-sm">
                                    <dt className="text-slate-500">{row.label}</dt>
                                    <dd className={`font-semibold ${row.highlight ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isPending}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${styles.confirmBtn}`}
                        >
                            {isPending ? 'Working...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
