import {
  Settings01Icon,
  Globe02Icon,
  CopyIcon,
  CopyCheckIcon,
  CheckmarkCircle02Icon
} from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { api } from "../../api";
import {
  AppIcon,
  FieldLabel,
  FormInput,
  SectionTitle,
  shellButton,
  surfaceClass
} from "../ui/primitives";

export function SystemSettingsModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [rootDomain, setRootDomain] = useState("");
  const [publicIp, setPublicIp] = useState("127.0.0.1");
  const [copiedIp, setCopiedIp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    async function loadSettings() {
      try {
        const res = await api.systemSettings();
        setRootDomain(res.settings.rootDomain);
        setPublicIp(res.publicIp || "127.0.0.1");
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    void loadSettings();
  }, [open]);

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText(publicIp);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 1500);
    } catch (err) {
      console.error("Failed to copy IP:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      await api.updateSystemSettings({ rootDomain });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-[94%] items-center justify-center lg:max-w-7xl">
        <div className={`${surfaceClass("flex h-[min(900px,calc(100vh-2rem))] min-h-[640px] w-full flex-col p-6 md:p-8")}`}>
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-zinc-800/90 pb-5">
            <SectionTitle
              icon={Settings01Icon}
              title="System Settings"
              meta="Configure global infrastructure parameters and default routing."
            />
            <button type="button" className={shellButton("ghost")} onClick={onClose}>
              Close
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] h-full">
              {/* Sidebar tabs */}
              <aside className="border-r border-zinc-800/80 pr-6 space-y-1">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-mono font-semibold uppercase tracking-wider bg-zinc-900 border border-zinc-700 text-[#4FB8B2]"
                >
                  <AppIcon icon={Globe02Icon} size={15} />
                  Root Domain
                </button>
              </aside>

              {/* Tab content - Root Domain */}
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Form */}
                <form onSubmit={handleSave} className="space-y-6">
                  <SectionTitle
                    icon={Globe02Icon}
                    title="Wildcard Root Domain"
                    meta="Automate secure URL allocations for all deployments."
                  />

                  <div className="space-y-5 pt-2">
                    <div>
                      <FieldLabel>Root Domain Name</FieldLabel>
                      <FormInput
                        value={rootDomain}
                        onChange={(e) => setRootDomain(e.target.value)}
                        placeholder="pilot.aeroplane.run"
                        required
                      />
                      <span className="text-[10px] text-zinc-500 font-mono mt-2 block leading-relaxed">
                        Every new app or database created will automatically receive a default subdomain like:
                        <code className="text-[#4FB8B2] bg-zinc-900 px-1.5 py-0.5 rounded ml-1">
                          {"{slug}"}.{rootDomain || "root-domain"}
                        </code>
                      </span>
                    </div>

                    {error && (
                      <div className="border border-rose-500/35 bg-rose-950/30 px-3.5 py-2.5 font-mono text-[10px] text-rose-300">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="border border-emerald-500/35 bg-emerald-950/30 px-3.5 py-2.5 font-mono text-[10px] text-emerald-400 flex items-center gap-2">
                        <AppIcon icon={CheckmarkCircle02Icon} size={13} />
                        Settings saved successfully!
                      </div>
                    )}

                    <button
                      type="submit"
                      className={`${shellButton("primary")} w-full py-3`}
                      disabled={busy}
                    >
                      {busy ? "Saving..." : "Save Settings"}
                    </button>
                  </div>
                </form>

                {/* DNS Configuration Instructions */}
                <div className="border border-zinc-800 bg-zinc-900/10 p-6 space-y-5 font-sans text-xs">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-300">
                      🌐 Wildcard DNS Setup Instructions
                    </h4>
                    <p className="text-zinc-400 leading-relaxed">
                      To route all automatically provisioned system subdomains, configure a **Wildcard A Record** at your domain registrar (Cloudflare, Namecheap, Route 53, etc.) using these details:
                    </p>
                  </div>

                  <div className="border border-zinc-800 overflow-hidden font-mono text-[11px] rounded bg-zinc-950/45">
                    <div className="grid grid-cols-[60px_220px_1fr] bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 text-zinc-500 font-semibold uppercase tracking-wider text-[9px]">
                      <div>Type</div>
                      <div>Host</div>
                      <div>Points To</div>
                    </div>
                    <div className="grid grid-cols-[60px_220px_1fr] items-center px-4 py-3.5 text-zinc-300">
                      <div className="font-semibold text-[#4FB8B2]">A</div>
                      <div className="bg-zinc-900/60 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] w-fit max-w-[200px] truncate font-bold select-all" title={`*.${rootDomain || "pilot.aeroplane.run"}`}>
                        *.{rootDomain || "pilot.aeroplane.run"}
                      </div>
                      <div className="flex items-center gap-2 truncate font-semibold text-zinc-100 pl-1">
                        <span className="select-all">{publicIp}</span>
                        <button
                          type="button"
                          onClick={handleCopyIp}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                          title={copiedIp ? "Copied!" : "Copy IP"}
                        >
                          <AppIcon icon={copiedIp ? CopyCheckIcon : CopyIcon} size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800/80 pt-4 text-[10px] text-zinc-500 leading-relaxed space-y-3">
                    <p>
                      👉 The wildcard character <code className="text-zinc-400 bg-zinc-900/80 px-1 font-mono">*</code> matches any subdomain requested by a client (e.g. <code className="text-[#4FB8B2]">my-db.pilot.aeroplane.run</code>).
                    </p>
                    <p>
                      🛡️ Caddy reverse-proxy will automatically intercept wildcard hits, locate the active container port by slug matching, and dynamically register/provision separate SSL/TLS certificates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
