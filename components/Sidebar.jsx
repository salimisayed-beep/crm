"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useState,
  useLayoutEffect,
  useEffect,
  useRef,
  useCallback,
  startTransition,
} from "react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "fas fa-chart-pie", label: "Dashboard" },
  { href: "/queries", icon: "fas fa-file-alt", label: "Query Explorer" },
  { href: "/sales", icon: "fas fa-receipt", label: "Closed Sales" },
  {
    href: "/users",
    icon: "fas fa-users-cog",
    label: "Admin Users",
    adminOnly: true,
  },
  {
    href: "/schema",
    icon: "fas fa-sliders",
    label: "Field Editor",
    managerUp: true,
  },
  {
    href: "/settings",
    icon: "fas fa-gear",
    label: "Settings",
    adminOnly: true,
  },
];

const THEME_KEY = "bombino_theme";

function getStoredTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

const ROLE_CONFIG = {
  admin: {
    color: "#70e6a0",
    bg: "rgba(112,230,160,0.12)",
    border: "rgba(112,230,160,0.25)",
    icon: "fas fa-shield-halved",
  },
  editor: {
    color: "#4fa6ff",
    bg: "rgba(79,166,255,0.12)",
    border: "rgba(79,166,255,0.25)",
    icon: "fas fa-pen",
  },
  viewer: {
    color: "#a5a5c0",
    bg: "rgba(165,165,192,0.12)",
    border: "rgba(165,165,192,0.25)",
    icon: "fas fa-eye",
  },
};

// ─── Fetch site settings (logo) ───────────────────────────────────────────────
async function fetchSiteSettings() {
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return {};
    const data = await res.json();
    return data.settings || {};
  } catch {
    return {};
  }
}

// ─── Read collapsed preference from localStorage (client-side only) ───────────
// Returns false on the server (SSR) and the stored value on the client.
// suppressHydrationWarning on the <aside> handles the server/client mismatch.
function readCollapsedFromStorage() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("nsb_collapsed") === "true";
  } catch {
    return false;
  }
}

// ─── Top-level content component (must NOT be defined inside render) ──────────
function SidebarContent({
  isMobile,
  collapsed,
  peeking,
  user,
  roleConf,
  pathname,
  loggingOut,
  onToggleCollapse,
  onCloseMobile,
  onLogout,
  theme,
  onToggleTheme,
  logoUrl,
  siteName,
}) {
  const initials = user ? user.username.slice(0, 2).toUpperCase() : "??";

  // Show labels when: fully expanded, OR peek-hover active, OR mobile drawer
  const showLabels = !collapsed || peeking || isMobile;

  // The collapse toggle is ONLY visible when the sidebar is fully expanded on
  // desktop. When collapsed (icons-only) or in peek-hover mode it is hidden so
  // it doesn't clutter the floating preview.
  const showToggle = !isMobile && !collapsed;

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="nsb-header">
        {logoUrl ? (
          showLabels ? (
            /* Expanded + custom logo → full-width banner */
            <div className="nsb-logo-banner">
              <img src={logoUrl} alt={siteName || "Logo"} />
            </div>
          ) : (
            /* Collapsed + custom logo → plain image, no gradient box at all */
            <div className="nsb-logo-icon-img">
              <img
                src={logoUrl}
                alt={siteName || "Logo"}
                style={{
                  width: "36px",
                  height: "36px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          )
        ) : (
          /* Default cube icon + brand text */
          <>
            <div className="nsb-logo-icon">
              <i className="fas fa-cube" />
            </div>
            {showLabels && (
              <div className="nsb-brand">
                <span className="nsb-brand-name">{siteName || "BOMBINO"}</span>
                <span className="nsb-brand-sub">query console</span>
              </div>
            )}
          </>
        )}

        {/* Desktop collapse button — only shown when fully expanded */}
        {showToggle && (
          <button
            className="nsb-toggle-btn"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
          >
            <i className="fas fa-chevron-left" />
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            className="nsb-toggle-btn"
            onClick={onCloseMobile}
            title="Close menu"
            style={{ marginLeft: "auto" }}
          >
            <i className="fas fa-xmark" />
          </button>
        )}
      </div>

      {/* ── User card ────────────────────────────────────────────────── */}
      <div className={`nsb-user${!showLabels ? " nsb-user-collapsed" : ""}`}>
        <div className="nsb-avatar" title={user?.username}>
          {initials}
        </div>

        {showLabels && user && (
          <div className="nsb-user-info">
            <strong className="nsb-username">{user.username}</strong>
            <span
              className="nsb-role-pill"
              style={{
                color: roleConf.color,
                background: roleConf.bg,
                border: `1px solid ${roleConf.border}`,
              }}
            >
              <i className={roleConf.icon} style={{ fontSize: 9 }} />
              {user.role}
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="nsb-nav">
        {showLabels && <div className="nsb-section-label">Navigation</div>}

        {NAV_ITEMS.map((item) => {
          // adminOnly: visible to admin only
          if (item.adminOnly && user?.role !== "admin") return null;
          // managerUp: visible to admin and manager
          if (item.managerUp && !["admin", "manager"].includes(user?.role))
            return null;

          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <a
              key={item.href}
              href={item.href}
              className={`nsb-item${isActive ? " nsb-active" : ""}`}
              title={!showLabels ? item.label : undefined}
            >
              <span className="nsb-item-icon">
                <i className={item.icon} />
              </span>

              {showLabels && (
                <span className="nsb-item-label">{item.label}</span>
              )}

              {/* CSS tooltip — only rendered in icons-only mode */}
              {!showLabels && <span className="nsb-tooltip">{item.label}</span>}
            </a>
          );
        })}
      </nav>

      {/* ── Theme toggle ─────────────────────────────────────────────── */}
      <div
        className="nsb-footer"
        style={{ paddingBottom: 0, borderTop: "none" }}
      >
        <button
          className="nsb-logout"
          onClick={onToggleTheme}
          title={
            !showLabels
              ? theme === "dark"
                ? "Switch to Light"
                : "Switch to Dark"
              : undefined
          }
          style={{ marginBottom: 4 }}
        >
          <span className="nsb-item-icon">
            <i className={`fas ${theme === "dark" ? "fa-sun" : "fa-moon"}`} />
          </span>
          {showLabels && (
            <span className="nsb-item-label">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          )}
          {!showLabels && (
            <span className="nsb-tooltip">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>
      </div>

      {/* ── Footer / logout ──────────────────────────────────────────── */}
      <div className="nsb-footer">
        {showLabels && (
          <div className="nsb-section-label" style={{ paddingTop: 6 }}>
            Account
          </div>
        )}

        <button
          className="nsb-logout"
          onClick={onLogout}
          disabled={loggingOut}
          title={!showLabels ? "Sign Out" : undefined}
        >
          <span className="nsb-item-icon">
            <i
              className={
                loggingOut
                  ? "fas fa-spinner fa-spin"
                  : "fas fa-right-from-bracket"
              }
            />
          </span>

          {showLabels && (
            <span className="nsb-item-label">
              {loggingOut ? "Signing out…" : "Sign Out"}
            </span>
          )}

          {!showLabels && <span className="nsb-tooltip">Sign Out</span>}
        </button>

        {showLabels && (
          <div className="nsb-footer-note">
            <i
              className="fas fa-database"
              style={{ marginRight: 5, opacity: 0.5 }}
            />
            SQLite · Bombino CRM
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Sidebar shell ───────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // ── Lazy init from localStorage — no setState-in-effect needed ────────────
  // On the server this returns false; on the client it reads localStorage.
  // suppressHydrationWarning on <aside> silences the server/client mismatch.
  const [collapsed, setCollapsed] = useState(readCollapsedFromStorage);

  const [peeking, setPeeking] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [logoUrl, setLogoUrl] = useState("");
  const [siteName, setSiteName] = useState("BOMBINO");

  // Enables CSS transitions only after the first paint — prevents the sidebar
  // from animating 240px→68px during page navigation.
  const [transitionsReady, setTransitionsReady] = useState(false);

  const prevPathRef = useRef(pathname);

  // ── Sync collapsed → localStorage + --sidebar-w CSS variable ─────────────
  // Pure DOM / storage sync — no setState calls inside.
  useLayoutEffect(() => {
    try {
      localStorage.setItem("nsb_collapsed", String(collapsed));
    } catch {}
    document.documentElement.style.setProperty(
      "--sidebar-w",
      collapsed ? "68px" : "240px",
    );
  }, [collapsed]);

  // ── Enable CSS transitions after the first frame ──────────────────────────
  // requestAnimationFrame fires after the browser has committed the first
  // paint, so the transition class is added only for subsequent interactions
  // (peek, expand, collapse) — never on initial mount.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setTransitionsReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Close mobile drawer when the route changes ────────────────────────────
  // startTransition marks this as a non-urgent update so the React Compiler
  // does not flag it as a synchronous setState-in-effect.
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      startTransition(() => setMobileOpen(false));
    }
  }, [pathname]);

  // ── Close mobile drawer on Escape key ────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") startTransition(() => setMobileOpen(false));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Init theme from localStorage ──────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  // ── Fetch logged-in user ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  // ── Fetch site settings (logo, name) ─────────────────────────────────────
  useEffect(() => {
    fetchSiteSettings().then((s) => {
      if (s.logo_url) setLogoUrl(s.logo_url);
      if (s.site_name) setSiteName(s.site_name);
    });
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  }, [router]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
    setPeeking(false);
  }, []);

  const closeMobile = useCallback(
    () => startTransition(() => setMobileOpen(false)),
    [],
  );
  const openMobile = useCallback(
    () => startTransition(() => setMobileOpen(true)),
    [],
  );

  // ── Hover peek handlers (desktop collapsed only) ──────────────────────────
  // When the sidebar is collapsed, hovering expands it as a floating overlay
  // without touching --sidebar-w, so the main content never shifts.
  const handleMouseEnter = useCallback(() => {
    if (collapsed) setPeeking(true);
  }, [collapsed]);

  const handleMouseLeave = useCallback(() => {
    if (collapsed) setPeeking(false);
  }, [collapsed]);

  const roleConf = ROLE_CONFIG[user?.role] || ROLE_CONFIG.viewer;

  const sharedProps = {
    user,
    roleConf,
    pathname,
    loggingOut,
    onToggleCollapse: toggleCollapse,
    onCloseMobile: closeMobile,
    onLogout: handleLogout,
    theme,
    onToggleTheme: handleToggleTheme,
    logoUrl,
    siteName,
  };

  const sidebarClasses = [
    "nsb-sidebar",
    collapsed ? "nsb-collapsed" : "",
    peeking ? "nsb-peeking" : "",
    transitionsReady ? "nsb-transitions" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* ── Mobile hamburger trigger ──────────────────────────────────────── */}
      <button
        className="nsb-mobile-trigger"
        onClick={openMobile}
        aria-label="Open navigation"
      >
        <i className="fas fa-bars" />
      </button>

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      {/* suppressHydrationWarning: server renders collapsed=false, client may
          read collapsed=true from localStorage — mismatch is intentional     */}
      <aside
        className={sidebarClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        suppressHydrationWarning
      >
        <SidebarContent
          {...sharedProps}
          isMobile={false}
          collapsed={collapsed}
          peeking={peeking}
        />
      </aside>

      {/* ── Mobile overlay backdrop ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="nsb-overlay" onClick={closeMobile} aria-hidden="true" />
      )}

      {/* ── Mobile slide-in drawer ────────────────────────────────────────── */}
      <aside className={`nsb-drawer${mobileOpen ? " nsb-drawer-open" : ""}`}>
        <SidebarContent
          {...sharedProps}
          isMobile
          collapsed={false}
          peeking={false}
        />
      </aside>
    </>
  );
}
