const Spinner = ({ size = 'md', color = 'indigo', text = null, fullScreen = false, variant = 'spinner' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const dotSizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3.5 h-3.5',
  };

  const borderColorClasses = {
    indigo: 'border-indigo-600',
    white: 'border-white',
    slate: 'border-slate-400',
    emerald: 'border-emerald-600',
  };

  const bgColorClasses = {
    indigo: 'bg-indigo-600',
    white: 'bg-white',
    slate: 'bg-slate-400',
    emerald: 'bg-emerald-600',
  };

  let spinnerEl;

  if (variant === 'dots') {
    spinnerEl = (
      <div className="flex items-center gap-1">
        <div className={`${dotSizeClasses[size]} rounded-full ${bgColorClasses[color]} animate-bounce [animation-delay:-0.3s]`} />
        <div className={`${dotSizeClasses[size]} rounded-full ${bgColorClasses[color]} animate-bounce [animation-delay:-0.15s]`} />
        <div className={`${dotSizeClasses[size]} rounded-full ${bgColorClasses[color]} animate-bounce`} />
      </div>
    );
  } else if (variant === 'pulse') {
    spinnerEl = (
      <div className={`${sizeClasses[size]} rounded-full ${bgColorClasses[color]} animate-pulse opacity-75`} />
    );
  } else {
    spinnerEl = (
      <div className={`${sizeClasses[size]} border-2 ${borderColorClasses[color]} border-t-transparent rounded-full animate-spin`} />
    );
  }

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          {spinnerEl}
          {text && <p className="text-slate-600 text-sm font-medium">{text}</p>}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center gap-2">
        {spinnerEl}
        <span className="text-sm">{text}</span>
      </div>
    );
  }

  return spinnerEl;
};

export default Spinner;
