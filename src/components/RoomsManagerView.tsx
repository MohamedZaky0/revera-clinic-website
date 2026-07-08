"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Settings, X, Search, Info } from "lucide-react";
import { useAlertConfirm } from "@/contexts/AlertConfirmContext";
import { cachedFetch, clearFetchCache } from "@/lib/fetchCache";

type Room = {
  id: string;
  name: string;
  type: 'clinical' | 'administrative';
  status: 'available' | 'on_cleaning' | 'needs_cleaning' | 'has_issue';
  branchId: string;
  branchNameEn: string;
  branchNameAr: string;
};

type Branch = {
  id: string;
  name_en: string;
  name_ar: string;
};

type ServiceItem = {
  id: number;
  en: string;
  ar: string;
  cat?: string;
};

type Props = {
  branches: Branch[];
  services: ServiceItem[];
  selectedBranchId: string;
};

export default function RoomsManagerView({ branches, services, selectedBranchId }: Props) {
  const { showConfirm } = useAlertConfirm();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [roomModal, setRoomModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    room: Partial<Room>;
  }>({
    open: false,
    mode: "add",
    room: {},
  });

  const [mappingModal, setMappingModal] = useState<{
    open: boolean;
    room: Room | null;
    selectedServiceIds: number[];
  }>({
    open: false,
    room: null,
    selectedServiceIds: [],
  });

  const [savingRoom, setSavingRoom] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    setLoading(true);
    try {
      const data = await cachedFetch("/api/rooms", 5000);
      setRooms(data);
    } catch (e) {
      console.error("Failed to fetch rooms:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRoom(e: React.FormEvent) {
    e.preventDefault();
    const r = roomModal.room;
    if (!r.name || !r.type || !r.branchId) {
      alert("Please fill all required fields.");
      return;
    }

    setSavingRoom(true);
    try {
      const url = roomModal.mode === "add" ? "/api/rooms" : `/api/rooms?id=${r.id}`;
      const method = roomModal.mode === "add" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: r.name,
          type: r.type,
          status: r.status || "available",
          branchId: r.branchId,
        }),
      });

      if (res.ok) {
        setRoomModal({ open: false, mode: "add", room: {} });
        clearFetchCache();
        fetchRooms();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to save room.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving room.");
    } finally {
      setSavingRoom(false);
    }
  }

  async function handleDeleteRoom(id: string) {
    const confirmed = await showConfirm("Are you sure you want to delete this room? This will also remove any service mappings.");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        clearFetchCache();
        fetchRooms();
      } else {
        alert("Failed to delete room.");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function openMappingModal(room: Room) {
    setMappingModal({ open: true, room, selectedServiceIds: [] });
    try {
      const res = await fetch(`/api/service-rooms?roomId=${room.id}`);
      if (res.ok) {
        const data = await res.json();
        const serviceIds = data.map((item: any) => item.service_id);
        setMappingModal(prev => ({ ...prev, selectedServiceIds: serviceIds }));
      }
    } catch (e) {
      console.error("Failed to load mappings:", e);
    }
  }

  async function handleSaveMapping() {
    const { room, selectedServiceIds } = mappingModal;
    if (!room) return;

    setSavingMapping(true);
    try {
      const res = await fetch("/api/service-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          serviceIds: selectedServiceIds,
        }),
      });

      if (res.ok) {
        setMappingModal({ open: false, room: null, selectedServiceIds: [] });
        clearFetchCache();
      } else {
        alert("Failed to save service mappings.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving mappings.");
    } finally {
      setSavingMapping(false);
    }
  }

  function toggleServiceInMapping(serviceId: number) {
    setMappingModal(prev => {
      const ids = [...prev.selectedServiceIds];
      const idx = ids.indexOf(serviceId);
      if (idx > -1) {
        ids.splice(idx, 1);
      } else {
        ids.push(serviceId);
      }
      return { ...prev, selectedServiceIds: ids };
    });
  }

  const filteredRooms = rooms.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchBranch = selectedBranchId === "all" || r.branchId === selectedBranchId;
    return matchSearch && matchBranch;
  });

  const getStatusBadge = (status: Room['status']) => {
    switch (status) {
      case 'available':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 border border-green-200">Available</span>;
      case 'on_cleaning':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">Cleaning</span>;
      case 'needs_cleaning':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 border border-yellow-200">Needs Cleaning</span>;
      case 'has_issue':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">Out of Order</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold text-[#1F251A]">Rooms</h2>
          <p className="mt-2 text-sm text-[#5A6A51]">Manage administrative and clinical rooms, their status, and service compatibility mappings.</p>
        </div>
        <button
          onClick={() => setRoomModal({ open: true, mode: "add", room: { status: "available", type: "clinical", branchId: selectedBranchId } })}
          className="inline-flex items-center gap-2 rounded-3xl bg-[#414E36] px-5 py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26]"
        >
          <Plus size={16} /> Add Room
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-[#EDF1EC]/30 p-4 rounded-2xl border border-[#414E36]/10">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A51]" />
          <input
            type="text"
            placeholder="Search room name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#414E36]/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#414E36]"
          />
        </div>
      </div>

      {/* Rooms Table / Grid */}
      {loading ? (
        <div className="text-center py-16 text-[#5A6A51]">Loading rooms data...</div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 text-[#5A6A51]">
          <Info size={40} className="mx-auto mb-3 opacity-30 text-[#414E36]" />
          <p className="text-sm font-medium">No rooms match your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#414E36]/10 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F9F9F7] border-b border-[#414E36]/10">
                  <th className="px-6 py-4 font-semibold text-[#414E36]">Room Name</th>
                  <th className="px-6 py-4 font-semibold text-[#414E36]">Branch</th>
                  <th className="px-6 py-4 font-semibold text-[#414E36]">Type</th>
                  <th className="px-6 py-4 font-semibold text-[#414E36]">Status</th>
                  <th className="px-6 py-4 font-semibold text-[#414E36] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#414E36]/5">
                {filteredRooms.map(r => (
                  <tr key={r.id} className="hover:bg-[#F9F9F7]/50 transition">
                    <td className="px-6 py-4 font-medium text-[#1F251A]">{r.name}</td>
                    <td className="px-6 py-4 text-[#5A6A51]">{r.branchNameEn}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border capitalize ${
                        r.type === 'clinical' ? 'bg-[#EDF1EC] text-[#414E36] border-[#414E36]/20' : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {r.type === 'clinical' && (
                          <button
                            onClick={() => openMappingModal(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#414E36]/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#414E36] hover:bg-[#EDF1EC] transition"
                            title="Map services to this room"
                          >
                            <Settings size={13} />
                            Services
                          </button>
                        )}
                        <button
                          onClick={() => setRoomModal({ open: true, mode: "edit", room: r })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
                          title="Edit Room"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                          title="Delete Room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Add/Edit Modal */}
      {roomModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#414E36]/10">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4 mb-4">
              <h3 className="text-xl font-bold text-[#1F251A]">{roomModal.mode === "add" ? "Add New Room" : "Edit Room"}</h3>
              <button
                onClick={() => setRoomModal({ open: false, mode: "add", room: {} })}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 102 / Laser Room B"
                  value={roomModal.room.name || ""}
                  onChange={(e) => setRoomModal(prev => ({ ...prev, room: { ...prev.room, name: e.target.value } }))}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Branch *</label>
                <select
                  required
                  value={roomModal.room.branchId || ""}
                  onChange={(e) => setRoomModal(prev => ({ ...prev, room: { ...prev.room, branchId: e.target.value } }))}
                  className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#414E36]"
                >
                  <option value="" disabled>Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name_en}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Room Type *</label>
                  <select
                    required
                    value={roomModal.room.type || "clinical"}
                    onChange={(e) => setRoomModal(prev => ({ ...prev, room: { ...prev.room, type: e.target.value as any } }))}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#414E36]"
                  >
                    <option value="clinical">Clinical</option>
                    <option value="administrative">Administrative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A6A51] uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={roomModal.room.status || "available"}
                    onChange={(e) => setRoomModal(prev => ({ ...prev, room: { ...prev.room, status: e.target.value as any } }))}
                    className="w-full rounded-xl border border-[#414E36]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#414E36]"
                  >
                    <option value="available">Available</option>
                    <option value="on_cleaning">On Cleaning</option>
                    <option value="needs_cleaning">Needs Cleaning</option>
                    <option value="has_issue">Out of Order</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingRoom}
                className="w-full rounded-3xl bg-[#414E36] py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 mt-2"
              >
                {savingRoom ? "Saving..." : roomModal.mode === "add" ? "Create Room" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Services-Rooms Mapping Modal */}
      {mappingModal.open && mappingModal.room && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-[#414E36]/10 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#414E36]/10 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#1F251A]">Configure Room Services</h3>
                <p className="text-xs text-[#5A6A51] mt-0.5">Select which services can be performed inside <strong>{mappingModal.room.name}</strong>.</p>
              </div>
              <button
                onClick={() => setMappingModal({ open: false, room: null, selectedServiceIds: [] })}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-6">
              {services.length === 0 ? (
                <p className="text-sm text-center py-6 text-[#5A6A51]">No services found in database.</p>
              ) : (
                services.map(s => {
                  const checked = mappingModal.selectedServiceIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer select-none ${
                        checked
                          ? "border-[#414E36] bg-[#EDF1EC]/20 text-[#1F251A]"
                          : "border-gray-100 hover:border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-semibold">{s.en}</span>
                        {s.cat && (
                          <span className="ml-2.5 inline-flex items-center rounded bg-[#414E36]/8 px-1.5 py-0.5 text-[10px] font-medium text-[#414E36] border border-[#414E36]/10 capitalize">
                            {s.cat}
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleServiceInMapping(s.id)}
                        className="h-4.5 w-4.5 rounded border-[#414E36]/30 text-[#414E36] focus:ring-[#414E36] accent-[#414E36] cursor-pointer"
                      />
                    </label>
                  );
                })
              )}
            </div>

            <button
              onClick={handleSaveMapping}
              disabled={savingMapping}
              className="w-full rounded-3xl bg-[#414E36] py-3 text-sm font-semibold text-[#FBFBF9] transition hover:bg-[#2e3a26] disabled:opacity-50 mt-auto"
            >
              {savingMapping ? "Saving Mappings..." : "Save Mappings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
