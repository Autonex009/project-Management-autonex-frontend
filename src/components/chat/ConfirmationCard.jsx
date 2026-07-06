import React from 'react';
import { Check, X, Calendar, Clock, Briefcase } from 'lucide-react';

/**
 * ConfirmationCard — renders an action confirmation UI for leave/WFH applications.
 */
const ConfirmationCard = ({ action, details, onConfirm, onCancel, isLoading }) => {
    if (!details) return null;

    const isLeave = action === 'apply_leave';
    const isWFH = action === 'apply_wfh';
    const isCancel = action === 'cancel_leave';

    const title = isLeave
        ? 'Confirm Leave Request'
        : isWFH
            ? 'Confirm WFH Request'
            : 'Confirm Leave Cancellation';

    const icon = isLeave || isCancel
        ? <Calendar className="w-5 h-5" />
        : <Briefcase className="w-5 h-5" />;

    return (
        <div className="my-3 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 shadow-lg overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className={`px-4 py-3 flex items-center gap-2.5 text-sm font-semibold ${
                isCancel
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border-b border-red-100'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-b border-blue-100'
            }`}>
                {icon}
                {title}
            </div>

            {/* Details */}
            <div className="px-4 py-3.5 space-y-2.5">
                {isLeave && (
                    <>
                        <DetailRow label="Type" value={details.leave_type_label} />
                        <DetailRow label="From" value={formatDate(details.start_date)} />
                        <DetailRow label="To" value={formatDate(details.end_date)} />
                        <DetailRow label="Working Days" value={details.working_days} />
                        <DetailRow label="Reason" value={details.reason} />
                        <div className="pt-1.5 border-t border-slate-100">
                            <DetailRow
                                label="Balance After"
                                value={`${details.balance_after} remaining`}
                                highlight={details.will_be_unpaid}
                            />
                            {details.will_be_unpaid && (
                                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    {details.unpaid_days} day(s) will be unpaid
                                </p>
                            )}
                        </div>
                    </>
                )}
                {isWFH && (
                    <>
                        <DetailRow label="Date" value={formatDate(details.wfh_date)} />
                        {details.end_date !== details.wfh_date && (
                            <DetailRow label="To" value={formatDate(details.end_date)} />
                        )}
                        <DetailRow label="Working Days" value={details.working_days} />
                        {details.reason && <DetailRow label="Reason" value={details.reason} />}
                    </>
                )}
                {isCancel && (
                    <>
                        <DetailRow label="Leave #" value={details.leave_id} />
                        <DetailRow label="Type" value={details.leave_type_label} />
                        <DetailRow label="From" value={formatDate(details.start_date)} />
                        <DetailRow label="To" value={formatDate(details.end_date)} />
                        <DetailRow label="Status" value={details.status} />
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 flex gap-2.5 border-t border-slate-100 bg-slate-50/50">
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm ${
                        isCancel
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-200'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200'
                    } ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.98]'}`}
                >
                    <Check className="w-4 h-4" />
                    {isLoading ? 'Submitting...' : 'Confirm'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
                >
                    <X className="w-4 h-4" />
                    Cancel
                </button>
            </div>
        </div>
    );
};

const DetailRow = ({ label, value, highlight = false }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className={`font-semibold ${highlight ? 'text-amber-600' : 'text-slate-800'}`}>
            {value}
        </span>
    </div>
);

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

export default ConfirmationCard;
