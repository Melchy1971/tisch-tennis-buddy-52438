import { Home, Calendar, Users, MessageCircle, Shield, Info, Trophy, User } from "lucide-react";
import type { NavItem } from "@/components/nav/types";

// Basis-Navi ohne onSelect/active; die konkrete Seite setzt dies kontextuell
export const baseNavigation: Array<Pick<NavItem, "id" | "label" | "icon">> = [
  { id: "dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  { id: "teams", label: "Mannschaften", icon: <Users className="h-4 w-4" /> },
  { id: "matches", label: "Spielplan", icon: <Calendar className="h-4 w-4" /> },
  { id: "training", label: "Training", icon: <Trophy className="h-4 w-4" /> },
  { id: "substitutes", label: "Ersatz", icon: <Users className="h-4 w-4" /> },
  { id: "communication", label: "Kommunikation", icon: <MessageCircle className="h-4 w-4" /> },
  { id: "board", label: "Vorstand", icon: <Shield className="h-4 w-4" /> },
  { id: "admin", label: "Admin-Bereich", icon: <Shield className="h-4 w-4" /> },
  { id: "administrator", label: "Administrator", icon: <Shield className="h-4 w-4" /> },
  { id: "mitgliedsprofil", label: "Profil", icon: <User className="h-4 w-4" /> },
  { id: "info", label: "Info", icon: <Info className="h-4 w-4" /> },
];


