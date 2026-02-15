import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Package,
  Shuffle,
  HelpCircle,
  BarChart3,
} from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Cohorts", href: "/admin/cohorts", icon: FlaskConical },
  { label: "Cap Inventory", href: "/admin/caps", icon: Package },
  { label: "Randomization", href: "/admin/randomization", icon: Shuffle },
  { label: "Question Bank", href: "/admin/questions", icon: HelpCircle },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Data", href: "/admin/data", icon: BarChart3 },
] as const;

export const DOSING_OPTIONS = ["1x", "2x", "3x"] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  patient: "Patient",
  chw: "CHW",
};

export const CAP_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  assigned: "Assigned",
  broken: "Broken",
};

export const COHORT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  upcoming: "Upcoming",
  completed: "Completed",
};
