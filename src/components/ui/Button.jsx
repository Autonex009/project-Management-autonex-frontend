/* eslint-disable react/prop-types */
import React from 'react';
import Spinner from './LoadingSpinner';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText = 'Loading...',
    spinnerSize = 'sm',
    spinnerColor = 'white',
    className = '',
    type = 'button',
    disabled,
    ...props
}) => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none  disabled:opacity-60 disabled:cursor-not-allowed ';

    const sizes = {
        sm:   'px-3 py-1.5 text-xs rounded-lg gap-1.5',
        md:   'px-4 py-2.5 text-sm rounded-xl gap-2',
        lg:   'px-5 py-3 text-sm rounded-xl gap-2',
        icon: 'p-2 rounded-lg',
    };

    const variants = {
        primary:   'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm hover:shadow',
        secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200',
        danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
        success:   'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm',
        warning:   'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 shadow-sm',
        blue:      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm',
        ghost:     'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200',
        cancel:    'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus:ring-slate-200',
        link:      'text-indigo-600 hover:underline focus:ring-indigo-200 p-0',
    };

    return (
        <button
            type={type}
            className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? <Spinner size={spinnerSize} color={spinnerColor} text={loadingText} /> : children}
        </button>
    );
};

Button.displayName = 'Button';

export default Button;
