export const SECTION_PARAM = "section";
export const DEFAULT_SECTION = "Dashboard";

// Sections that can be reopened from the URL after a page reload. "Logout" and "New Booking" are
// actions rather than places, so they are deliberately absent.
export const PERSISTABLE_SECTIONS: readonly string[] = [
  "Dashboard", "Bookings", "Patients", "Doctors", "Services", "Inventory", "Products", "Employees",
  "HR", "Marketing", "Promotions", "Packages", "Transactions", "Customer Support", "Reports",
  "Finance", "Settings", "Profile",
  "Clinic Profile", "Service Hours", "Branches", "Rooms", "Booking Settings", "Terms & Conditions",
  "Deposit Settings", "Inactivity Settings", "Notification Settings", "Queue Settings",
  "Pages Settings", "Medical Records", "Role Management", "System Test Suite",
];

export function parseSection(search: string): string | null {
  const value = new URLSearchParams(search).get(SECTION_PARAM);
  return value && PERSISTABLE_SECTIONS.includes(value) ? value : null;
}

// Returns the query string (with leading "?", or "" when empty) for `section`, keeping every other
// parameter untouched. The default section leaves the URL clean.
export function withSection(search: string, section: string): string {
  const params = new URLSearchParams(search);
  if (section === DEFAULT_SECTION || !PERSISTABLE_SECTIONS.includes(section)) {
    params.delete(SECTION_PARAM);
  } else {
    params.set(SECTION_PARAM, section);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
