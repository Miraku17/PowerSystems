"use client";

import { useState } from "react";
import { ArrowDownTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useIsOnline } from "@/stores/networkStore";

interface WarmCacheResult {
  ok: number;
  total: number;
  failed: Array<{ url: string; status?: number; error?: string }>;
}

/**
 * Pre-warms the service-worker caches (HTML pages + lookup API GETs) so the
 * app is usable on this device when there's no internet. Shown in places where
 * a field tech is preparing to go offline.
 *
 * The actual caching happens in `public/sw.js` in response to the
 * `WARM_OFFLINE_CACHE` message; we post the user's bearer token via a
 * MessageChannel so the SW can fetch authenticated endpoints with it.
 */
export default function InstallForOfflineButton() {
  const isOnline = useIsOnline();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    if (!isOnline) {
      toast.error("You're offline — connect first, then try again.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) {
      toast.error("Service worker isn't ready yet. Reload the page and try again.");
      return;
    }

    setBusy(true);
    const loadingToast = toast.loading("Caching pages and lookup data for offline use…");
    try {
      const token = localStorage.getItem("authToken") || undefined;
      const result = await new Promise<WarmCacheResult>((resolve, reject) => {
        const channel = new MessageChannel();
        const timeout = setTimeout(() => reject(new Error("timeout")), 30_000);
        channel.port1.onmessage = (e) => {
          clearTimeout(timeout);
          resolve(e.data as WarmCacheResult);
        };
        navigator.serviceWorker.controller!.postMessage(
          { type: "WARM_OFFLINE_CACHE", token },
          [channel.port2]
        );
      });

      toast.dismiss(loadingToast);
      if (result.failed.length === 0) {
        toast.success(`Cached ${result.ok} resource${result.ok !== 1 ? "s" : ""} for offline use.`);
      } else {
        toast(
          `Cached ${result.ok} of ${result.total}. ${result.failed.length} failed; the app may not work fully offline.`,
          { icon: "⚠️", duration: 6_000 }
        );
        // eslint-disable-next-line no-console
        console.warn("Offline cache failures:", result.failed);
      }
    } catch (e: any) {
      toast.dismiss(loadingToast);
      toast.error(`Failed to install offline cache: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border border-[#2B4C7E] bg-white px-4 py-2 text-sm font-semibold text-[#2B4C7E] hover:bg-[#2B4C7E] hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      title="Pre-cache pages and lookup data so the app works on this device when offline"
    >
      {busy ? (
        <>
          <CheckCircleIcon className="h-4 w-4 animate-pulse" />
          Caching…
        </>
      ) : !isOnline ? (
        <>
          <ExclamationTriangleIcon className="h-4 w-4" />
          Connect to install for offline
        </>
      ) : (
        <>
          <ArrowDownTrayIcon className="h-4 w-4" />
          Install for offline
        </>
      )}
    </button>
  );
}
