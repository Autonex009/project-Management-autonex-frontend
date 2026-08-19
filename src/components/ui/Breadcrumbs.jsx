import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Reusable breadcrumb bar. Renders a static root crumb ("Autonex") followed by
// the navigation trail. Every crumb except the last is a link back to that page
// (using the exact path — including query string — it was visited at, so you
// return to the same view). Pair with `useBreadcrumbTrail` to build `items`.
//
// items: [{ name, path }] — path is the full pathname+search to navigate to.
const Breadcrumbs = ({
  items = [],
  homeHref = "/",
  homeLabel = "Autonex",
  homeIcon = null,
  className = "",
}) => (
  <nav
    className={`flex items-center gap-1.5 text-[13px] min-w-0 ${className}`}
    aria-label="Breadcrumb"
  >
    <Link
      to={homeHref}
      className="flex items-center gap-1.5 shrink-0 text-slate-500 hover:text-slate-700 transition-colors "
    >
      {homeIcon}
      <span className="hidden sm:inline">{homeLabel}</span>
    </Link>

    {items.map((item, i) => {
      const isLast = i === items.length - 1;
      return (
        <span
          key={`${item.path}-${i}`}
          className="flex items-center gap-1.5 min-w-0"
        >
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-300 " />
          {isLast ? (
            <span className="font-medium text-slate-900 truncate ">
              {item.name}
            </span>
          ) : (
            <Link
              to={item.path}
              className="text-slate-500 hover:text-slate-700 truncate transition-colors "
            >
              {item.name}
            </Link>
          )}
        </span>
      );
    })}
  </nav>
);

export default Breadcrumbs;
