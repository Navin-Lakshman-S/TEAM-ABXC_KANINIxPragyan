"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  LayoutDashboard,
  UserPlus,
  FileText,
  Building2,
  Heart,
  Sparkles,
  Clock,
  Zap,
  Scale,
  Globe,
  Hospital,
  Brain,
} from "lucide-react";
import { useI18n, LANGUAGES } from "@/lib/i18n";

export function Sidebar() {
  const path = usePathname();
  const { lang, setLang, t } = useI18n();
  const [time, setTime] = useState("");

  const nav = [
    { href: "/triage", label: t("nav.triage"), icon: UserPlus, accent: true },
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/patients", label: t("nav.patients"), icon: FileText },
    { href: "/resources", label: t("nav.resources"), icon: Building2 },
    { href: "/wearable", label: t("nav.wearable"), icon: Heart },
    { href: "/fairness", label: t("nav.fairness"), icon: Scale },
    { href: "/drift", label: t("nav.drift"), icon: Brain },
    { href: "/manage", label: t("nav.manage"), icon: Hospital },
  ];

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="w-[272px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col shrink-0 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 -right-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand */}
      <div className="px-6 py-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/10">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-white flex items-center gap-1.5">
              Vigil <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {t("sidebar.brand")}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 relative z-10">
        {nav.map((item) => {
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white shadow-sm ring-1 ring-blue-500/20"
                  : item.accent
                  ? "text-slate-400 hover:bg-white/5 hover:text-blue-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                active
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-slate-500 group-hover:text-slate-300"
              }`}>
                <item.icon className="w-[18px] h-[18px]" />
              </div>
              {item.label}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 space-y-3 relative z-10">
        {/* Language selector */}
        <div className="px-1">
          <div className="flex items-center gap-2 px-3 mb-2 text-xs text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <span className="font-medium">{t("nav.language")}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 px-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                  lang === l.code
                    ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                    : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>
        {/* Live clock */}
        {time && (
          <div className="flex items-center gap-2 px-3 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono tracking-wider">{time}</span>
          </div>
        )}
        {/* Engine badge */}
        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-3.5 ring-1 ring-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-xs font-semibold text-blue-300">{t("sidebar.engine")}</p>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            {t("sidebar.engineDesc")}
          </p>
        </div>
      </div>
    </aside>
  );
}
