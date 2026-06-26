const toneStyles = {
  dark: {
    frame: 'border-white/10 bg-white/5',
    subtitle: 'text-slate-400',
    wordmarkFilter: undefined,
  },
  light: {
    frame: 'border-slate-200 bg-white',
    subtitle: 'text-slate-500',
    // Tints a white/light wordmark to dark blue (~ Tailwind blue-900 / indigo-900)
    wordmarkFilter:
      'brightness(0) saturate(100%) invert(13%) sepia(98%) saturate(2476%) hue-rotate(225deg) brightness(94%) contrast(101%)',
  },
};

const BrandLockup = ({
  subtitle = 'Resource Planning System',
  tone = 'dark',
  compact = false,
  collapsed = false,
}) => {
  const styles = toneStyles[tone] || toneStyles.dark;

  return (
    <div className={`inline-flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
      <div className={`relative overflow-hidden rounded-[1.35rem] border shadow-lg ${styles.frame} ${compact ? 'h-12 w-12 p-2.5' : 'h-16 w-16 p-3'} transition-all flex-shrink-0`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),_transparent_62%)]" />
        <img src="/autonex_ai_logo.jpeg" alt="Autonex" className="relative z-10 h-full w-full rounded-[1rem] object-cover" />
      </div>
      {!collapsed && (
        <div className="min-w-0 transition-all duration-200">
          <img
            src="/logo.png"
            alt="Autonex wordmark"
            className={`${compact ? 'h-6' : 'h-8'} w-auto object-contain`}
            style={styles.wordmarkFilter ? { filter: styles.wordmarkFilter } : undefined}
          />
          <p className={`mt-1 text-xs ${styles.subtitle} truncate`}>{subtitle}</p>
        </div>
      )}
    </div>
  );
};

export default BrandLockup;
