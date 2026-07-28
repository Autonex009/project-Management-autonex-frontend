/* eslint-disable react/prop-types */
import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
 return (
 <div className="w-full">
 {label && (
 <label className="block text-sm font-medium text-slate-700 mb-1.5">
 {label}
 </label>
 )}
 <input
 ref={ref}
 className={`
 w-full px-3.5 py-2.5 
 border border-slate-300 rounded-lg text-sm 
 transition-all duration-200 
 focus:outline-none focus:ring-2 focus:ring-offset-0 
 bg-white text-slate-900 placeholder:text-slate-400
 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
 ${error
 ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
 : 'focus:border-indigo-500 focus:ring-indigo-100 hover:border-slate-400'
 }
 ${className}
 `}
 {...props}
 />
 {error && (
 <p className="mt-1.5 text-xs text-red-600 font-medium animate-in slide-in-from-top-1">
 {error}
 </p>
 )}
 </div>
 );
});

Input.displayName = 'Input';

export default Input;
