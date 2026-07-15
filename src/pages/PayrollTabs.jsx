import { useState } from 'react';
import { Lock, IndianRupee, CalendarClock } from 'lucide-react';
import { payrollApi } from '../services/api';
import PayTab from './PayTab';
import PayrollPage from './PayrollPage';

/**
 * Payroll shell — two tabs:
 *   • Pay         → ground-truth salary records (source data)        [PayTab]
 *   • Monthly Pay → derived monthly salary calculation (unchanged)   [PayrollPage]
 *
 * The payroll passcode gate lives here so both tabs are unlocked once. The
 * existing PayrollPage self-detects the shared sessionStorage passcode and skips
 * its own gate, so the Monthly Pay tab renders straight through after unlock.
 */
const TABS = [
    { key: 'pay', label: 'Pay', icon: IndianRupee },
    { key: 'monthly', label: 'Monthly Pay', icon: CalendarClock },
];

const PayrollTabs = () => {
    const [active, setActive] = useState('pay');

    const [unlocked, setUnlocked] = useState(!!sessionStorage.getItem('payroll_passcode'));
    const [passcodeInput, setPasscodeInput] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState('');

    const handleUnlock = async (e) => {
        e.preventDefault();
        setUnlocking(true);
        setUnlockError('');
        sessionStorage.setItem('payroll_passcode', passcodeInput);
        try {
            // Validate against the server (also a no-op pass if the gate is disabled).
            await payrollApi.getSalaries();
            setUnlocked(true);
            setPasscodeInput('');
        } catch (err) {
            // Only a successful call unlocks. Any error keeps the gate closed and
            // clears the stored passcode so the failed value isn't reused.
            sessionStorage.removeItem('payroll_passcode');
            const status = err.response?.status;
            if (status === 401) {
                setUnlockError('Incorrect payroll passcode.');
            } else if (status === 403) {
                setUnlockError('Your account does not have access to payroll.');
            } else {
                setUnlockError('Could not verify the passcode. Please try again.');
            }
        } finally {
            setUnlocking(false);
        }
    };

    const handleLock = () => {
        sessionStorage.removeItem('payroll_passcode');
        setUnlocked(false);
    };

    if (!unlocked) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <form onSubmit={handleUnlock} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50"><Lock className="w-5 h-5 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Payroll is protected</h2>
                            <p className="text-sm text-slate-500">Enter the payroll passcode to continue.</p>
                        </div>
                    </div>
                    <input
                        type="password"
                        autoFocus
                        value={passcodeInput}
                        onChange={(e) => setPasscodeInput(e.target.value)}
                        placeholder="Payroll passcode"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {unlockError && <p className="text-sm text-red-600">{unlockError}</p>}
                    <button
                        type="submit"
                        disabled={unlocking || !passcodeInput}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {unlocking ? 'Checking…' : 'Unlock'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab bar */}
            <div className="flex items-center justify-between border-b border-slate-200">
                <div className="flex gap-1">
                    {TABS.map((tab) => {
                        const isActive = active === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActive(tab.key)}
                                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                                    isActive
                                        ? 'border-indigo-600 text-indigo-700'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={handleLock}
                    title="Lock payroll"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <Lock className="w-4 h-4" />
                </button>
            </div>

            {/* Active tab. Keep both mounted? No — render the active one. Monthly Pay
                (PayrollPage) is self-contained and auto-unlocks from sessionStorage. */}
            {active === 'pay' ? <PayTab /> : <PayrollPage />}
        </div>
    );
};

export default PayrollTabs;
