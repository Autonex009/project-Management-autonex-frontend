const shimmerClass = 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer';

const Skeleton = ({ type = 'text', width = 'w-full', height = 'h-4', count = 1, className = '' }) => {
  // Full page skeleton with header + table
  if (type === 'page') {
    return (
      <div className={`${className} space-y-6 p-2`}>
        {/* Header Section */}
        <div className="space-y-3">
          {/* H1 Heading */}
          <div className={`w-48 h-8 ${shimmerClass} rounded`} />

          {/* H2 Subtitle */}
          <div className={`w-64 h-4 ${shimmerClass} rounded`} />

          {/* Stats/Info Row */}
          <div className="flex gap-4 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`w-20 h-5 ${shimmerClass} rounded`} />
            ))}
          </div>
        </div>

        {/* Filters/Tabs Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`w-24 h-8 ${shimmerClass} rounded-lg`} />
            ))}
          </div>

          {/* Search & Button Row */}
          <div className="flex gap-4 items-center">
            <div className={`flex-1 h-10 ${shimmerClass} rounded-lg max-w-xs`} />
            <div className={`w-32 h-10 ${shimmerClass} rounded-lg`} />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200/60">
          {/* Table Header */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-4 flex items-center gap-4">
            <div className={`w-12 h-4 ${shimmerClass} rounded`} />
            <div className={`w-24 h-4 ${shimmerClass} rounded`} />
            <div className={`w-20 h-4 ${shimmerClass} rounded flex-1`} />
            <div className={`w-20 h-4 ${shimmerClass} rounded`} />
            <div className={`w-24 h-4 ${shimmerClass} rounded`} />
          </div>

          {/* Table Rows */}
          {Array.from({ length: count || 5 }).map((_, i) => (
            <div key={i} className="border-b border-slate-100 last:border-b-0 px-5 py-4 flex items-center gap-4 hover:bg-slate-50/40 transition-colors">
              <div className={`w-10 h-10 rounded-lg ${shimmerClass} flex-shrink-0`} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className={`w-32 h-4 ${shimmerClass} rounded`} />
                <div className={`w-40 h-3 ${shimmerClass} rounded`} />
              </div>
              <div className={`w-28 h-4 ${shimmerClass} rounded`} />
              <div className={`w-20 h-6 ${shimmerClass} rounded-full`} />
              <div className={`w-16 h-4 ${shimmerClass} rounded`} />
              <div className={`w-32 h-4 ${shimmerClass} rounded flex-1`} />
              <div className={`w-20 h-6 ${shimmerClass} rounded-full`} />
              <div className="flex gap-2">
                <div className={`w-8 h-8 ${shimmerClass} rounded-lg`} />
                <div className={`w-8 h-8 ${shimmerClass} rounded-lg`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Table skeleton matching app UI
  if (type === 'table') {
    return (
      <div className={`${className} bg-white rounded-2xl border border-slate-200/60`}>
        {/* Table Header */}
        <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-4 flex items-center gap-4">
          <div className={`w-12 h-4 ${shimmerClass} rounded`} />
          <div className={`w-24 h-4 ${shimmerClass} rounded`} />
          <div className={`w-20 h-4 ${shimmerClass} rounded flex-1`} />
          <div className={`w-20 h-4 ${shimmerClass} rounded`} />
          <div className={`w-24 h-4 ${shimmerClass} rounded`} />
        </div>

        {/* Table Rows */}
        {Array.from({ length: count || 5 }).map((_, i) => (
          <div key={i} className="border-b border-slate-100 last:border-b-0 px-5 py-4 flex items-center gap-4 hover:bg-slate-50/40 transition-colors">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-lg ${shimmerClass} flex-shrink-0`} />

            {/* Name & Email */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className={`w-32 h-4 ${shimmerClass} rounded`} />
              <div className={`w-40 h-3 ${shimmerClass} rounded`} />
            </div>

            {/* Designation */}
            <div className={`w-28 h-4 ${shimmerClass} rounded`} />

            {/* Type */}
            <div className={`w-20 h-6 ${shimmerClass} rounded-full`} />

            {/* Hours */}
            <div className={`w-16 h-4 ${shimmerClass} rounded`} />

            {/* Skills */}
            <div className={`w-32 h-4 ${shimmerClass} rounded flex-1`} />

            {/* Status */}
            <div className={`w-20 h-6 ${shimmerClass} rounded-full`} />

            {/* Actions */}
            <div className="flex gap-2">
              <div className={`w-8 h-8 ${shimmerClass} rounded-lg`} />
              <div className={`w-8 h-8 ${shimmerClass} rounded-lg`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`${className} space-y-4 p-6 border border-slate-200 rounded-2xl bg-white`}>
        <div className={`w-full h-6 ${shimmerClass} rounded`} />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`w-full h-4 ${shimmerClass} rounded`} />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'circle') {
    return <div className={`w-12 h-12 rounded-full ${shimmerClass}`} />;
  }

  if (type === 'avatar') {
    return <div className={`w-10 h-10 rounded-lg ${shimmerClass}`} />;
  }

  // Text skeleton
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${width} ${height} ${shimmerClass} rounded`} />
      ))}
    </div>
  );
};

export default Skeleton;
