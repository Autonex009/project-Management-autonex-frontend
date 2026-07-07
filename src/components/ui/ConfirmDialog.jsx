import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2, Info } from 'lucide-react';
import Button from './Button';

const VARIANTS = {
    danger:  { icon: Trash2,         iconWrap: 'bg-rose-50 text-rose-500' },
    warning: { icon: AlertTriangle,   iconWrap: 'bg-amber-50 text-amber-500' },
    info:    { icon: Info,            iconWrap: 'bg-blue-50 text-blue-500' },
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
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={isPending}>
                        <X className="h-5 w-5" />
                    </Button>
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
                        <Button type="button" variant="cancel" onClick={onClose} disabled={isPending}>
                            {cancelText}
                        </Button>
                        <Button
                            type="button"
                            variant={variant === 'info' ? 'blue' : variant === 'warning' ? 'warning' : 'danger'}
                            onClick={onConfirm}
                            disabled={isPending}
                            isLoading={isPending}
                            loadingText="Working..."
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
