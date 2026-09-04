"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { clearFetchCache } from "@/lib/fetchCache";
import { adminTranslations } from "@/components/admin/translations";

const PERMISSION_STRUCTURE = [
  {
    category: "Dashboard & Reception",
    prefix: "dashboard",
    items: [
      { key: "dashboard.view", label: "View Dashboard Overview" },
      { key: "reception.view_dashboard", label: "View Reception Dashboard" },
      { key: "reception.start_shift", label: "Start / End Receptionist Shift" }
    ]
  },
  {
    category: "Bookings Management",
    prefix: "bookings",
    items: [
      { key: "bookings.view_calendar", label: "View Calendar" },
      { key: "bookings.view_list", label: "View Bookings Directory" },
      { key: "bookings.create", label: "Create Bookings (+ New Booking)" },
      { key: "bookings.action_add_previous", label: "Add Previous / Historical Booking (3-Dots)" },
      { key: "bookings.action_print_schedule", label: "Print Schedule PDF (3-Dots)" },
      { key: "bookings.action_export_csv", label: "Export Bookings CSV (3-Dots)" },
      { key: "bookings.approve_reject", label: "Approve / Reject Online Requests" },
      { key: "bookings.edit", label: "Edit Booking Details & Reschedule" },
      { key: "bookings.status_change", label: "Change Status (Confirm / Check-In / Start)" },
      { key: "bookings.action_postpone", label: "Postpone Booking" },
      { key: "bookings.action_cancel", label: "Cancel Booking" },
      { key: "bookings.action_no_show", label: "Mark as No Show" },
      { key: "bookings.delete", label: "Delete Booking Permanently" },
      { key: "bookings.settle_payment", label: "Settle Invoice & Checkout" },
      { key: "bookings.manage_prescriptions", label: "Issue & Send Prescriptions" },
      { key: "bookings.manage_invoices", label: "View & Print Invoices PDF" },
      { key: "bookings.manage_services", label: "Add / Remove Services on Booking" },
      { key: "bookings.manage_notes", label: "Add / Edit Clinical & Booking Notes" }
    ]
  },
  {
    category: "Customer Management",
    prefix: "customers",
    items: [
      { key: "customers.view", label: "View Patient Profiles & Directory" },
      { key: "customers.create", label: "Create Patients (+ Add Patient)" },
      { key: "customers.edit", label: "Edit Patient Profile" },
      { key: "customers.delete", label: "Delete Patients" },
      { key: "customers.export", label: "Export Patients CSV (3-Dots)" },
      { key: "customers.import", label: "Import Patients CSV (3-Dots)" },
      { key: "customers.action_edit", label: "Edit Patient (Table 3-Dots)" },
      { key: "customers.action_view_profile", label: "View Profile (Table 3-Dots)" },
      { key: "customers.action_settle_balance", label: "Settle Balance (Table 3-Dots)" },
      { key: "customers.manage_wallet", label: "Manage Wallet (Deposit / Withdraw)" },
      { key: "customers.manage_reports", label: "Upload & Delete Medical Reports" },
      { key: "customers.view_history", label: "View Booking & Clinical History" }
    ]
  },
  {
    category: "Doctor Management",
    prefix: "providers",
    items: [
      { key: "providers.view", label: "View Doctor Profiles & Directory" },
      { key: "providers.create", label: "Add New Doctors (+ Add Doctor)" },
      { key: "providers.edit", label: "Edit Doctor Details & Services" },
      { key: "providers.delete", label: "Delete Doctors" },
      { key: "providers.action_edit", label: "Edit Doctor (Table 3-Dots)" },
      { key: "providers.action_change_status", label: "Change Status Active/Inactive (Table 3-Dots)" },
      { key: "providers.action_delete", label: "Delete Doctor (Table 3-Dots)" },
      { key: "providers.manage_schedule", label: "Manage Schedule, Shifts & Hours" },
      { key: "providers.attendance", label: "Manage Doctor Attendance" },
      { key: "providers.commissions", label: "Manage Doctor Commissions & Salary" }
    ]
  },
  {
    category: "Services Management",
    prefix: "services",
    items: [
      { key: "services.view", label: "View Services List & Catalog" },
      { key: "services.create", label: "Create Services (+ Add Service)" },
      { key: "services.create_category", label: "Create Categories (+ Add Category)" },
      { key: "services.edit", label: "Edit Services & Categories" },
      { key: "services.delete", label: "Delete Services" },
      { key: "services.action_edit", label: "Edit Service (Table 3-Dots)" },
      { key: "services.action_toggle_status", label: "Activate / Deactivate (Table 3-Dots)" },
      { key: "services.action_delete", label: "Delete Service (Table 3-Dots)" },
      { key: "services.edit_category", label: "Edit / Reorder Categories" },
      { key: "services.delete_category", label: "Delete Categories" }
    ]
  },
  {
    category: "Inventory & Equipment",
    prefix: "inventory",
    items: [
      { key: "inventory.view", label: "View Inventory & Stock Levels" },
      { key: "inventory.manage_devices", label: "Manage Laser Devices & Equipment" },
      { key: "inventory.action_update_pulses", label: "Update Pulses (Device 3-Dots)" },
      { key: "inventory.action_reset_counter", label: "Reset Counter & Maintenance (Device 3-Dots)" },
      { key: "inventory.action_view_device_history", label: "View Pulse History (Device 3-Dots)" },
      { key: "inventory.action_edit_device", label: "Edit Device (Device 3-Dots)" },
      { key: "inventory.action_delete_device", label: "Delete Device (Device 3-Dots)" },
      { key: "inventory.manage_products", label: "Manage Products & Pricing" },
      { key: "inventory.create_product", label: "Add New Product" },
      { key: "inventory.edit_product", label: "Edit Product Details" },
      { key: "inventory.adjust_stock", label: "Adjust & Log Stock Levels" },
      { key: "inventory.delete_product", label: "Delete Product" },
      { key: "inventory.manage_suppliers", label: "Manage Suppliers & Vendors" },
      { key: "inventory.manage_orders", label: "Manage Purchase Orders" }
    ]
  },
  {
    category: "Employees & Staff",
    prefix: "employees",
    items: [
      { key: "employees.view", label: "View Employee Directory" },
      { key: "employees.create", label: "Add & Provision Employees (+ Add Staff)" },
      { key: "employees.edit", label: "Edit Employee Details & Roles" },
      { key: "employees.delete", label: "Delete / Revoke Employee Access" },
      { key: "employees.action_view_info", label: "View Info (Row Action)" },
      { key: "employees.action_edit", label: "Edit Employee (Row Action)" },
      { key: "employees.action_resend_invite", label: "Resend Invitation (Row Action)" },
      { key: "employees.action_delete", label: "Revoke Access (Row Action)" },
      { key: "employees.export_attendance", label: "Export Attendance Insights CSV" },
      { key: "employees.manage_departments", label: "Manage Clinic Departments" }
    ]
  },
  {
    category: "HR & Attendance",
    prefix: "hr",
    items: [
      { key: "hr.view_attendance", label: "View Shift Logs & GPS Check-ins" },
      { key: "hr.manage_attendance", label: "Approve / Override Attendance" },
      { key: "hr.export_attendance", label: "Export Attendance CSV" },
      { key: "hr.manage_leaves", label: "Manage & Approve Leaves" },
      { key: "hr.manage_performance", label: "Manage Performance Reviews" },
      { key: "hr.view_payroll", label: "View Staff & Doctor Payroll" },
      { key: "hr.manage_payroll", label: "Process & Disburse Payroll" },
      { key: "hr.action_process_payroll", label: "Pay Staff / Doctor (Payroll Action)" }
    ]
  },
  {
    category: "Financial Transactions",
    prefix: "transactions",
    items: [
      { key: "transactions.view", label: "View Financial Transactions" },
      { key: "transactions.create", label: "Create Manual Transaction (+ New Transaction)" },
      { key: "transactions.export", label: "Export Transactions CSV" },
      { key: "transactions.action_view_details", label: "View Details (Table 3-Dots)" },
      { key: "transactions.action_print_receipt", label: "Print Receipt (Table 3-Dots)" },
      { key: "transactions.action_refund", label: "Process Refund (Table 3-Dots)" },
      { key: "transactions.refund", label: "Process Refunds & Adjustments" }
    ]
  },
  {
    category: "Marketing & Campaigns",
    prefix: "marketing",
    items: [
      { key: "marketing.view_campaigns", label: "View Marketing Campaigns & Offers" },
      { key: "marketing.manage_campaigns", label: "Create & Edit Promotions & Packages" },
      { key: "marketing.delete_campaigns", label: "Delete Promotions & Packages" },
      { key: "marketing.send_broadcasts", label: "Send Broadcast WhatsApp / SMS" },
      { key: "marketing.manage_discounts", label: "Manage Discounts & Offers" }
    ]
  },
  {
    category: "Customer Support",
    prefix: "support",
    items: [
      { key: "support.view_tickets", label: "View Support Tickets" },
      { key: "support.manage_tickets", label: "Respond & Resolve Tickets" },
      { key: "support.resolve_tickets", label: "Close & Archive Tickets" }
    ]
  },
  {
    category: "Reports & Analytics",
    prefix: "reports",
    items: [
      { key: "reports.view_analytics", label: "View Operational Analytics" },
      { key: "reports.view_financial_reports", label: "View Financial & Revenue Reports" },
      { key: "reports.export_reports", label: "Export Business Data Reports" }
    ]
  },
  {
    category: "Finance",
    prefix: "finance",
    items: [
      { key: "finance.view_pnl", label: "View P&L Statement" },
      { key: "finance.view_margins", label: "View Service/Doctor/Branch Margins" },
      { key: "finance.view_cashflow", label: "View Cash Flow Statement" },
      { key: "finance.manage_expenses", label: "Manage Expenses & Recurring Expenses" },
      { key: "finance.manage_assets", label: "Manage Fixed Assets & Depreciation" },
      { key: "finance.manage_loans", label: "Manage Loans & Debt" },
      { key: "finance.view_capacity", label: "View Capacity & Service Mix" },
      { key: "finance.export", label: "Export Financial Statements" }
    ]
  },
  {
    category: "Settings & System Control",
    prefix: "settings",
    items: [
      { key: "settings.profile", label: "Manage Clinic Profile" },
      { key: "settings.service_hours", label: "Manage Service Hours" },
      { key: "settings.branches", label: "Manage Clinic Branches" },
      { key: "settings.booking_settings", label: "Manage Booking Settings & Deposits" },
      { key: "settings.terms", label: "Manage Terms & Conditions (CMS)" },
      { key: "settings.notification", label: "Manage Notification & SMS Gateway" },
      { key: "settings.queue", label: "Manage Queue Display Settings" },
      { key: "settings.pages", label: "Manage Pages & Hero Slides (CMS)" },
      { key: "settings.medical_records", label: "Manage Medical Records Templates" },
      { key: "settings.roles", label: "Manage Employee Roles & Accounts" },
      { key: "settings.test_suite", label: "Run System Test Suite Diagnostics" }
    ]
  },
  {
    category: "Doctor Portal & Clinical Intake",
    prefix: "clinical",
    items: [
      { key: "clinical.view_assigned_sessions", label: "View Assigned Sessions & Calendar" },
      { key: "clinical.fill_intake", label: "Fill Medical Intake & Clinical Notes" },
      { key: "clinical.create_prescriptions", label: "Issue Digital Prescriptions" },
      { key: "clinical.manage_pulses", label: "Record Laser Pulses in Session" },
      { key: "clinical.add_session_services", label: "Add Consumables & Additional Services" },
      { key: "clinical.view_medical_history", label: "View Patient Medical History & Reports" }
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
  lang: "en" | "ar";
  t: (typeof adminTranslations)["en"]["roleManagement"];
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
  lang,
  t,
}: RoleManagementViewProps) {
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [roleCreateError, setRoleCreateError] = useState("");
  const [roleCreateSuccess, setRoleCreateSuccess] = useState("");
  const [newDeptInput, setNewDeptInput] = useState("");

  const permissionKeyToLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of PERMISSION_STRUCTURE) {
      const catLabel = t.permissionCategories?.[group.category as keyof typeof t.permissionCategories] || group.category;
      map[group.category] = catLabel;
      map[group.prefix] = catLabel;
      map[group.prefix.toLowerCase()] = catLabel;
      map[group.category.toLowerCase()] = catLabel;

      for (const item of group.items) {
        map[item.key] = t.permissionLabels[item.key as keyof typeof t.permissionLabels] || item.label || item.key;
      }
    }

    const coarseCategoryMap: Record<string, string> = {
      "Bookings": t.permissionCategories?.["Bookings Management"] || "Bookings",
      "bookings": t.permissionCategories?.["Bookings Management"] || "Bookings",
      "Customers": t.permissionCategories?.["Customer Management"] || "Customers",
      "customers": t.permissionCategories?.["Customer Management"] || "Customers",
      "Providers": t.permissionCategories?.["Doctor Management"] || "Providers",
      "providers": t.permissionCategories?.["Doctor Management"] || "Providers",
      "Doctor": t.permissionCategories?.["Doctor Management"] || "Doctor",
      "doctor": t.permissionCategories?.["Doctor Management"] || "Doctor",
      "Services": t.permissionCategories?.["Services Management"] || "Services",
      "services": t.permissionCategories?.["Services Management"] || "Services",
      "Settings": t.permissionCategories?.["Settings & System Control"] || "Settings",
      "settings": t.permissionCategories?.["Settings & System Control"] || "Settings",
      "Employees": t.permissionCategories?.["Employees & Staff"] || "Employees",
      "employees": t.permissionCategories?.["Employees & Staff"] || "Employees",
      "Inventory": t.permissionCategories?.["Inventory & Equipment"] || "Inventory",
      "inventory": t.permissionCategories?.["Inventory & Equipment"] || "Inventory",
      "HR": t.permissionCategories?.["HR & Attendance"] || "HR",
      "hr": t.permissionCategories?.["HR & Attendance"] || "HR",
      "Transactions": t.permissionCategories?.["Financial Transactions"] || "Transactions",
      "transactions": t.permissionCategories?.["Financial Transactions"] || "Transactions",
      "Marketing": t.permissionCategories?.["Marketing & Campaigns"] || "Marketing",
      "marketing": t.permissionCategories?.["Marketing & Campaigns"] || "Marketing",
      "Support": t.permissionCategories?.["Customer Support"] || "Support",
      "support": t.permissionCategories?.["Customer Support"] || "Support",
      "Reports": t.permissionCategories?.["Reports & Analytics"] || "Reports",
      "reports": t.permissionCategories?.["Reports & Analytics"] || "Reports",
      "Finance": t.permissionCategories?.["Finance"] || "Finance",
      "finance": t.permissionCategories?.["Finance"] || "Finance",
      "Dashboard": t.permissionCategories?.["Dashboard & Reception"] || "Dashboard",
      "dashboard": t.permissionCategories?.["Dashboard & Reception"] || "Dashboard",
      "Clinical": t.permissionCategories?.["Doctor Portal & Clinical Intake"] || "Clinical",
      "clinical": t.permissionCategories?.["Doctor Portal & Clinical Intake"] || "Clinical",
    };

    Object.assign(map, coarseCategoryMap);
    return map;
  }, [t]);

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
        setRoleCreateSuccess(t.defineRoles.roleSavedSuccess);
        fetchRolesAndEmployees();
        setTimeout(() => setRoleCreateSuccess(""), 3000);
      } else {
        const data = await res.json();
        setRoleCreateError(data.error || t.defineRoles.createRoleFailed);
      }
    } catch (err: any) {
      setRoleCreateError(err.message || t.defineRoles.networkError);
    }
  }

  async function handleDeleteRole(name: string) {
    if (!(await showConfirm(t.defineRoles.deleteRoleConfirm(name)))) return;
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
        alert(data.error || t.defineRoles.deleteRoleFailed);
      }
    } catch (err: any) {
      alert(t.defineRoles.deleteRoleError + err.message);
    }
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmployeeName.trim() || !newEmployeeEmail.trim() || !newEmployeeRole) return;
    if (!emailRegex.test(newEmployeeEmail.trim())) {
      setEmployeeCreateError(t.provisionEmployees.invalidEmail);
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
        setEmployeeCreateSuccess(t.provisionEmployees.invitationSent(newEmployeeEmail.trim()));
        clearFetchCache();
        fetchRolesAndEmployees();
        setTimeout(() => setEmployeeCreateSuccess(""), 6000);
      } else {
        const data = await res.json();
        setEmployeeCreateError(data.error || t.provisionEmployees.sendInvitationFailed);
      }
    } catch (err: any) {
      setEmployeeCreateError(err.message || t.defineRoles.networkError);
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
        alert(data.error || t.provisionEmployees.updateRoleFailed);
      }
    } catch (err: any) {
      alert(t.provisionEmployees.updateRoleError + err.message);
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
    <div className="space-y-8 animate-fadeIn" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mb-6">
        <h2 className="text-4xl font-semibold text-[#1F251A]">{t.title}</h2>
        <p className="mt-2 text-sm text-[#5A6A51]">{t.subtitle}</p>
      </div>

      {/* Grid for Roles and Employee Accounts */}
      <div className="grid gap-8 lg:grid-cols-1">
        {/* 1. Manage Roles Card */}
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
          <h3 className="text-xl font-bold text-[#1F251A] mb-4">{t.defineRoles.cardTitle}</h3>
          
          {/* Create Role Form */}
          <form onSubmit={handleCreateRole} className="mb-6 space-y-4 rounded-3xl border border-[#414E36]/10 bg-white p-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">{t.defineRoles.roleNameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.defineRoles.roleNamePlaceholder}
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (roleCreateError) setRoleCreateError("");
                  }}
                  className="w-full max-w-md rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-3">{t.defineRoles.permissionsLabel}</label>
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
                              {t.permissionCategories[group.category as keyof typeof t.permissionCategories] || group.category}
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
                                {t.permissionLabels[item.key as keyof typeof t.permissionLabels] || item.label}
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
              {t.defineRoles.saveRoleBtn}
            </button>
          </form>

          {/* Roles Table */}
          <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                  <th className="px-6 py-4 text-start">{t.defineRoles.tableRoleName}</th>
                  <th className="px-6 py-4 text-start">{t.defineRoles.tableAllowedModules}</th>
                  <th className="px-6 py-4 text-center">{t.defineRoles.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E9EB] text-[#414E36] font-medium">
                {loadingRolesAndEmployees ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-5 text-center text-xs text-gray-400">{t.defineRoles.loadingRoles}</td>
                  </tr>
                ) : rolesList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-5 text-center text-xs text-gray-400">{t.defineRoles.noRoles}</td>
                  </tr>
                ) : rolesList.map((r) => (
                  <tr key={r.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-6 py-4 font-bold text-[#1F251A] capitalize">{r.name}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#5A6A51]">
                      <div className="flex flex-wrap gap-1.5">
                        {r.permissions.map((p: string) => (
                          <span key={p} className="rounded-full bg-[#EDF1EC] px-2.5 py-0.5 text-[#414E36] border border-[#414E36]/10">{permissionKeyToLabel[p] || p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.name !== 'superadmin' ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(r.name)}
                          className="text-red-600 hover:text-red-800 transition"
                          title={t.defineRoles.deleteRoleTitle}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : <span className="text-xs text-gray-400 font-semibold italic">{t.defineRoles.systemLocked}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Manage Employees / Credentials Provisioning */}
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
          <h3 className="text-xl font-bold text-[#1F251A] mb-4">{t.provisionEmployees.cardTitle}</h3>
          
          {/* Create Employee Form — OAuth Invite Flow */}
          <form onSubmit={handleCreateEmployee} className="mb-6 space-y-4 rounded-3xl border border-[#414E36]/10 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">{t.provisionEmployees.fullNameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.provisionEmployees.fullNamePlaceholder}
                  value={newEmployeeName}
                  onChange={(e) => {
                    setNewEmployeeName(e.target.value);
                    if (employeeCreateError) setEmployeeCreateError("");
                  }}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">{t.provisionEmployees.emailLabel}</label>
                <input
                  type="email"
                  required
                  placeholder={t.provisionEmployees.emailPlaceholder}
                  value={newEmployeeEmail}
                  onChange={(e) => {
                    setNewEmployeeEmail(e.target.value);
                    if (employeeCreateError) setEmployeeCreateError("");
                  }}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5A6A51] font-bold mb-1.5">{t.provisionEmployees.assignRoleLabel}</label>
                <select
                  required
                  value={newEmployeeRole}
                  onChange={(e) => {
                    setNewEmployeeRole(e.target.value);
                    if (employeeCreateError) setEmployeeCreateError("");
                  }}
                  className="w-full rounded-2xl border border-[#414E36]/15 bg-[#fff] px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C] cursor-pointer"
                >
                  <option value="">{t.provisionEmployees.selectRolePlaceholder}</option>
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
                {t.provisionEmployees.inviteBanner}
              </p>
            </div>

            {employeeCreateError && <p className="text-xs text-red-600 font-medium">⚠️ {employeeCreateError}</p>}
            {employeeCreateSuccess && <p className="text-xs text-green-700 font-medium">✅ {employeeCreateSuccess}</p>}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#414E36] px-5 py-2 text-xs font-bold text-[#FBFBF9] hover:bg-[#2e3a26] transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {t.provisionEmployees.sendInvitationBtn}
            </button>
          </form>

          {/* Employees Table */}
          <div className="overflow-hidden rounded-[32px] border border-[#E6E9EB] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E6E9EB] bg-[#F7F7F9] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5A6A51]">
                  <th className="px-6 py-4 text-start">{t.provisionEmployees.tableFullName}</th>
                  <th className="px-6 py-4 text-start">{t.provisionEmployees.tableAssignedRole}</th>
                  <th className="px-6 py-4 text-start">{t.provisionEmployees.tableLoginEmail}</th>
                  <th className="px-6 py-4 text-center">{t.provisionEmployees.tableStatus}</th>
                  <th className="px-6 py-4 text-center">{t.provisionEmployees.tableActions}</th>
                </tr>

              </thead>
              <tbody className="divide-y divide-[#E6E9EB] text-[#414E36] font-medium">
                {loadingRolesAndEmployees ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-5 text-center text-xs text-gray-400">{t.provisionEmployees.loadingAccounts}</td>
                  </tr>
                ) : employeesList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-5 text-center text-xs text-gray-400">{t.provisionEmployees.noAccounts}</td>
                  </tr>
                ) : employeesList.map((emp) => (
                  <tr key={emp.id} className="transition hover:bg-[#F9F9F7]">
                    <td className="px-6 py-4 font-semibold text-[#1F251A]">{emp.name || emp.employee_id || '—'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#414E36]">
                      {(adminRole === "superadmin" || adminRole === "admin") && emp.employee_id !== "superadmin" ? (
                        <select
                          value={emp.role_name}
                          onChange={(e) => handleUpdateEmployeeRole(emp.id, e.target.value)}
                          className="rounded-lg border border-[#E6E9EB] bg-[#FBFBF9] px-2 py-1 text-xs font-semibold text-[#414E36] focus:border-[#414E36] focus:ring-1 focus:ring-[#414E36] outline-none"
                        >
                          {rolesList
                            // RISK-069: admin can assign/edit any operational role, but only
                            // superadmin can grant the admin/superadmin tier itself — don't even
                            // offer those two options when the caller isn't superadmin, the
                            // server rejects them anyway.
                            .filter((r) => adminRole === "superadmin" || (r.name !== "admin" && r.name !== "superadmin"))
                            .map((r) => (
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">{t.provisionEmployees.active}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{t.provisionEmployees.invitePending}</span>
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
                              title={t.provisionEmployees.resendTitle}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9z"/></svg>
                              {t.provisionEmployees.resendBtn}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="text-red-600 hover:text-red-800 transition"
                            title={t.provisionEmployees.revokeAccessTitle}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : <span className="text-xs text-gray-400 font-semibold italic">{t.provisionEmployees.systemOwner}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Department Management Card */}
        <div className="rounded-[40px] bg-[#FBFBF9] p-6 shadow-[0_30px_80px_rgba(47,61,41,0.07)]">
          <h3 className="text-xl font-bold text-[#1F251A] mb-1">{t.departments.cardTitle}</h3>
          <p className="text-xs text-[#5A6A51] mb-5">{t.departments.subtitle}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = newDeptInput.trim();
              if (!val) return;
              if (departmentsList.map(d => d.toLowerCase()).includes(val.toLowerCase())) {
                alert(t.departments.alreadyExists);
                return;
              }
              handleSaveDepartments([...departmentsList, val]);
              setNewDeptInput("");
            }}
            className="flex flex-wrap gap-3 mb-6"
          >
            <input
              type="text"
              placeholder={t.departments.inputPlaceholder}
              value={newDeptInput}
              onChange={(e) => setNewDeptInput(e.target.value)}
              className="w-full max-w-md rounded-2xl border border-[#414E36]/15 bg-white px-4 py-2.5 text-sm text-[#1F251A] outline-none focus:border-[#C4AE7C]"
            />
            <button
              type="submit"
              className="rounded-2xl bg-[#414E36] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2e3a26] transition flex items-center gap-1.5"
            >
              <Plus size={14} /> {t.departments.addBtn}
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
                      if (confirm(t.departments.removeConfirm(dept))) {
                        handleSaveDepartments(departmentsList.filter(d => d !== dept));
                      }
                    }}
                    className="text-red-500 hover:text-red-700 ms-1 transition"
                    title={t.departments.removeTitle}
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
