"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle, Zap } from "lucide-react";

type Device = {
  id: string;
  name: string;
};

type DeviceLink = {
  device_id: string;
  pulses_per_session: number;
  inventory_devices?: { name: string } | null;
};

type Props = {
  serviceId: number;
  authHeaders: Record<string, string>;
};

export default function ServiceDeviceEditor({ serviceId, authHeaders }: Props) {
  const [links, setLinks] = useState<DeviceLink[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [newDeviceId, setNewDeviceId] = useState("");
  const [newPulses, setNewPulses] = useState("1");

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [linksRes, devicesRes] = await Promise.all([
        fetch(`/api/service-devices?serviceId=${serviceId}`, { headers: authHeaders }),
        fetch("/api/inventory/devices", { headers: authHeaders }),
      ]);
      const linksJson = await linksRes.json();
      const devicesJson = await devicesRes.json();

      if (!linksRes.ok) throw new Error(linksJson.error || "Failed to load device links.");
      if (!devicesRes.ok) throw new Error(devicesJson.error || "Failed to load devices.");

      setLinks(linksJson.deviceLinks || []);
      setDevices(devicesJson.devices || []);
      setDirty(false);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load device links.");
    } finally {
      setLoading(false);
    }
  }

  const usedDeviceIds = new Set(links.map((l) => l.device_id));
  const pickableDevices = devices.filter((d) => !usedDeviceIds.has(d.id));

  function addLink() {
    if (!newDeviceId) return;
    const pulses = Number(newPulses);
    if (!Number.isInteger(pulses) || pulses <= 0) {
      setError("Pulses per session must be a positive whole number.");
      return;
    }
    const device = devices.find((d) => d.id === newDeviceId);
    setLinks((prev) => [
      ...prev,
      {
        device_id: newDeviceId,
        pulses_per_session: pulses,
        inventory_devices: device ? { name: device.name } : null,
      },
    ]);
    setNewDeviceId("");
    setNewPulses("1");
    setDirty(true);
    setError(null);
  }

  function removeLink(deviceId: string) {
    setLinks((prev) => prev.filter((l) => l.device_id !== deviceId));
    setDirty(true);
  }

  function updatePulses(deviceId: string, pulses: number) {
    setLinks((prev) => prev.map((l) => (l.device_id === deviceId ? { ...l, pulses_per_session: pulses } : l)));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/service-devices", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          serviceId,
          items: links.map((l) => ({ deviceId: l.device_id, pulsesPerSession: l.pulses_per_session })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save device links.");
      setDirty(false);
      await loadAll();
    } catch (e: any) {
      setError(e.message || "Failed to save device links.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#414E36]/10 bg-[#FBFBF9] p-4 space-y-3">
      <div className="flex items-center gap-2 text-[#414E36] font-semibold text-xs uppercase tracking-wider">
        <Zap size={14} /> Devices &amp; Pulses Per Session
      </div>
      <p className="text-[11px] text-[#8C9A84]">
        Clinic devices used by one session of this service, and how many pulses each session
        delivers. Drives the per-session device cost (lamp replacement cost ÷ rated pulses × pulses
        used).
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-[#5A6A51]">Loading device links...</p>
      ) : (
        <>
          {links.length === 0 ? (
            <p className="text-xs text-[#5A6A51] italic">No devices attached to this service yet.</p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.device_id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-[#1F251A] font-medium truncate">
                    {link.inventory_devices?.name || link.device_id}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={link.pulses_per_session}
                    onChange={(e) => updatePulses(link.device_id, Number(e.target.value) || 0)}
                    className="w-24 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
                  />
                  <span className="text-xs text-[#5A6A51] w-16">pulses</span>
                  <button
                    type="button"
                    onClick={() => removeLink(link.device_id)}
                    className="rounded-lg border border-rose-100 p-1.5 text-rose-600 transition hover:bg-rose-50"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-[#414E36]/10">
            <select
              value={newDeviceId}
              onChange={(e) => setNewDeviceId(e.target.value)}
              className="flex-1 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
            >
              <option value="">
                {pickableDevices.length === 0 ? "No more devices available" : "Select device..."}
              </option>
              {pickableDevices.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="1"
              value={newPulses}
              onChange={(e) => setNewPulses(e.target.value)}
              placeholder="Pulses"
              className="w-24 rounded-lg border border-[#414E36]/15 bg-white px-2.5 py-1.5 text-sm text-[#1F251A] focus:outline-none focus:ring-2 focus:ring-[#414E36]"
            />
            <button
              type="button"
              onClick={addLink}
              disabled={!newDeviceId}
              className="inline-flex items-center gap-1 rounded-lg bg-[#414E36] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2e3a26] disabled:opacity-40"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="w-full rounded-lg bg-[#414E36] py-2 text-xs font-semibold text-white transition hover:bg-[#2e3a26] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Device Links"}
          </button>
        </>
      )}
    </div>
  );
}
