import { Settings01Icon } from "@hugeicons/core-free-icons";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { SystemSettingsModal } from "../modals/system-settings-modal";
import { isSystemSettingsTab, type SystemSettingsTab } from "../modals/system-settings-types";
import { AppIcon } from "../ui/primitives";

function shouldHideSettingsButton(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/onboarding");
}

export function GlobalSystemSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const search = location.search as Record<string, unknown>;
  const settingsTab = isSystemSettingsTab(search.settings) ? search.settings : undefined;
  const activeTab = settingsTab ?? "root-domain";
  const open = Boolean(settingsTab);
  const hideSettingsButton = shouldHideSettingsButton(location.pathname);

  function updateSettingsTab(tab?: SystemSettingsTab) {
    void navigate({
      to: location.pathname,
      search: (current) => {
        const next = { ...current };
        if (tab) {
          next.settings = tab;
        } else {
          delete next.settings;
        }
        return next;
      }
    });
  }

  function closeSettings() {
    updateSettingsTab();
    window.dispatchEvent(new Event("aeroplane-system-settings-closed"));
  }

  return (
    <>
      {!hideSettingsButton && !open ? (
        <button
          type="button"
          className="fixed right-5 top-5 z-40 inline-flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-950/85 text-zinc-400 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:border-[#4FB8B2]/50 hover:bg-[#4FB8B2]/10 hover:text-[#7fe3dd]"
          title="System Settings"
          aria-label="System Settings"
          onClick={() => updateSettingsTab("root-domain")}
        >
          <AppIcon icon={Settings01Icon} size={16} />
        </button>
      ) : null}

      <SystemSettingsModal activeTab={activeTab} onTabChange={updateSettingsTab} open={open && !hideSettingsButton} onClose={closeSettings} />
    </>
  );
}
