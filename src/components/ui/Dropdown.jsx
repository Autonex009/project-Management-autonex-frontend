import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

const Dropdown = ({ options = [], value, onChange, placeholder = 'Select', disabled = false, className = '', editable = false, optionsClassName = 'w-full' }) => {
    const [open, setOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open && editable && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open, editable]);

    const displayValue = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value)
        ? (typeof options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value) === 'string'
            ? options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value)
            : options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value)?.label)
        : placeholder;

    const filteredOptions = editable
        ? options.filter(opt => {
            const label = typeof opt === 'string' ? opt : opt.label;
            return label.toLowerCase().includes(searchText.toLowerCase());
        })
        : options;

    const handleSelect = (optValue) => {
        onChange(optValue);
        setOpen(false);
        setSearchText('');
    };

    if (editable) {
        const displayText = searchText !== '' ? searchText : (value || '');

        return (
            <div ref={ref} className={`relative block ${className}`}>
                <div className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm transition-colors hover:border-slate-300">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={placeholder}
                        value={displayText}
                        onChange={(e) => {
                            setSearchText(e.target.value);
                            if (e.target.value === '') {
                                onChange('');
                            }
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        disabled={disabled}
                        className="flex-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                    />
                    {displayText && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(''); setSearchText(''); }}
                            className="p-0.5 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
                </div>
                {open && !disabled && (
                    <div className={`absolute left-0 top-full mt-1 z-[9999] ${optionsClassName} bg-white border border-slate-200 rounded-xl shadow-lg py-1 overflow-hidden max-h-64 overflow-y-auto`}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => {
                                const optValue = typeof opt === 'string' ? opt : opt.value;
                                const optLabel = typeof opt === 'string' ? opt : opt.label;
                                if (optValue === '') return null;
                                return (
                                    <button
                                        key={optValue}
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(optValue); setSearchText(''); setOpen(false); }}
                                        className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                            optValue === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {optLabel}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">
                                {searchText && `Create "${searchText}"`}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={ref} className={`relative block ${className}`}>
            <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); !disabled && setOpen(o => !o); }}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
            >
                {displayValue}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && !disabled && (
                <div className={`absolute left-0 top-full mt-1 z-[9999] ${optionsClassName} bg-white border border-slate-200 rounded-xl shadow-lg py-1 overflow-hidden`}>
                    {options.map(opt => {
                        const optValue = typeof opt === 'string' ? opt : opt.value;
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        return (
                            <button
                                key={optValue}
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(optValue); setOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                    optValue === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {optLabel}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
