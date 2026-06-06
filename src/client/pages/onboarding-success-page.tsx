import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  DatabaseBackup,
  GithubIcon,
  Globe02Icon,
  Settings01Icon
} from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState } from "react";
import { api, type AuthStatus, type GitHubStatus, type R2SettingsStatus } from "../api";
import { BrandMark } from "../components/ui/brand-mark";
import { AppIcon, shellButton, statusClass } from "../components/ui/primitives";
import { usePageTitle } from "../lib/page-title";
import { wildcardRootDomain } from "../lib/root-domain";

type DomainSettings = Awaited<ReturnType<typeof api.systemSettings>>;

function statusTone(active: boolean) {
  return active ? statusClass("active") : statusClass("pending");
}

function hostnameUrl(hostname: string) {
  return `https://${hostname}`;
}

function SummaryRow({
  icon,
  label,
  value,
  status,
  active
}: {
  icon: unknown;
  label: string;
  value: string;
  status: string;
  active: boolean;
}) {
  return (
    <div className="grid gap-4 border border-zinc-800 bg-zinc-950/55 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center border border-[#4FB8B2]/30 bg-[#4FB8B2]/10 text-[#7fe3dd]">
          <AppIcon icon={icon} size={16} />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</div>
          <div className="mt-1 truncate text-sm font-semibold text-zinc-100">{value}</div>
        </div>
      </div>
      <span className={`w-fit px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${statusTone(active)}`}>
        {status}
      </span>
    </div>
  );
}

function SummarySkeletonRow() {
  return (
    <div className="grid gap-4 border border-zinc-800 bg-zinc-950/55 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="h-9 w-9 shrink-0 animate-pulse border border-zinc-800 bg-zinc-900" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-32 animate-pulse bg-zinc-800" />
          <div className="mt-3 h-4 w-2/3 animate-pulse bg-zinc-800" />
        </div>
      </div>
      <div className="h-6 w-24 animate-pulse bg-zinc-800" />
    </div>
  );
}

export function OnboardingSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [domainSettings, setDomainSettings] = useState<DomainSettings | null>(null);
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [r2Status, setR2Status] = useState<R2SettingsStatus | null>(null);
  const [error, setError] = useState("");
  usePageTitle("Onboarding Complete");

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      setLoading(true);
      try {
        const [auth, domains, github, r2] = await Promise.all([
          api.authStatus(),
          api.systemSettings(),
          api.githubStatus().catch(() => null),
          api.r2Settings().then((result) => result.r2).catch(() => null)
        ]);
        if (cancelled) return;
        setAuthStatus(auth);
        setDomainSettings(domains);
        setGithubStatus(github);
        setR2Status(r2);
      } catch (issue) {
        if (!cancelled) setError(issue instanceof Error ? issue.message : "Could not load setup summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardHostname = domainSettings?.settings.controlPlaneHostname ?? "";
  const rootDomain = domainSettings?.settings.rootDomain ?? "";
  const runtime = authStatus?.runtimeConfig;
  const dashboardDnsActive = Boolean(dashboardHostname && domainSettings?.controlPlaneDnsStatus === "active");
  const dashboardUrl = useMemo(() => {
    if (dashboardDnsActive) return hostnameUrl(dashboardHostname);
    if (runtime?.publicUrl) return runtime.publicUrl;
    return "/";
  }, [dashboardDnsActive, dashboardHostname, runtime?.publicUrl]);

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-zinc-950 px-5 py-8 text-zinc-100">
      <div aria-hidden className="hero-noise pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_0%_0%,rgba(79,184,178,0.12),transparent),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(120,113,255,0.08),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center border border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#4FB8B2]">
              <BrandMark />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#7fe3dd]">Setup complete</div>
              <h1 className="font-hero text-3xl tracking-tight text-zinc-100">You're all set up</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Aeroplane is ready. Here's what was configured during onboarding.
          </p>
        </header>

        {error ? <div className="border border-rose-500/35 bg-rose-950/30 px-4 py-3 font-mono text-xs text-rose-300">{error}</div> : null}

        <section className="grid gap-3">
          {loading ? (
            <>
              <SummarySkeletonRow />
              <SummarySkeletonRow />
              <SummarySkeletonRow />
              <SummarySkeletonRow />
              <SummarySkeletonRow />
              <SummarySkeletonRow />
            </>
          ) : (
            <>
              <SummaryRow
                icon={Globe02Icon}
                label="Dashboard domain"
                value={dashboardHostname || runtime?.publicUrl || "IP fallback"}
                status={dashboardHostname ? (dashboardDnsActive ? "DNS active" : "DNS pending") : "IP fallback"}
                active={dashboardDnsActive}
              />
              <SummaryRow
                icon={Globe02Icon}
                label="Wildcard root domain"
                value={rootDomain ? wildcardRootDomain(rootDomain) : "Not configured"}
                status={rootDomain ? (domainSettings?.dnsStatus === "active" ? "DNS active" : "DNS pending") : "Skipped"}
                active={Boolean(rootDomain && domainSettings?.dnsStatus === "active")}
              />
              <SummaryRow
                icon={GithubIcon}
                label="GitHub"
                value={githubStatus?.appConfigured ? "GitHub App configured" : "Not configured"}
                status={githubStatus?.connected ? "Connected" : githubStatus?.appConfigured ? "Configured" : "Skipped"}
                active={Boolean(githubStatus?.connected || githubStatus?.appConfigured)}
              />
              <SummaryRow
                icon={CloudUploadIcon}
                label="Cloudflare R2"
                value={r2Status?.connected ? `${r2Status.bucket} (${r2Status.accountId})` : "Not configured"}
                status={r2Status?.connected ? "Connected" : "Skipped"}
                active={Boolean(r2Status?.connected)}
              />
              <SummaryRow
                icon={DatabaseBackup}
                label="Automatic backups"
                value={domainSettings?.settings.databaseBackupsAutomaticEnabled ? "On for new databases" : "Off for new databases"}
                status={domainSettings?.settings.databaseBackupsAutomaticEnabled ? "Enabled" : "Disabled"}
                active={Boolean(domainSettings?.settings.databaseBackupsAutomaticEnabled)}
              />
              <SummaryRow
                icon={Settings01Icon}
                label="Runtime"
                value={runtime ? `${runtime.dataDir} / ${runtime.caddyConfigPath} / ${runtime.caddyDataDir}` : "Loading runtime settings"}
                status={runtime?.deployDryRun ? "Dry run" : "Live"}
                active={Boolean(runtime && !runtime.deployDryRun)}
              />
            </>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
            <AppIcon icon={CheckmarkCircle02Icon} size={14} />
            Setup saved
          </div>
          <button type="button" className={shellButton("primary")} disabled={loading} onClick={() => window.location.assign(dashboardUrl)}>
            Open {dashboardDnsActive ? "custom domain" : "dashboard"}
            <AppIcon icon={ArrowRight02Icon} size={15} />
          </button>
        </div>
      </div>
    </main>
  );
}
