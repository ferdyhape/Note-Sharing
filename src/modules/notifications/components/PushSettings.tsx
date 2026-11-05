"use client";

import { useState } from "react";
import type { PushDeviceDTO } from "@/modules/notifications/types";

const ACTION_CLASS =
  "min-h-11 rounded-control border border-control px-3 text-[13px] font-medium text-text hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-9";

function applicationServerKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

async function endpointHash(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).replace(/^([0-9a-f])$/, "0$1"),
  ).join("");
}

function deviceDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-ID", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "Not seen yet";
}

export function PushSettings({
  initialDevices,
  publicKey,
  configured,
}: {
  initialDevices: PushDeviceDTO[];
  publicKey: string;
  configured: boolean;
}) {
  const [devices, setDevices] = useState(initialDevices);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enablePush() {
    setWorking(true);
    setStatus(null);
    setError(null);
    try {
      const supported =
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;
      if (!supported) throw new Error("Browser push is not supported in this browser.");
      if (!configured || !publicKey) {
        throw new Error(
          "Push needs NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.",
        );
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      const serialized = subscription.toJSON();
      if (!serialized.keys?.p256dh || !serialized.keys.auth) {
        throw new Error("The browser returned an incomplete push subscription.");
      }

      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: serialized.keys,
          userAgent: navigator.userAgent,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not save this device.");
      setDevices(result.data as PushDeviceDTO[]);
      setStatus("Push enabled for this browser.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not enable browser push.");
    } finally {
      setWorking(false);
    }
  }

  async function revokeDevice(device: PushDeviceDTO) {
    setWorking(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch(`/api/push-subscriptions/${device.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not revoke this device.");

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription && (await endpointHash(subscription.endpoint)) === device.endpointHash) {
          await subscription.unsubscribe();
        }
      }
      setDevices((current) => current.filter((item) => item.id !== device.id));
      setStatus("Device revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke this device.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="border-t border-rule py-6" aria-labelledby="push-heading">
      <div className="grid gap-4 min-[900px]:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] min-[900px]:gap-8">
        <div>
          <h2 id="push-heading" className="text-[16px] font-medium text-text">
            Browser notifications
          </h2>
          <p className="mt-1 text-[14px] text-muted">Push alerts for this account</p>
        </div>
        <div className="rounded-card bg-raised p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              {configured && publicKey
                ? "Push permission is requested only after you enable a browser."
                : "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT in .env or Vercel."}
            </p>
            <button
              type="button"
              onClick={() => void enablePush()}
              disabled={working || !configured || !publicKey}
              className="min-h-11 rounded-control bg-text px-3 text-[13px] font-medium text-ground disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-9"
            >
              {working ? "Working…" : "Enable this browser"}
            </button>
          </div>
          {status && (
            <p role="status" className="mt-3 text-[13px] text-positive">
              {status}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-[13px] text-negative">
              {error}
            </p>
          )}

          <h3 className="mt-5 border-t border-rule pt-4 text-[13px] font-medium text-text">
            Registered devices ({devices.length})
          </h3>
          {devices.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">No devices registered.</p>
          ) : (
            <ul className="mt-2 divide-y divide-rule">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-medium text-text">
                      {device.userAgent ?? "Browser device"}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">
                      Last seen {deviceDate(device.lastSeenAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revokeDevice(device)}
                    disabled={working}
                    className={ACTION_CLASS}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
