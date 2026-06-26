import React from 'react';
import { Search } from 'lucide-react';

const PageSearchBar = ({ value, onChange, placeholder = 'Search...' }) => {
    return (
        <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 w-full sm:w-64 placeholder:text-slate-400 transition-all shadow-sm"
            />
        </div>
    );
};

export default PageSearchBar;
