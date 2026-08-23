"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { clearFetchCache } from "@/lib/fetchCache";

const PERMISSION_STRUCTURE = [
  {
    category: "Bookings Management",
    prefix: "bookings",
    items: [
      { key: "bookings.view_calendar", label: "View Calendar" },
      { key: "bookings.view_list", label: "View Bookings List" },
      { key: "bookings.create", label: "Create Bookings" },
      { key: "bookings.edit", label: "Edit/Reschedule Bookings" },
      { key: "bookings.approve_reject", label: "Approve/Reject Requests" },
      { key: "bookings.delete", label: "Delete/Cancel Bookings" }
    ]
  },
  {
    category: "Customer Management",
    prefix: "customers",
    items: [
      { key: "customers.view", label: "View Customer Profiles" },
      { key: "customers.create", label: "Create Patients" },
      { key: "customers.edit", label: "Edit Patients" },
      { key: "customers.delete", label: "Delete Patients" },
      { key: "customers.import", label: "Import Patients (CSV)" }
    ]
  },
  {
    category: "Doctor Management",
    prefix: "providers",
    items: [
      { key: "providers.view", label: "View Doctor Profiles" },
      { key: "providers.create", label: "Add New Doctors" },
      { key: "providers.edit", label: "Edit Provider Details" },
      { key: "providers.delete", label: "Delete Doctors" },
      { key: "providers.attendance", label: "Manage Doctor Attendance" }
    ]
  },
  {
    category: "Services Management",
    prefix: "services",
    items: [
      { key: "services.view", label: "View Services List" },
      { key: "services.create", label: "Create Services & Categories" },
      { key: "services.edit", label: "Edit Services & Toggle Status" },
      { key: "services.delete", label: "Delete Services" }
    ]
  },
  {
    category: "Employees & Staff",
    prefix: "employees",
    items: [
      { key: "employees.view", label: "View Employee Directory" },
      { key: "employees.create", label: "Add & Provision Employees" },
      { key: "employees.edit", label: "Edit Employee Details & Roles" },
      { key: "employees.delete", label: "Delete / Deactivate Employees" }
    ]
  },
  {
    category: "Inventory & Equipment",
    prefix: "inventory",
    items: [
      { key: "inventory.view", label: "View Inventory & Stock Levels" },
      { key: "inventory.manage_devices", label: "Manage Laser Devices & Pulses" },
      { key: "inventory.manage_products", label: "Manage Products & Pricing" },
      { key: "inventory.manage_suppliers", label: "Manage Suppliers & Orders" }
    ]
  },
  {
    category: "HR & Attendance",
    prefix: "hr",
    items: [
      { key: "hr.view_attendance", label: "View Shift Logs & GPS Check-ins" },
      { key: "hr.manage_attendance", label: "Approve / Override Attendance" },
      { key: "hr.manage_payroll", label: "View & Process Staff Payroll" }
    ]
  },
  {
    category: "Marketing & Campaigns",
    prefix: "marketing",
    items: [
      { key: "marketing.view_campaigns", label: "View Marketing Campaigns" },
      { key: "marketing.manage_campaigns", label: "Create & Send Broadcasts" },
      { key: "marketing.manage_discounts", label: "Manage Discounts & Offers" }
    ]
  },
  {
    category: "Customer Support",
    prefix: "support",
    items: [
      { key: "support.view_tickets", label: "View Support Tickets" },
      { key: "support.manage_tickets", label: "Respond & Resolve Tickets" }
    ]
  },
  {
    category: "Reports & Analytics",
    prefix: "reports",
    items: [
      { key: "reports.view_analytics", label: "View Operational Analytics" },
      { key: "reports.export_reports", label: "Export Business Data Reports" }
    ]
  },
  {
    category: "Settings & System Control",
    prefix: "settings",
    items: [
      { key: "settings.sms", label: "Configure SMS Gateway" },
      { key: "settings.medical_forms", label: "Manage Medical Forms" },
      { key: "settings.roles", label: "Manage Employee Roles & Accounts" },
      { key: "settings.profile", label: "Manage Company Profile" },
      { key: "settings.service_hours", label: "Manage Service Hours" },
      { key: "settings.branches", label: "Manage Branches" },
      { key: "settings.booking_settings", label: "Manage Booking Settings" },
      { key: "settings.terms", label: "Manage Terms & Conditions" },
      { key: "settings.notification", label: "Manage Notification Settings" },
      { key: "settings.queue", label: "Manage Queue Settings" },
      { key: "settings.pages", label: "Manage Pages Settings (CMS)" },
      { key: "settings.medical_records", label: "Manage Medical Records Intake Templates" },
      { key: "settings.test_suite", label: "Run System Test Suite" }
    ]
  },
  {
    category: "Finance",
    prefix: "finance",
    items: [
      { key: "finance.view_pnl", label: "View P&L" },
      { key: "finance.view_margins", label: "View Service/Doctor/Branch Margins" },
      { key: "finance.view_cashflow", label: "View Cash Flow" },
      { key: "finance.manage_expenses", label: "Manage Expenses & Recurring Expenses" },
      { key: "finance.manage_assets", label: "Manage Fixed Assets & Depreciation" },
      { key: "finance.manage_loans", label: "Manage Loans" },
      { key: "finance.view_capacity", label: "View Capacity & Service Mix" }
    ]
  }
];

interface RoleManagementViewProps {
  rolesList: any[];
  employeesList: any[];
  loadingRolesAndEmployees: boolean;
  newEmployeeName: string;
  setNewEmployeeName: (v: string) => void;
  newEmployeeEmail: string;
  setNewEmployeeEmail: (v: string) => void;
  newEmployeeRole: string;
  setNewEmployeeRole: (v: string) => void;
  employeeCreateError: string;
  setEmployeeCreateError: (v: string) => void;
  employeeCreateSuccess: string;
  setEmployeeCreateSuccess: (v: string) => void;
  departmentsList: string[];
  setDepartmentsList: (v: string[]) => void;
  adminRole: string | null;
  session: any;
  authenticatedJsonHeaders: Record<string, string>;
  showConfirm: (message: string) => Promise<boolean>;
  handleDeleteEmployee: (id: string) => Promise<void>;
  handleResendInvitation: (id: string) => Promise<void>;
  fetchRolesAndEmployees: () => Promise<void>;
}

export default function RoleManagementView({
  rolesList,
  employeesList,
  loadingRolesAndEmployees,
  newEmployeeName,
  setNewEmployeeName,
  newEmployeeEmail,
  setNewEmployeeEmail,
  newEmployeeRole,
  setNewEmployeeRole,
  employeeCreateError,
  setEmployeeCreateError,
  employeeCreateSuccess,
  setEmployeeCreateSuccess,
  departmentsList,
  setDepartmentsList,
  adminRole,
  session,
  authenticatedJsonHeaders,
  showConfirm,
  handleDeleteEmployee,
  handleResendInvitation,
  fetchRolesAndEmployees,
}: RoleManagementViewProps) {
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [roleCreateError, setRoleCreateError] = useState("");
  const [roleCreateSuccess, setRoleCreateSuccess] = useState("");
  const [newDeptInput, setNewDeptInput] = useState("");

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setRoleCreateError("");
    setRoleCreateSuccess("");

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ name: newRoleName, permissions: newRolePermissions })
      });

      if (res.ok) {
        setNewRoleName("");
        setNewRolePermissions([]);
        setRoleCreateSuccess("Role saved successfully!");
        fetchRolesAndEmployees();
        setTimeout(() => setRoleCreateSuccess(""), 3000);
      } else {
        const data = await res.json();
        setRoleCreateError(data.error || "Failed to create role.");
      }
    } catch (err: any) {
      setRoleCreateError(err.message || "Network error.");
    }
  }

  async function handleDeleteRole(name: string) {
    if (!(await showConfirm(`Are you sure you want to delete the role '${name}'? This will disconnect employee accounts assigned to this role.`))) return;
    try {
      const res = await fetch(`/api/roles?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
      });
      if (res.ok) {
        fetchRolesAndEmployees();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete role.");
      }
    } catch (err: any) {
      alert("Error deleting role: " + err.message);
    }
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmployeeName.trim() || !newEmployeeEmail.trim() || !newEmployeeRole) return;
    if (!emailRegex.test(newEmployeeEmail.trim())) {
      setEmployeeCreateError("Please enter a valid email address.");
      return;
    }
    setEmployeeCreateError("");
    setEmployeeCreateSuccess("");

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          email: newEmployeeEmail.trim().toLowerCase(),
          name: newEmployeeName.trim(),
          roleName: newEmployeeRole,
        })
      });

      if (res.ok) {
        setNewEmployeeEmail("");
        setNewEmployeeName("");
        setNewEmployeeRole("");
        setEmployeeCreateSuccess(`Invitation sent to ${newEmployeeEmail.trim()}! They will receive an email to set their password.`);
        clearFetchCache();
        fetchRolesAndEmployees();
        setTimeout(() => setEmployeeCreateSuccess(""), 6000);
      } else {
        const data = await res.json();
        setEmployeeCreateError(data.error || "Failed to send invitation.");
      }
    } catch (err: any) {
      setEmployeeCreateError(err.message || "Network error.");
    }
  }

  async function handleUpdateEmployeeRole(id: string, newRole: string) {
    try {
      const res = await fetch('/api/employees', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ id, roleName: newRole }),
      });
      if (res.ok) {
        fetchRolesAndEmployees();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update employee role.");
      }
    } catch (err: any) {
      alert("Error updating employee role: " + err.message);
    }
  }

  async function handleSaveDepartments(newList: string[]) {
    setDepartmentsList(newList);
    try {
      const res = await fetch("/api/page-settings", {
        method: "POST",
        headers: authenticatedJsonHeaders,
        body: JSON.stringify({ departments: newList }),
      });
      if (res.ok) {
        clearFetchCache();
      }
    } catch (err) {
      console.error("handleSaveDepartments error:", err);
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-4xl font-semibold text-[#1F251A]">Role & Credentials Management</h2>
        <p className="mt-2 text-sm text-[#5A6A51]">Define system roles, set view permissions, and provision employee credentials.</p>
      </div>

      {/* Grid for Roles and Employee Accounts */}
      <div className="grid gap-8 lg:grid-cols-1">
        {/* 1. Manage Roles Card */}
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
          <h3 className="text-xl font-bold text-[#1F251A] mb-4">Define System Roles</h3>
          
          {/* Create Role Form */}
          <form onSubmit={handleCreateRole} className="mb-6 space-y-4 rounded-3xl border border-[#414E36]/10 bg-white p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. receptionist"
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (roleCreateError) setRoleCreateError("");
                  }}
                  className="w-full max-w-md rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-3">Permissions & Access Control</label>
                <div className="grid gap-4 md:grid-cols-2 max-h-[550px] overflow-y-auto rounded-3xl border border-[#414E36]/10 p-5 bg-[#FBFBF9]">
                  {PERMISSION_STRUCTURE.map((group) => {
                    const allChecked = group.items.every(item => newRolePermissions.includes(item.key));
                    const someChecked = group.items.some(item => newRolePermissions.includes(item.key)) && !allChecked;

                    return (
                      <div key={group.category} className="rounded-2xl border border-[#414E36]/10 bg-white p-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-[#414E36]/5 pb-2 mb-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-[#1F251A] cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = someChecked;
                                }}
                                onChange={(e) => {
                                  const keys = group.items.map(item => item.key);
                                  if (e.target.checked) {
                                    setNewRolePermissions(prev => [...new Set([...prev, ...keys])]);
                                  } else {
                                    setNewRolePermissions(prev => prev.filter(p => !keys.includes(p)));
                                  }
                                }}
                                className="h-4 w-4 accent-[#414E36] rounded"
                              />
                              {group.category}
                            </label>
                            <span className="text-[10px] font-bold text-[#414E36] bg-[#414E36]/5 px-2 py-0.5 rounded-full">
                              {group.items.filter(item => newRolePermissions.includes(item.key)).length} / {group.items.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {group.items.map((item) => (
                              <label key={item.key} className="flex items-center gap-2.5 text-xs font-semibold text-[#414E36] cursor-pointer select-none hover:text-[#1F251A] transition">
                                <input
                                  type="checkbox"
                                  checked={newRolePermissions.includes(item.key)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewRolePermissions(prev => [...prev, item.key]);
                                    } else {
                                      setNewRolePermissions(prev => prev.filter(p => p !== item.key));
                                    }
                                  }}
                                  className="h-4 w-4 accent-[#414E36] rounded"
                                />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {roleCreateError && <p className="text-xs text-red-600 font-medium">⚠️ {roleCreateError}</p>}
            {roleCreateSuccess && <p className="text-xs text-green-700 font-medium">✅ {roleCreateSuccess}</p>}

            <button
              type="submit"
              className="rounded-2xl bg-[#414E36] px-5 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
            >
              Save Role
            </button>
          </form>

          {/* Roles Table */}
          <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                  <th className="px-6 py-4 text-left">Role Name</th>
                  <th className="px-6 py-4 text-left">Allowed Modules</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E9EB] text-[#414E36] font-medium">
                {loadingRolesAndEmployees ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-5 text-center text-xs text-gray-400">Loading roles...</td>
                  </tr>
                ) : rolesList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-5 text-center text-xs text-gray-400">No roles configured.</td>
                  </tr>
                ) : rolesList.map((r) => (
                  <tr key={r.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-6 py-4 font-bold text-[#1F251A] capitalize">{r.name}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#5A6A51]">
                      <div className="flex flex-wrap gap-1.5">
                        {r.permissions.map((p: string) => (
                          <span key={p} className="rounded-full bg-[#EDF1EC] px-2.5 py-0.5 text-[#414E36] border border-[#414E36]/10">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.name !== 'superadmin' ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(r.name)}
                          className="text-red-600 hover:text-red-800 transition"
                          title="Delete Role"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : <span className="text-xs text-gray-400 font-semibold italic">System Locked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Manage Employees / Credentials Provisioning */}
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
          <h3 className="text-xl font-bold text-[#1F251A] mb-4">Provision Employee Credentials</h3>
          
          {/* Create Employee Form — OAuth Invite Flow */}
          <form onSubmit={handleCreateEmployee} className="mb-6 space-y-4 rounded-3xl border border-[#414E36]/10 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sara El Gamel"
                  value={newEmployeeName}
                  onChange={(e) => {
                    setNewEmployeeName(e.target.value);
                    if (employeeCreateError) setEmployeeCreateError("");
                  }}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Work Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sara@gmail.com"
                  value={newEmployeeEmail}
                  onChange={(e) => {
                    setNewEmployeeEmail(e.target.value);
                    if (employeeCreateError) setEmployeeCreateError("");
                  }}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">Assign Role</label>
                <select
                  required
                  value={newEmployeeRole}
                  onChange={(e) => {
                    setNewEmployeeRole(e.target.value);
                    if (employeeCreateError) setEmployeeCreateError("");
                  }}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="">Select Role...</option>
                  {rolesList.map(r => (
                    <option key={r.id} value={r.name} className="capitalize">{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Invite info banner */}
            <div className="flex items-start gap-2.5 rounded-2xl bg-[#EDF5E8] border border-[#414E36]/15 px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0 text-[#414E36]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-xs text-[#414E36] font-medium leading-relaxed">
                An official <strong>invitation email</strong> will be sent to the employee&apos;s address. They will set their own password via the link — no password is stored by the admin.
              </p>
            </div>

            {employeeCreateError && <p className="text-xs text-red-600 font-medium">⚠️ {employeeCreateError}</p>}
            {employeeCreateSuccess && <p className="text-xs text-green-700 font-medium">✅ {employeeCreateSuccess}</p>}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Send Invitation
            </button>
          </form>

          {/* Employees Table */}
          <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                  <th className="px-6 py-4 text-left">Full Name</th>
                  <th className="px-6 py-4 text-left">Assigned Role</th>
                  <th className="px-6 py-4 text-left">Login Email</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>

              </thead>
              <tbody className="divide-y divide-[#E6E9EB] text-[#414E36] font-medium">
                {loadingRolesAndEmployees ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-5 text-center text-xs text-gray-400">Loading accounts...</td>
                  </tr>
                ) : employeesList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-5 text-center text-xs text-gray-400">No employee accounts provisioned yet. Use the form above to send an invitation.</td>
                  </tr>
                ) : employeesList.map((emp) => (
                  <tr key={emp.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-6 py-4 font-semibold text-[#1F251A]">{emp.name || emp.employee_id || '—'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#414E36]">
                      {adminRole === "superadmin" && emp.employee_id !== "superadmin" ? (
                        <select
                          value={emp.role_name}
                          onChange={(e) => handleUpdateEmployeeRole(emp.id, e.target.value)}
                          className="rounded-lg border border-[#E6E9EB] bg-[#FBFBF9] px-2 py-1 text-xs font-semibold text-[#414E36] focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36] outline-none"
                        >
                          {rolesList.map((r) => (
                            <option key={r.id} value={r.name}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="capitalize">{emp.role_name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#5A6A51]">{emp.email}</td>
                    <td className="px-6 py-4 text-center">
                      {emp.email_confirmed_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">✓ Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">⏳ Invite Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {emp.employee_id !== 'superadmin' ? (
                        <div className="flex items-center justify-center gap-2">
                          {!emp.email_confirmed_at && (
                            <button
                              type="button"
                              onClick={() => handleResendInvitation(emp.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                              title="Resend Invitation Email"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9z"/></svg>
                              Resend
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="text-red-600 hover:text-red-800 transition"
                            title="Revoke Access"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : <span className="text-xs text-gray-400 font-semibold italic">System Owner</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Department Management Card */}
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
          <h3 className="text-xl font-bold text-[#1F251A] mb-1">Department Management</h3>
          <p className="text-xs text-[#5A6A51] mb-5">Add or remove organizational departments used for employee categorization.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = newDeptInput.trim();
              if (!val) return;
              if (departmentsList.map(d => d.toLowerCase()).includes(val.toLowerCase())) {
                alert("Department already exists!");
                return;
              }
              handleSaveDepartments([...departmentsList, val]);
              setNewDeptInput("");
            }}
            className="flex flex-wrap gap-3 mb-6"
          >
            <input
              type="text"
              placeholder="e.g. Receptionist, Nursing, Medical..."
              value={newDeptInput}
              onChange={(e) => setNewDeptInput(e.target.value)}
              className="w-full max-w-md rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            />
            <button
              type="submit"
              className="rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2e3a26] transition flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Department
            </button>
          </form>

          <div className="flex flex-wrap gap-2.5">
            {departmentsList.map((dept) => (
              <div key={dept} className="flex items-center gap-2 rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2 text-xs font-bold text-[#1F251A] shadow-sm">
                <span>{dept}</span>
                {dept !== "Doctors" && dept !== "Receptionist" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to remove the '${dept}' department?`)) {
                        handleSaveDepartments(departmentsList.filter(d => d !== dept));
                      }
                    }}
                    className="text-red-500 hover:text-red-700 ml-1 transition"
                    title="Remove Department"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
