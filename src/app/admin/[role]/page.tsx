"use client";

import { use } from "react";
import AdminPage from "../page";

export default function RoleAdminPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = use(params);
  return <AdminPage portalRole={role} />;
}
