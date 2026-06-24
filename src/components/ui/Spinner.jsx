const Spinner = ({ size = 'md', color = 'indigo', text = null, fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    indigo: 'border-indigo-600',
    white: 'border-white',
    slate: 'border-slate-400',
    emerald: 'border-emerald-600',
  };

  const spinner = (
    <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          {text && <p className="text-slate-600 text-sm font-medium">{text}</p>}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center gap-2">
        {spinner}
        <span className="text-sm">{text}</span>
      </div>
    );
  }

  return spinner;
};

export default Spinner;
