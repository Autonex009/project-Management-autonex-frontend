import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

const SIZES = {
    sm:    'max-w-sm',
    md:    'max-w-md',
    lg:    'max-w-lg',
    xl:    'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
};

const FOOTER_ALIGN = {
    end:     'justify-end',
    center:  'justify-center',
    between: 'justify-between',
    start:   'justify-start',
};

// ── Slot components ──────────────────────────────────────────────────────────

function ModalHeader({ children, onClose, className = '' }) {
    return (
        <div className={`flex items-start justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0 ${className}`}>
            <div className="flex-1 min-w-0">{children}</div>
            {onClose && (
                <Button type="button" variant="ghost" size="icon" onClick={onClose} className="ml-4 flex-shrink-0">
                    <X className="w-5 h-5" />
                </Button>
            )}
        </div>
    );
}

function ModalBody({ children, className = '' }) {
    return (
        <div className={`flex-1 overflow-y-auto p-6 ${className}`}>
            {children}
        </div>
    );
}

function ModalFooter({ children, align = 'end', className = '' }) {
    return (
        <div className={`flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0 ${FOOTER_ALIGN[align] || FOOTER_ALIGN.end} ${className}`}>
            {children}
        </div>
    );
}

// ── Compact Modal Variant ────────────────────────────────────────────────────

function CompactModalHeader({ children, onClose, className = '' }) {
    return (
        <div
            className={`flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex-shrink-0 ${className}`}
        >
            <div className="flex-1 min-w-0">
                {children}
            </div>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                    aria-label="Close modal"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

function CompactModalBody({ children, className = '' }) {
    return (
        <div className={`flex-1 overflow-y-auto px-5 py-4 ${className}`}>
            {children}
        </div>
    );
}

function CompactModalFooter({
    children,
    align = 'end',
    className = '',
}) {
    return (
        <div
            className={`
                flex items-center gap-2
                px-5 py-3
                border-t border-slate-200
                bg-slate-50/70
                flex-shrink-0
                ${FOOTER_ALIGN[align] || FOOTER_ALIGN.end}
                ${className}
            `}
        >
            {children}
        </div>
    );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function Modal({
    isOpen,
    onClose,
    size = 'md',
    maxHeight = '90vh',
    disableBackdropClose = false,
    className = '',
    children,
}) {
    // Escape key — respects disableBackdropClose
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key === 'Escape' && !disableBackdropClose) onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose, disableBackdropClose]);

    // Lock body scroll while open
    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={disableBackdropClose ? undefined : onClose}
        >
            <div
                className={`w-full ${SIZES[size] || SIZES.md} bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-scale-in ${className}`}
                style={{ maxHeight }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {children}
            </div>
        </div>,
        document.body
    );
}

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

// Compact variant
Modal.Compact = function CompactModal({
    isOpen,
    onClose,
    size = '4xl',
    maxHeight = '90vh',
    disableBackdropClose = false,
    className = '',
    children,
}) {
    useEffect(() => {
        if (!isOpen) return;

        const handler = (e) => {
            if (e.key === 'Escape' && !disableBackdropClose) {
                onClose();
            }
        };

        document.addEventListener('keydown', handler);

        return () => {
            document.removeEventListener('keydown', handler);
        };
    }, [isOpen, onClose, disableBackdropClose]);

    useEffect(() => {
        if (!isOpen) return;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="
                fixed inset-0 z-[9999]
                flex items-center justify-center
                p-3 sm:p-4
                bg-slate-900/40
                backdrop-blur-sm
                animate-fade-in
            "
            onClick={disableBackdropClose ? undefined : onClose}
        >
            <div
                className={`
                    w-full
                    ${SIZES[size] || SIZES['4xl']}
                    bg-white
                    rounded-xl
                    shadow-2xl
                    border border-slate-200
                    flex flex-col
                    overflow-hidden
                    animate-scale-in
                    ${className}
                `}
                style={{ maxHeight }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {children}
            </div>
        </div>,
        document.body
    );
};

Modal.Compact.Header = CompactModalHeader;
Modal.Compact.Body = CompactModalBody;
Modal.Compact.Footer = CompactModalFooter;
