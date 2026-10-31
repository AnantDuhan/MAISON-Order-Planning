import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "chart.js/auto";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import axios from "axios";

import {
  getAnalytics,
  getAdminStats,
  clearErrors,
} from "../../actions/analyticsAction";
import MetaData from "../layout/MetaData";
import { useTheme } from "../../context/ThemeContext";
import {
  UNLISTED_FILTER,
  adminProductsLink,
  categoryFilter,
  categoryPlaces,
  departmentFilter,
  useCategories,
} from "../../utils/useCategories";

const DELETED = "Uncategorised"; // the backend's name for lines whose product no longer exists

/**
 * Revenue rows (one per product category name, at whatever level the
 * product was filed) rolled up into departments, each with its categories:
 * [{ name, revenue, units, filter, children: [{ name, revenue, units, filter }] }]
 * `filter` is the Admin > All Products filter to open; null when there is
 * nothing to open (deleted products).
 */
const rollUpByDepartment = (rows, places) => {
  const byDept = new Map();
  rows.forEach((row) => {
    const name = String(row.category || "");
    const place = places.get(name.toLowerCase());
    const key = place ? place.department : "Other";
    const dept = byDept.get(key) || {
      name: key,
      revenue: 0,
      units: 0,
      filter: place ? departmentFilter(place.department) : null,
      children: [],
      own: { revenue: 0, units: 0 },
    };
    dept.revenue += row.revenue || 0;
    dept.units += row.units || 0;
    if (place?.category) {
      dept.children.push({ name: place.category, revenue: row.revenue, units: row.units, filter: categoryFilter(place.category) });
    } else if (place) {
      // Filed under the department itself, not one of its categories.
      dept.own.revenue += row.revenue || 0;
      dept.own.units += row.units || 0;
    } else {
      const deleted = name === DELETED;
      dept.children.push({
        name: deleted ? "Deleted products" : `${name} (not in categories)`,
        revenue: row.revenue,
        units: row.units,
        filter: deleted ? null : UNLISTED_FILTER,
      });
    }
    byDept.set(key, dept);
  });
  return [...byDept.values()]
    .map(({ own, ...d }) => {
      const children = d.children.sort((a, b) => b.revenue - a.revenue);
      // So the lines under a department add up to its total.
      if (own.revenue > 0 && children.length) children.push({ name: "No sub-category", revenue: own.revenue, units: own.units, filter: null });
      return { ...d, children };
    })
    .sort((a, b) => (a.name === "Other") - (b.name === "Other") || b.revenue - a.revenue);
};

/** "2026-10" -> "Oct 2026", "2026-10-28" -> "28 Oct"; anything else unchanged. */
const periodLabel = (p) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(p || ""));
  if (!m) return p;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] || 1));
  return m[3]
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const ranges = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "12m", label: "12 Months" },
  { key: "all", label: "All Time" },
];

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Hidden categories too, so past sales still find their department.
  const { categories: categoryTree, loading: categoriesLoading } = useCategories({ admin: true });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { user } = useSelector((state) => state.user);

  const [range, setRange] = useState("30d");
  const [membershipAnalytics, setMembershipAnalytics] = useState(null);
  // const [twoFactorAnalytics, setTwoFactorAnalytics] = useState(null);

  const {
    analytics,
    stats,
    loading: analyticsLoading,
    error: analyticsError,
  } = useSelector((state) => state.analytics);

  const outOfStock = stats?.outOfStock ?? 0;
  const inStock = stats?.inStock ?? 0;

  useEffect(() => {
    dispatch(getAdminStats());

    axios
      .get("/api/v1/admin/membership-analytics")
      .then(({ data }) => setMembershipAnalytics(data.analytics))
      .catch(() => setMembershipAnalytics(null));
  }, [dispatch]);

  useEffect(() => {
    dispatch(getAnalytics(range));
  }, [dispatch, range]);

  useEffect(() => {
    if (analyticsError) {
      toast.error(analyticsError);
      dispatch(clearErrors());
    }
  }, [dispatch, analyticsError]);

  // ── palette from design tokens ───────────────────────
  const brass = isDark ? "#C9A063" : "#A07C4B";
  const brassSoft = "#C1A57A";
  const dim = isDark ? "#5C4A33" : "#DCCDB4";
  const inkFaint = isDark ? "#8A8174" : "#8A8278";
  const gridLine = isDark ? "rgba(84,79,74,0.35)" : "rgba(224,217,206,0.9)";

  const axisOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: inkFaint, font: { family: "Jost" } },
        grid: { color: gridLine },
      },
      y: {
        ticks: { color: inkFaint, font: { family: "Jost" } },
        grid: { color: gridLine },
      },
    },
  };

  // Revenue line: rupee ticks ("₹40k") instead of bare numbers.
  const revenueOptions = {
    ...axisOptions,
    scales: {
      ...axisOptions.scales,
      y: {
        ...axisOptions.scales.y,
        ticks: {
          ...axisOptions.scales.y.ticks,
          callback: (v) => `₹${Number(v).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })}`,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: inkFaint,
          font: { family: "Jost", size: 11 },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
    },
  };

  const horizontalOptions = {
    ...axisOptions,
    indexAxis: "y",
  };

  const summary = analytics?.summary;
  const series = analytics?.revenueSeries || [];
  const topProducts = analytics?.topProducts || [];
  const categoryRevenue = analytics?.categoryRevenue;
  const returnReasons = analytics?.returnReasons || [];
  const statusBreakdown = analytics?.statusBreakdown || [];
  const couponUsage = analytics?.couponUsage || [];
  const membershipSummary = membershipAnalytics?.summary || {};

  const departments = useMemo(() => {
    const rows = categoryRevenue || [];
    if (categoriesLoading) return [];
    return rollUpByDepartment(rows, categoryPlaces(categoryTree));
  }, [categoryRevenue, categoryTree, categoriesLoading]);
  const categoryTotal = departments.reduce((a, d) => a + d.revenue, 0);
  const departmentCount = departments.filter((d) => d.filter).length;
  const openProducts = (filter) => filter && navigate(adminProductsLink(filter));
  // const twoFactorSummary = twoFactorAnalytics?.summary || {};

  const twoFactorEnabled = stats?.twoFactorEnabled ?? 0;
  const twoFactorDisabled = stats?.twoFactorDisabled ?? 0;
  const twoFactorAdoptionRate = stats?.twoFactorAdoptionRate ?? 0;
  const totalUsers = stats?.users ?? 0;

  //   const twoFactorAdoptionRate =
  //     twoFactorSummary.adoptionRate ??
  //     (totalUsers > 0 ? (twoFactorEnabled / totalUsers) * 100 : 0);

  // ── chart data ───────────────────────────────────────
  const revenueChart = {
    labels: series.map((p) => periodLabel(p.period)),
    datasets: [
      {
        label: "Revenue",
        data: series.map((p) => p.revenue),
        borderColor: brass,
        backgroundColor: "rgba(160, 124, 75, 0.15)",
        pointBackgroundColor: brass,
        pointRadius: series.length > 30 ? 0 : 3,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const topProductsChart = {
    labels: topProducts.map((p) => p.name),
    datasets: [
      {
        label: "Revenue",
        data: topProducts.map((p) => p.revenue),
        backgroundColor: brass,
        borderWidth: 0,
      },
    ],
  };

  const categoryColors = [brass, dim, brassSoft, "#7E6440", "#E0D2BC", "#4F6E54", "#9C7B52"];
  const colorOf = (i) => categoryColors[i % categoryColors.length];
  const categoryChart = {
    labels: departments.map((d) => d.name),
    datasets: [
      {
        data: departments.map((d) => d.revenue),
        backgroundColor: departments.map((_, i) => colorOf(i)),
        borderWidth: 0,
      },
    ],
  };
  // A slice opens that department's products; the list below does the same.
  const categoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = categoryTotal ? Math.round((ctx.parsed / categoryTotal) * 100) : 0;
            return ` ${inr(ctx.parsed)} · ${pct}%`;
          },
        },
      },
    },
    onHover: (event, elements) => {
      const target = event?.native?.target;
      if (target) target.style.cursor = elements.length && departments[elements[0].index]?.filter ? "pointer" : "default";
    },
    onClick: (_, elements) => {
      if (elements.length) openProducts(departments[elements[0].index]?.filter);
    },
  };

  const returnReasonsChart = {
    labels: returnReasons.map((r) => r.reason),
    datasets: [
      {
        label: "Returns",
        data: returnReasons.map((r) => r.count),
        backgroundColor: isDark ? "#C56A5E" : "#9C4237",
        borderWidth: 0,
      },
    ],
  };

  const stockChart = {
    labels: ["Out of Stock", "In Stock"],
    datasets: [
      {
        backgroundColor: [dim, brass],
        borderWidth: 0,
        data: [outOfStock, inStock],
      },
    ],
  };

  const counts = [
    { label: "Products", value: stats?.products, to: "/admin/products" },
    { label: "Orders", value: stats?.orders, to: "/admin/orders" },
    { label: "Users", value: stats?.users, to: "/admin/users" },
    { label: "Returns", value: stats?.returns, to: "/admin/returns" },
    { label: "Refunds", value: stats?.refunds, to: "/admin/refunds" },
  ];

  const hasData = series.length > 0 || topProducts.length > 0;
  const share = (n) => (categoryTotal ? `${Math.round((n / categoryTotal) * 100)}%` : "0%");

  return (
    <Fragment>
      <MetaData title="Dashboard · Admin" />

      <div className="editorial-shell py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <p className="eyebrow">Admin</p>

              {user?.isDemo && (
                  <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-luxe text-brass">
                      Demo Data
                  </span>
              )}
          </div>

          <h1 className="heading-display mt-2 text-display">
              Analytics
          </h1>
          </div>

          {/* Range selector */}
          <div className="flex flex-wrap items-center border border-line">
            {ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-4 py-2.5 font-sans text-[0.68rem] uppercase tracking-luxe transition-colors ${
                  range === r.key
                    ? "bg-ink text-canvas"
                    : "text-ink-soft hover:text-brass"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Headline metrics ─────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="border border-line bg-ink px-7 py-9">
            <p className="eyebrow !text-brass-soft">Revenue</p>
            <p className="mt-3 font-display text-4xl font-medium text-canvas">
              {inr(summary?.revenue)}
            </p>
          </div>
          <div className="border border-line bg-surface px-7 py-9">
            <p className="eyebrow">Orders</p>
            <p className="mt-3 font-display text-4xl font-medium text-ink">
              {summary?.orders ?? 0}
            </p>
          </div>
          <div className="border border-line bg-surface px-7 py-9">
            <p className="eyebrow">Avg Order Value</p>
            <p className="mt-3 font-display text-4xl font-medium text-ink">
              {inr(summary?.avgOrderValue)}
            </p>
          </div>
          <div className="border border-line bg-surface px-7 py-9">
            <p className="eyebrow">Return Rate</p>
            <p className="mt-3 font-display text-4xl font-medium text-ink">
              {(summary?.returnRate ?? 0).toFixed(1)}%
            </p>
            <p className="mt-1 font-sans text-[0.7rem] text-ink-faint">
              {summary?.returned ?? 0} of {summary?.orders ?? 0} orders
            </p>
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="border border-line bg-surface px-7 py-6">
            <p className="eyebrow">Units Sold</p>
            <p className="mt-2 font-display text-3xl font-medium text-ink">
              {summary?.units ?? 0}
            </p>
          </div>
          <div className="border border-line bg-surface px-7 py-6">
            <p className="eyebrow">Discount Given</p>
            <p className="mt-2 font-display text-3xl font-medium text-ink">
              {inr(summary?.discountGiven)}
            </p>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <p className="eyebrow">Membership Pulse</p>
            <Link
              to="/admin/memberships"
              className="font-sans text-[0.68rem] uppercase tracking-luxe text-brass hover:text-ink"
            >
              View details
            </Link>
          </div>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <div className="border border-line bg-surface px-7 py-6">
              <p className="eyebrow">Members</p>
              <p className="mt-2 font-display text-3xl font-medium text-ink">
                {membershipSummary.total || 0}
              </p>
            </div>
            <div className="border border-line bg-surface px-7 py-6">
              <p className="eyebrow">Active</p>
              <p className="mt-2 font-display text-3xl font-medium text-ink">
                {membershipSummary.active || 0}
              </p>
            </div>
            <div className="border border-line bg-surface px-7 py-6">
              <p className="eyebrow">Monthly Recurring Revenue</p>
              <p className="mt-2 font-display text-3xl font-medium text-ink">
                {inr(membershipSummary.recurringRevenue)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Security / 2FA Analytics ───────────────────── */}
        <div className="mt-10">
          <div>
            <p className="eyebrow">Security</p>
            <h2 className="mt-2 font-display text-2xl font-medium text-ink">
              Two-Factor Authentication
            </h2>
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {/* 2FA Adoption */}
            <div className="border border-line bg-ink px-7 py-7">
              <p className="eyebrow !text-brass-soft">2FA Adoption</p>

              <p className="mt-3 font-display text-4xl font-medium text-canvas">
                {twoFactorAdoptionRate.toFixed(1)}%
              </p>

              <p className="mt-2 font-sans text-[0.72rem] text-canvas/60">
                {twoFactorEnabled} of {totalUsers} users
              </p>

              <div className="mt-5 h-1 w-full bg-white/10">
                <div
                  className="h-1 bg-brass transition-all duration-700 ease-luxe"
                  style={{
                    width: `${Math.min(twoFactorAdoptionRate, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Enabled */}
            <div className="border border-line bg-surface px-7 py-7">
              <p className="eyebrow">2FA Enabled</p>

              <p className="mt-3 font-display text-4xl font-medium text-ink">
                {twoFactorEnabled}
              </p>

              <p className="mt-2 font-sans text-[0.72rem] text-ink-faint">
                Users with two-factor authentication enabled
              </p>
            </div>

            {/* Disabled */}
            <div className="border border-line bg-surface px-7 py-7">
              <p className="eyebrow">2FA Disabled</p>

              <p className="mt-3 font-display text-4xl font-medium text-ink">
                {twoFactorDisabled}
              </p>

              <p className="mt-2 font-sans text-[0.72rem] text-ink-faint">
                Users without two-factor authentication
              </p>
            </div>
          </div>
        </div>

        {analyticsLoading && (
          <p className="mt-8 font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint">
            Loading analytics…
          </p>
        )}

        {!analyticsLoading && !hasData && (
          <p className="mt-16 text-center font-display text-2xl italic text-ink-faint">
            No orders in this period.
          </p>
        )}

        {/* ── Revenue trend ────────────────────────── */}
        {series.length > 0 && (
          <div className="mt-12">
            <p className="eyebrow">Revenue Over Time</p>
            <div className="mt-5 h-72 border border-line bg-surface p-6">
              <Line data={revenueChart} options={revenueOptions} />
            </div>
          </div>
        )}

        {/* ── Top products + category split ────────── */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {topProducts.length > 0 && (
            <div>
              <p className="eyebrow">Top Products by Revenue</p>
              <div className="mt-5 h-80 border border-line bg-surface p-6">
                <Bar data={topProductsChart} options={horizontalOptions} />
              </div>
            </div>
          )}

          {departments.length > 0 && (
            <div>
              <div className="flex items-end justify-between gap-4">
                <p className="eyebrow">Revenue by Category</p>
                <Link
                  to="/admin/categories"
                  className="font-sans text-[0.68rem] uppercase tracking-luxe text-brass hover:text-ink"
                >
                  Manage categories
                </Link>
              </div>
              <div className="mt-5 border border-line bg-surface p-6">
                <div className="relative mx-auto h-48 max-w-[12rem]">
                  <Doughnut data={categoryChart} options={categoryChartOptions} />
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <span>
                      <span className="block font-display text-xl text-ink">{inr(categoryTotal)}</span>
                      <span className="block font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint">
                        {departmentCount} {departmentCount === 1 ? "department" : "departments"}
                      </span>
                    </span>
                  </div>
                </div>

                <ul className="mt-6 divide-y divide-line border-t border-line">
                  {departments.map((d, i) => {
                    const Row = d.filter ? Link : "div";
                    return (
                      <li key={d.name} className="py-3">
                        <Row
                          {...(d.filter ? { to: adminProductsLink(d.filter) } : {})}
                          className={`group flex items-center gap-3 font-sans text-sm ${d.filter ? "cursor-pointer" : ""}`}
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(i) }} aria-hidden="true" />
                          <span className={`min-w-0 flex-1 truncate text-ink ${d.filter ? "group-hover:text-brass" : ""}`}>{d.name}</span>
                          <span className="text-ink-faint">{share(d.revenue)}</span>
                          <span className="w-24 text-right text-ink">{inr(d.revenue)}</span>
                          <span className={`w-4 text-ink-faint ${d.filter ? "group-hover:text-brass" : "invisible"}`} aria-hidden="true">›</span>
                        </Row>
                        {d.children.length > 0 && (
                          <ul className="mt-1.5 flex flex-col">
                            {d.children.map((c) => {
                              const Sub = c.filter ? Link : "div";
                              return (
                                <li key={c.name}>
                                  <Sub
                                    {...(c.filter ? { to: adminProductsLink(c.filter) } : {})}
                                    className="group flex items-center gap-3 py-1 pl-5 font-sans text-xs"
                                  >
                                    <span className={`min-w-0 flex-1 truncate text-ink-soft ${c.filter ? "group-hover:text-brass" : ""}`}>{c.name}</span>
                                    <span className="text-ink-faint">{c.units} sold</span>
                                    <span className="w-24 text-right text-ink-soft">{inr(c.revenue)}</span>
                                    <span className={`w-4 text-ink-faint ${c.filter ? "group-hover:text-brass" : "invisible"}`} aria-hidden="true">›</span>
                                  </Sub>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ── Return reasons + stock ───────────────── */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {returnReasons.length > 0 && (
            <div>
              <p className="eyebrow">Why Customers Return</p>
              <div className="mt-5 h-80 border border-line bg-surface p-6">
                <Bar data={returnReasonsChart} options={horizontalOptions} />
              </div>
            </div>
          )}

          <div>
            <p className="eyebrow">Stock Split</p>
            <div className="mt-5 h-80 border border-line bg-surface p-6">
              <Doughnut data={stockChart} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* ── Order status + coupons ───────────────── */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {statusBreakdown.length > 0 && (
            <div>
              <p className="eyebrow">Order Status</p>
              <div className="mt-5 border border-line bg-surface p-6">
                {statusBreakdown.map((s) => {
                  const total = statusBreakdown.reduce(
                    (a, x) => a + x.count,
                    0,
                  );
                  const pct = total ? (s.count / total) * 100 : 0;
                  return (
                    <div key={s.status} className="mb-5 last:mb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-ink">
                          {s.status}
                        </span>
                        <span className="font-sans text-sm text-ink-soft">
                          {s.count} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1 w-full bg-line">
                        <div
                          className="h-1 bg-brass transition-all duration-700 ease-luxe"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {couponUsage.length > 0 && (
            <div>
              <p className="eyebrow">Coupon Performance</p>
              <div className="mt-5 border border-line bg-surface p-6">
                <div className="grid grid-cols-4 gap-3 border-b border-line pb-3">
                  <span className="eyebrow">Code</span>
                  <span className="eyebrow text-right">Orders</span>
                  <span className="eyebrow text-right">Revenue</span>
                  <span className="eyebrow text-right">Discount</span>
                </div>
                {couponUsage.map((c) => (
                  <div
                    key={c.code}
                    className="grid grid-cols-4 gap-3 border-b border-line py-3 last:border-0"
                  >
                    <span className="font-sans text-sm text-ink">{c.code}</span>
                    <span className="text-right font-sans text-sm text-ink-soft">
                      {c.orders}
                    </span>
                    <span className="text-right font-sans text-sm text-ink">
                      {inr(c.revenue)}
                    </span>
                    <span className="text-right font-sans text-sm text-danger">
                      −{inr(c.discount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Catalogue counts (all-time) ──────────── */}
        <div className="mt-14">
          <p className="eyebrow">Catalogue · All Time</p>
          <div className="mt-5 grid grid-cols-2 gap-6 lg:grid-cols-5">
            {counts.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="group border border-line bg-surface px-6 py-8 text-center transition-all duration-500 ease-luxe hover:border-brass hover:shadow-luxe-sm"
              >
                <p className="font-display text-4xl font-medium text-ink transition-colors group-hover:text-brass">
                  {s.value ?? 0}
                </p>
                <p className="eyebrow mt-2 !text-ink-faint group-hover:!text-brass">
                  {s.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default Dashboard;
