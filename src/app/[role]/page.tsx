"use client";

import { use } from "react";
import AdminPage from "../admin/page";

export default function RolePortalPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = use(params);
  return <AdminPage portalRole={role} />;
}
