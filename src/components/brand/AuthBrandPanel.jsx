import BrandLockup from "./BrandLockup";

const accentThemes = {
  admin: {
    shell: "from-[#071229] via-[#0b1b44] to-[#102c73]",
    glow: "from-blue-500/30 via-cyan-300/10 to-transparent",
    card: "border-white/15 bg-white/8",
    text: "text-blue-100",
    badge: "border-blue-300/20 bg-blue-300/10 text-blue-100",
  },
  pm: {
    shell: "from-[#0b1a45] via-[#133b8b] to-[#1f58c7]",
    glow: "from-cyan-200/25 via-white/10 to-transparent",
    card: "border-white/20 bg-white/10",
    text: "text-blue-50",
    badge: "border-cyan-200/20 bg-cyan-100/10 text-cyan-50",
  },
  employee: {
    shell: "from-[#042f2e] via-[#0d6b61] to-[#18a17f]",
    glow: "from-emerald-200/20 via-white/10 to-transparent",
    card: "border-white/20 bg-white/10",
    text: "text-emerald-50",
    badge: "border-emerald-200/20 bg-emerald-100/10 text-emerald-50",
  },
};

const AuthBrandPanel = ({
  accent = "admin",
  eyebrow,
  title,
  description,
  highlights = [],
  flowSteps = [],
}) => {
  const theme = accentThemes[accent] || accentThemes.admin;

  return (
    <div
      className={`hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br ${theme.shell}`}
    >
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] ${theme.glow}`}
      />
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div className="absolute inset-y-0 right-0 w-[48%] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_68%)]" />

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 xl:p-12">
        <div className="space-y-5">
          <BrandLockup subtitle="Adaptive Operations Platform" tone="dark" />
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${theme.badge}`}
          >
            {eyebrow}
          </div>
          <div className="max-w-xl space-y-2">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white xl:text-3xl">
              {title}
            </h1>
            <p className={`max-w-lg text-sm leading-relaxed ${theme.text}`}>
              {description}
            </p>
          </div>
        </div>

        {flowSteps.length > 0 ? (
          <div className={`relative mt-4 max-w-md rounded-[20px] border p-5 shadow-2xl backdrop-blur-md ${theme.card}`}>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              Access Request Flow
            </h3>
            <div className="relative space-y-4">
              <div className="absolute bottom-2 left-[11px] top-1 w-[2px] bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
              {flowSteps.map((step, index) => (
                <div key={step.title} className="relative flex gap-4 group">
                  <div
                    className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2px] border-white/20 bg-white/10 text-[11px] font-bold text-white backdrop-blur-lg transition-all group-hover:border-white group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]`}
                  >
                    {index + 1}
                  </div>
                  <div className="pb-0.5 pt-0.5">
                    <div className="text-sm font-bold text-white tracking-wide">
                      {step.title}
                    </div>
                    <p className={`mt-0.5 text-xs leading-relaxed ${theme.text}`}>
                      {step.copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid max-w-xl grid-cols-2 gap-4">
            {highlights.map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border p-4 backdrop-blur-sm ${theme.card}`}
              >
                <div className="text-sm font-semibold text-white">
                  {item.title}
                </div>
                <p className={`mt-1 text-sm ${theme.text}`}>{item.copy}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthBrandPanel;
