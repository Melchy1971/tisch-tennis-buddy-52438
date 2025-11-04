import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Mail, Phone, Shield, Crown, User, UsersRound, UserCheck, UserCog, Trash2, UserPlus, Loader2, GraduationCap, Upload, Download, RefreshCcw, Volleyball, X, Key } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { AssignUserIdsResponse } from "@/types/assign-user-ids";
import { initialSeasons } from "@/lib/teamData";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { ManualMemberRequest, ManualMemberResponse } from "@/types/manual-member";

type UserProfile = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  member_number: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  birthday: string | null;
  member_since: string | null;
  photo_url: string | null;
  status: string | null;
  default_role?: string | null;
  created_at: string;
  qttr_value: number | null;
  user_roles: { role: string }[];
};

type ProfileFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  member_number: string;
  street: string;
  postal_code: string;
  city: string;
  birthday: string;
  member_since: string;
  status: string;
  qttr_value: string;
};

type DialogMode = "create" | "edit" | "manual";

type AppRole = Database["public"]["Enums"]["app_role"];
type NormalizedRole = "player" | "captain" | "vorstand" | "admin" | "senioren" | "damen" | "jugend" | "mitglied" | "volleyball";

type UserAdminProps = {
  onNavigateToMemberUpdate?: () => void;
};

const TEAM_UPDATE_EVENT = "team-management-updated";

const CSV_DELIMITER = ";";
const CSV_HEADERS = [
  "profile_id",
  "user_id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "mobile",
  "member_number",
  "street",
  "postal_code",
  "city",
  "birthday",
  "member_since",
  "created_at",
  "status",
  "qttr_value",
  "photo_url",
  "default_role",
  "roles",
] as const;

const REQUIRED_CSV_HEADERS = [
  "profile_id",
  "user_id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "mobile",
  "member_number",
  "street",
  "postal_code",
  "city",
  "birthday",
  "status",
  "qttr_value",
  "photo_url",
  "default_role",
  "roles",
] satisfies typeof CSV_HEADERS[number][];

const ROLE_IMPORT_MAP: Record<string, NormalizedRole> = {
  admin: "admin",
  vorstand: "vorstand",
  captain: "captain",
  mannschaftsfuehrer: "captain",
  "mannschaftsführer": "captain",
  mitglied: "mitglied",
  member: "mitglied",
  spieler: "player",
  player: "player",
  jugend: "jugend",
  senioren: "senioren",
  damen: "damen",
  volleyball: "volleyball",
};

const STATUS_IMPORT_MAP: Record<string, string> = {
  active: "active",
  aktiv: "active",
  inactive: "inactive",
  inaktiv: "inactive",
  pending: "pending",
  ausstehend: "pending",
};

const escapeCsvValue = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) {
    return "";
  }

  const value = String(input);
  const needsQuotes = value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(CSV_DELIMITER);
  const sanitized = value.replace(/"/g, '""');

  return needsQuotes ? `"${sanitized}"` : sanitized;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === "\"") {
        if (line[i + 1] === "\"") {
          current += "\"";
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === CSV_DELIMITER) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

const parseRoleFromString = (value: string): NormalizedRole | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return ROLE_IMPORT_MAP[normalized] ?? null;
};

const parseStatusFromString = (value: string): string => {
  if (!value) return "pending";
  const normalized = value.trim().toLowerCase();
  return STATUS_IMPORT_MAP[normalized] ?? "pending";
};

type SeasonTeamGroup = {
  seasonId: string;
  label: string;
  isCurrent: boolean;
  teams: {
    id: string;
    name: string;
    league: string;
    division?: string;
  }[];
};

export const UserAdmin = ({ onNavigateToMemberUpdate }: UserAdminProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("edit");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<NormalizedRole[]>(["mitglied"]);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [formState, setFormState] = useState<ProfileFormState>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mobile: "",
    member_number: "",
    street: "",
    postal_code: "",
    city: "",
    birthday: "",
    member_since: "",
    status: "pending",
    qttr_value: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assigningUserIds, setAssigningUserIds] = useState(false);
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeamGroup[]>([]);
  const [teamAssignments, setTeamAssignments] = useState<Record<string, boolean>>({});
  const [initialTeamAssignments, setInitialTeamAssignments] = useState<Record<string, boolean>>({});
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [savingTeamAssignments, setSavingTeamAssignments] = useState(false);
  const [profileDialogTab, setProfileDialogTab] = useState<"details" | "teams" | "roles">("details");
  const [newPassword, setNewPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetTeamState = useCallback(() => {
    setSeasonTeams([]);
    setTeamAssignments({});
    setInitialTeamAssignments({});
    setTeamsLoading(false);
    setSavingTeamAssignments(false);
  }, []);

  const fetchCurrentUserRoles = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        setCurrentUserRoles(rolesData?.map(r => r.role) || []);
      }
    } catch (error) {
      console.error('Error fetching current user roles:', error);
    }
  }, []);

  const canManageBackups = useMemo(
    () => currentUserRoles.includes("admin") || currentUserRoles.includes("vorstand"),
    [currentUserRoles]
  );

  const canManageMembers = useMemo(
    () => currentUserRoles.includes("admin") || currentUserRoles.includes("vorstand") || currentUserRoles.includes("mitglied"),
    [currentUserRoles]
  );

  const canEditTeams = canManageMembers;
  const canEditQttr = canManageMembers;
  const canEditMemberSince = useMemo(
    () =>
      currentUserRoles.includes("admin") ||
      currentUserRoles.includes("vorstand") ||
      currentUserRoles.includes("entwickler"),
    [currentUserRoles]
  );

  const fetchUsers = useCallback(async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null);
      
      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine profiles with their roles, using type assertion for new fields
      const usersWithRoles = (profilesData || []).map(profile => ({
        ...(profile as any), // Type assertion due to pending Supabase types refresh
        user_roles: (rolesData || []).filter(role => role.user_id === profile.user_id)
      })) as UserProfile[];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRoles();
  }, [fetchCurrentUserRoles, fetchUsers]);

  const loadTeamsForUser = useCallback(async (userId: string) => {
    setTeamsLoading(true);
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, league, division, season_id')
        .order('name', { ascending: true });

      if (teamsError) throw teamsError;

      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('member_id', userId);

      if (membershipError) throw membershipError;

      const membershipSet = new Set((membershipData || []).map((item) => item.team_id));
      const assignmentState: Record<string, boolean> = {};
      const seasonMeta = new Map(initialSeasons.map((season) => [season.id, season]));
      const seasonsMap = new Map<string, SeasonTeamGroup>();

      (teamsData || []).forEach((team) => {
        assignmentState[team.id] = membershipSet.has(team.id);
        const existingSeason = seasonsMap.get(team.season_id);
        if (existingSeason) {
          existingSeason.teams.push({
            id: team.id,
            name: team.name,
            league: team.league,
            division: team.division ?? undefined
          });
        } else {
          const meta = seasonMeta.get(team.season_id);
          seasonsMap.set(team.season_id, {
            seasonId: team.season_id,
            label: meta?.label ?? `Saison ${team.season_id}`,
            isCurrent: Boolean(meta?.isCurrent),
            teams: [
              {
                id: team.id,
                name: team.name,
                league: team.league,
                division: team.division ?? undefined
              }
            ]
          });
        }
      });

      const orderMap = new Map(initialSeasons.map((season, index) => [season.id, index]));
      const seasonsArray = Array.from(seasonsMap.values())
        .map((season) => ({
          ...season,
          teams: season.teams.sort((a, b) => a.name.localeCompare(b.name))
        }))
        .sort((a, b) => {
          if (a.isCurrent !== b.isCurrent) {
            return a.isCurrent ? -1 : 1;
          }
          const orderA = orderMap.get(a.seasonId) ?? Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.get(b.seasonId) ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return a.label.localeCompare(b.label);
        });

      setSeasonTeams(seasonsArray);
      setTeamAssignments(assignmentState);
      setInitialTeamAssignments({ ...assignmentState });
    } catch (error) {
      console.error('Error loading team assignments:', error);
      toast({
        title: "Fehler",
        description: "Mannschaften konnten nicht geladen werden.",
        variant: "destructive"
      });
      resetTeamState();
    } finally {
      setTeamsLoading(false);
    }
  }, [resetTeamState, toast]);

  const handleTeamAssignmentToggle = (teamId: string, checked: boolean) => {
    setTeamAssignments((prev) => ({
      ...prev,
      [teamId]: checked
    }));
  };

  const hasTeamChanges = useMemo(() => {
    const allIds = new Set([
      ...Object.keys(initialTeamAssignments),
      ...Object.keys(teamAssignments)
    ]);

    for (const id of allIds) {
      if ((initialTeamAssignments[id] ?? false) !== (teamAssignments[id] ?? false)) {
        return true;
      }
    }

    return false;
  }, [initialTeamAssignments, teamAssignments]);

  const handleSaveTeamAssignments = async () => {
    if (!selectedUser?.user_id) {
      toast({
        title: "Keine Benutzer-ID",
        description: "Mannschaften können erst zugeordnet werden, wenn dem Profil ein Benutzerkonto zugewiesen ist.",
        variant: "destructive"
      });
      return;
    }

    if (!canEditTeams) {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Administratoren oder der Vorstand können Mannschaftszuordnungen ändern.",
        variant: "destructive"
      });
      return;
    }

    setSavingTeamAssignments(true);
    try {
      const allIds = new Set([
        ...Object.keys(initialTeamAssignments),
        ...Object.keys(teamAssignments)
      ]);

      const toAdd: string[] = [];
      const toRemove: string[] = [];

      allIds.forEach((teamId) => {
        const initial = initialTeamAssignments[teamId] ?? false;
        const current = teamAssignments[teamId] ?? false;

        if (!initial && current) {
          toAdd.push(teamId);
        } else if (initial && !current) {
          toRemove.push(teamId);
        }
      });

      if (toAdd.length) {
        const { error: insertError } = await supabase
          .from('team_members')
          .upsert(
            toAdd.map((teamId) => ({
              team_id: teamId,
              member_id: selectedUser.user_id as string,
              is_captain: false
            })),
            { onConflict: 'team_id,member_id' }
          );

        if (insertError) throw insertError;
      }

      if (toRemove.length) {
        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('member_id', selectedUser.user_id as string)
          .in('team_id', toRemove);

        if (deleteError) throw deleteError;
      }

      if (toAdd.length || toRemove.length) {
        toast({
          title: "Mannschaften aktualisiert",
          description: `Zuordnungen gespeichert (${toAdd.length} hinzugefügt, ${toRemove.length} entfernt).`
        });
      } else {
        toast({
          title: "Keine Änderungen",
          description: "Es wurden keine neuen Mannschaftszuordnungen vorgenommen."
        });
      }

      await loadTeamsForUser(selectedUser.user_id as string);
      window.dispatchEvent(new Event(TEAM_UPDATE_EVENT));
    } catch (error) {
      console.error('Error saving team assignments:', error);
      toast({
        title: "Fehler",
        description: "Die Mannschaftszuordnungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setSavingTeamAssignments(false);
    }
  };

  const formatGermanDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleDateString('de-DE');
  };

  const roleOptions = useMemo(() => ([
    {
      value: "player" as NormalizedRole,
      label: "Spieler",
      description: "Aktive Spieler, die Mannschaften zugewiesen werden können",
      icon: User
    },
    {
      value: "mitglied" as NormalizedRole,
      label: "Mitglied",
      description: "Vereinsmitglieder ohne aktive Spielerrolle",
      icon: UserCog
    },
    {
      value: "damen" as NormalizedRole,
      label: "Damen",
      description: "Spielerinnen für Damen/Mädchen-Mannschaften",
      icon: UserCheck
    },
    {
      value: "senioren" as NormalizedRole,
      label: "Senioren",
      description: "Spieler für Senioren-Mannschaften",
      icon: UserCheck
    },
    {
      value: "jugend" as NormalizedRole,
      label: "Jugend",
      description: "Spieler:innen für Jugendmannschaften",
      icon: GraduationCap
    },
    {
      value: "volleyball" as NormalizedRole,
      label: "Volleyball",
      description: "Mitglieder mit Volleyball-Zugehörigkeit",
      icon: Volleyball
    },
    {
      value: "captain" as NormalizedRole,
      label: "Mannschaftsführer",
      description: "Verwalten Mannschaften und Spieltermine",
      icon: Shield
    },
    {
      value: "vorstand" as NormalizedRole,
      label: "Vorstand",
      description: "Leitet den Verein und gibt neue Mitglieder frei",
      icon: UsersRound
    },
    {
      value: "admin" as NormalizedRole,
      label: "Administrator",
      description: "Hat Zugriff auf alle Verwaltungsfunktionen",
      icon: Crown
    }
  ]), []);

  const statusOptions = useMemo(() => ([
    { value: "pending", label: "Ausstehend" },
    { value: "active", label: "Aktiv" },
    { value: "inactive", label: "Inaktiv" }
  ]), []);

  const normalizeRole = (role?: AppRole | null): NormalizedRole => {
    if (!role) return "player";
    if (role === "moderator") return "captain";
    if (role === "substitute") return "player"; // Map substitute to player for now
    if (role === "mannschaftsfuehrer") return "captain";
    return role as NormalizedRole;
  };

  const denormalizeRole = (role: NormalizedRole): AppRole => {
    if (role === "captain") return "moderator";
    // vorstand, admin, player, jugend und senioren bleiben unverändert
    return role as AppRole;
  };

  const getRoleIcon = (role: NormalizedRole) => {
    switch (role) {
      case "admin":
        return Crown;
      case "vorstand":
        return UsersRound;
      case "captain":
        return Shield;
      case "damen":
        return UserCheck;
      case "senioren":
        return UserCheck;
      case "jugend":
        return GraduationCap;
      case "mitglied":
        return UserCog;
      case "volleyball":
        return Volleyball;
      default:
        return User;
    }
  };

  const getRoleBadge = (role: NormalizedRole) => {
    const colors = {
      admin: "bg-gradient-primary text-primary-foreground",
      vorstand: "bg-gradient-to-r from-amber-500 to-amber-600 text-white",
      captain: "bg-gradient-secondary text-secondary-foreground",
      damen: "bg-gradient-to-r from-pink-500 to-pink-600 text-white",
      senioren: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
      jugend: "bg-gradient-to-r from-amber-500 to-amber-600 text-white",
      mitglied: "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
      player: "bg-muted text-muted-foreground",
      volleyball: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
    };
    return colors[role as keyof typeof colors] || colors.player;
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return "bg-green-100 text-green-800";
    }
    if (status === "inactive") {
      return "bg-slate-100 text-slate-700";
    }
    return "bg-yellow-100 text-yellow-800";
  };

  const getStatusLabel = (status: string) => {
    if (status === "active") return "Aktiv";
    if (status === "inactive") return "Inaktiv";
    return "Ausstehend";
  };

  const getRoleLabel = (role: NormalizedRole) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      vorstand: "Vorstand",
      captain: "Mannschaftsführer",
      damen: "Damen",
      senioren: "Senioren",
      jugend: "Jugend",
      mitglied: "Mitglied",
      player: "Spieler",
      volleyball: "Volleyball"
    };
    return labels[role] || "Spieler";
  };

  const getUserDisplayName = (user: UserProfile) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email || 'Unbekannter Benutzer';
  };

  const getUserRoles = (user: UserProfile): NormalizedRole[] => {
    const normalized = (user.user_roles || []).map(role => normalizeRole(role.role as AppRole));

    if ((!user.user_id || normalized.length === 0) && user.default_role) {
      normalized.push(normalizeRole(user.default_role as AppRole));
    }

    return Array.from(new Set(normalized));
  };

  const persistRoles = async (userId: string, roles: NormalizedRole[]) => {
    // Allow profiles to have zero roles - don't force "mitglied"
    const finalRoles: NormalizedRole[] = Array.from(new Set(roles));

    // Fetch current roles
    const { data: currentRolesData, error: fetchError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const currentRoles = (currentRolesData || []).map(r => normalizeRole(r.role as any));
    
    // Get current logged-in user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isEditingSelf = currentUser?.id === userId;
    const currentUserIsAdmin = currentUserRoles.includes('admin');
    
    // Calculate roles to add and remove
    const rolesToAdd = finalRoles.filter(role => !currentRoles.includes(role));
    
    // Protect admin role only if user is editing themselves
    // Otherwise, allow full role management for admin/vorstand
    const rolesToRemove = (isEditingSelf && currentUserIsAdmin)
      ? currentRoles.filter(role => role !== 'admin' && !finalRoles.includes(role))
      : currentRoles.filter(role => !finalRoles.includes(role));

    // Remove roles that are no longer needed
    if (rolesToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', rolesToRemove.map(r => denormalizeRole(r)));

      if (deleteError) throw deleteError;
    }

    // Add new roles
    if (rolesToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(rolesToAdd.map(role => ({ user_id: userId, role: denormalizeRole(role) })));

      if (insertError) throw insertError;
    }
  };

  const determineDefaultRole = (roles: NormalizedRole[]): AppRole => {
    const priority: NormalizedRole[] = [
      "admin",
      "vorstand",
      "captain",
      "jugend",
      "senioren",
      "damen",
      "volleyball",
      "player",
      "mitglied"
    ];

    const selected = priority.find(role => roles.includes(role));
    
    // If no role found, return null or first available role
    return selected ? denormalizeRole(selected) : (roles[0] ? denormalizeRole(roles[0]) : "player");
  };

  const handleExportMembers = () => {
    if (!canManageBackups) {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Vorstand oder Administratoren können ein CSV-Backup erstellen.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const headerLine = CSV_HEADERS.join(CSV_DELIMITER);
      const dataLines = users.map((user) => {
        const normalizedDefaultRole = user.default_role ? normalizeRole(user.default_role as AppRole) : null;
        const roles = getUserRoles(user);

        const values = CSV_HEADERS.map((header) => {
          switch (header) {
            case "profile_id":
              return user.id;
            case "user_id":
              return user.user_id ?? "";
            case "first_name":
              return user.first_name ?? "";
            case "last_name":
              return user.last_name ?? "";
            case "email":
              return user.email ?? "";
            case "phone":
              return user.phone ?? "";
            case "mobile":
              return user.mobile ?? "";
            case "member_number":
              return user.member_number ?? "";
            case "street":
              return user.street ?? "";
            case "postal_code":
              return user.postal_code ?? "";
            case "city":
              return user.city ?? "";
            case "birthday":
              return user.birthday ?? "";
            case "member_since":
              return user.member_since ?? "";
            case "created_at":
              return user.created_at ?? "";
            case "status":
              return user.status ?? "";
            case "qttr_value":
              return user.qttr_value ?? "";
            case "photo_url":
              return user.photo_url ?? "";
            case "default_role":
              return normalizedDefaultRole ?? "";
            case "roles":
              return roles.join("|");
            default:
              return "";
          }
        });

        return values.map((value) => escapeCsvValue(value)).join(CSV_DELIMITER);
      });

      const csvContent = [headerLine, ...dataLines].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/:/g, "-").replace("T", "_").split(".")[0];
      const link = document.createElement("a");
      link.href = url;
      link.download = `mitglieder_backup_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 0);

      toast({
        title: "CSV-Backup erstellt",
        description: `${users.length} Mitglieder wurden exportiert.`,
      });
    } catch (error) {
      console.error("Error exporting members:", error);
      toast({
        title: "Fehler",
        description: "Das Backup konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportMembers = async (file: File) => {
    if (!canManageBackups) {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Vorstand oder Administratoren können ein CSV-Backup einspielen.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const fileContent = await file.text();
      const allLines = fileContent.split(/\r?\n/);
      const headerLineIndex = allLines.findIndex((line) => line.trim().length > 0);

      if (headerLineIndex === -1) {
        throw new Error("Die CSV-Datei enthält keine Daten.");
      }

      const headerLine = allLines[headerLineIndex].replace(/^\ufeff/, "");
      const headerValues = parseCsvLine(headerLine).map((header) => header.trim().toLowerCase());
      const headerMap = new Map<string, number>();
      headerValues.forEach((header, index) => {
        headerMap.set(header, index);
      });

      const missingHeaders = REQUIRED_CSV_HEADERS.filter((header) => !headerMap.has(header));
      if (missingHeaders.length > 0) {
        throw new Error(`Die CSV-Datei enthält nicht alle benötigten Spalten (${missingHeaders.join(", ")}).`);
      }

      const dataLines = allLines.slice(headerLineIndex + 1);
      const importEntries: {
        profile: {
          id: string;
          user_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          member_number: string | null;
          street: string | null;
          postal_code: string | null;
          city: string | null;
          birthday: string | null;
          member_since: string | null;
          status: string;
          qttr_value: number | null;
          photo_url: string | null;
          default_role: AppRole | null;
          updated_at: string;
        };
        roles: NormalizedRole[];
      }[] = [];
      let skippedCount = 0;
      const unknownRoles = new Set<string>();

      const getValue = (values: string[], key: (typeof CSV_HEADERS)[number]) => {
        const index = headerMap.get(key);
        if (index === undefined) return "";
        return (values[index] ?? "").trim();
      };

      for (const line of dataLines) {
        if (!line || line.trim().length === 0) {
          continue;
        }

        const values = parseCsvLine(line);
        if (values.length === 0 || values.every((value) => value.trim().length === 0)) {
          continue;
        }

        while (values.length < headerValues.length) {
          values.push("");
        }

        const profileId = getValue(values, "profile_id");

        if (!profileId) {
          skippedCount++;
          continue;
        }

        const userId = getValue(values, "user_id") || null;
        const status = parseStatusFromString(getValue(values, "status"));
        const qttrRaw = getValue(values, "qttr_value");
        let qttrValue: number | null = null;
        if (qttrRaw) {
          const parsed = Number.parseInt(qttrRaw, 10);
          if (!Number.isNaN(parsed)) {
            qttrValue = parsed;
          }
        }

        const roleValues = getValue(values, "roles");
        const parsedRoles = roleValues
          ? roleValues.split(/[|,]/).map((role) => {
            const parsedRole = parseRoleFromString(role);
            if (!parsedRole && role.trim().length > 0) {
              unknownRoles.add(role.trim());
            }
            return parsedRole;
          }).filter((role): role is NormalizedRole => Boolean(role))
          : [];

        const roles = Array.from(new Set(parsedRoles));
        const defaultRoleRaw = parseRoleFromString(getValue(values, "default_role"));
        const profileDefaultRole = userId
          ? null
          : defaultRoleRaw
            ? denormalizeRole(defaultRoleRaw)
            : determineDefaultRole(roles);

        const toNullable = (input: string) => (input.length === 0 ? null : input);

        importEntries.push({
          profile: {
            id: profileId,
            user_id: userId,
            first_name: toNullable(getValue(values, "first_name")),
            last_name: toNullable(getValue(values, "last_name")),
            email: toNullable(getValue(values, "email")),
            phone: toNullable(getValue(values, "phone")),
            mobile: toNullable(getValue(values, "mobile")),
            member_number: toNullable(getValue(values, "member_number")),
            street: toNullable(getValue(values, "street")),
            postal_code: toNullable(getValue(values, "postal_code")),
            city: toNullable(getValue(values, "city")),
            birthday: toNullable(getValue(values, "birthday")),
            member_since: toNullable(getValue(values, "member_since")),
            status,
            qttr_value: qttrValue,
            photo_url: toNullable(getValue(values, "photo_url")),
            default_role: profileDefaultRole ?? null,
            updated_at: new Date().toISOString(),
          },
          roles,
        });
      }

      if (importEntries.length === 0) {
        throw new Error("Die CSV-Datei enthält keine verwertbaren Daten.");
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(importEntries.map((entry) => entry.profile), { onConflict: 'id' });

      if (upsertError) {
        throw upsertError;
      }

      let roleUpdateCount = 0;
      for (const entry of importEntries) {
        if (entry.profile.user_id) {
          await persistRoles(entry.profile.user_id, entry.roles);
          roleUpdateCount++;
        }
      }

      await fetchUsers();

      const summaryParts = [
        `${importEntries.length} Mitglieder wurden aktualisiert.`,
      ];

      if (roleUpdateCount > 0) {
        summaryParts.push(`${roleUpdateCount} Benutzerrollen synchronisiert.`);
      }

      if (skippedCount > 0) {
        summaryParts.push(`${skippedCount} Zeilen ohne Profil-ID übersprungen.`);
      }

      if (unknownRoles.size > 0) {
        summaryParts.push(`Unbekannte Rollen ignoriert: ${Array.from(unknownRoles).join(", ")}.`);
      }

      toast({
        title: "CSV-Backup importiert",
        description: summaryParts.join(" "),
      });
    } catch (error) {
      console.error("Error importing members:", error);
      toast({
        title: "Import fehlgeschlagen",
        description: error instanceof Error ? error.message : "Die CSV-Datei konnte nicht importiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportClick = () => {
    if (isImporting) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await handleImportMembers(file);
    event.target.value = "";
  };

  const pendingUsers = useMemo(
    () => users.filter(user => (user.status || "pending") === "pending"),
    [users]
  );

  const missingUserIdCount = useMemo(
    () => users.filter(user => !user.user_id).length,
    [users]
  );

  const resetDialogState = () => {
    setSelectedUser(null);
    setSelectedRoles(["mitglied"]);
    setFormState({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      mobile: "",
      member_number: "",
      street: "",
      postal_code: "",
      city: "",
      birthday: "",
      member_since: "",
      status: "pending",
      qttr_value: ""
    });
    setIsSaving(false);
    setIsDeleting(false);
    resetTeamState();
    setProfileDialogTab("details");
  };

  const prepareDialogForUser = (user: UserProfile | null, mode: DialogMode) => {
    setDialogMode(mode);
    if (user) {
      setSelectedUser(user);
      setSelectedRoles(getUserRoles(user));
      setFormState({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        mobile: user.mobile || "",
        member_number: user.member_number || "",
        street: user.street || "",
        postal_code: user.postal_code || "",
        city: user.city || "",
        birthday: user.birthday ? user.birthday.split("T")[0] : "",
        member_since: user.member_since
          ? user.member_since.split("T")[0]
          : user.created_at.split("T")[0],
        status: user.status || "pending",
        qttr_value: typeof user.qttr_value === "number" ? String(user.qttr_value) : ""
      });
      if (user.user_id) {
        loadTeamsForUser(user.user_id);
      } else {
        resetTeamState();
      }
    } else {
      resetDialogState();
    }
    setProfileDialogTab("details");
    setIsDialogOpen(true);
  };

  const prepareDialogForManualEntry = () => {
    if (!canManageMembers) {
      toast({
        title: "Keine Berechtigung",
        description: "Nur Vorstand oder Administratoren können neue Mitglieder manuell erfassen.",
        variant: "destructive"
      });
      return;
    }

    resetDialogState();
    setDialogMode("manual");
    
    // Pre-fill with a placeholder email using timestamp for uniqueness
    const timestamp = Date.now();
    const placeholderEmail = `mitglied.${timestamp}@placeholder.ttbuddy.app`;
    setFormState(prev => ({ ...prev, email: placeholderEmail }));
    
    resetTeamState();
    setProfileDialogTab("details");
    setIsDialogOpen(true);
  };

  const handleRoleToggle = (role: NormalizedRole, checked: boolean) => {
    setSelectedRoles(prev => {
      let updatedRoles: NormalizedRole[];

      if (checked) {
        // Add the role
        updatedRoles = Array.from(new Set([...prev, role]));
      } else {
        // Remove the role
        updatedRoles = prev.filter(r => r !== role);
        // If no roles left, default to mitglied only
        if (updatedRoles.length === 0) {
          updatedRoles = ["mitglied"];
        }
      }

      // Auto-activate status to "active" if player role is selected
      setFormState(prevState => {
        if (updatedRoles.includes("player")) {
          return prevState.status === "active"
            ? prevState
            : { ...prevState, status: "active" };
        }
        return prevState;
      });

      return updatedRoles;
    });
  };

  const handleFormChange = (field: keyof ProfileFormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleQttrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditQttr) {
      return;
    }

    const value = event.target.value;
    if (value === "" || /^\d*$/.test(value)) {
      setFormState(prev => ({ ...prev, qttr_value: value }));
    }
  };

  const handleStatusChange = (value: string) => {
    setFormState(prev => ({ ...prev, status: value }));
  };

  const handleSelectPendingUser = (userId: string) => {
    const user = users.find(u => u.id === userId) || null;
    if (user) {
      prepareDialogForUser(user, "create");
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetDialogState();
      setProfileDialogTab("details");
    }
  };

  const handleProfileTabChange = (value: string) => {
    if (value === "details" || value === "teams" || value === "roles") {
      setProfileDialogTab(value);
    }
  };

  const selectedUserSupabaseUser = useMemo(() => {
    if (!selectedUser?.user_id) {
      return null;
    }

    const mappedUser: SupabaseUser = {
      id: selectedUser.user_id,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: selectedUser.created_at,
      email: selectedUser.email ?? undefined,
      phone: selectedUser.phone ?? undefined,
      updated_at: selectedUser.created_at,
      identities: [],
      factors: []
    };

    return mappedUser;
  }, [selectedUser]);

  const persistProfileDefaultRole = async (profileId: string, roles: NormalizedRole[]) => {
    const defaultRole = determineDefaultRole(roles);

    const { error } = await supabase
      .from('profiles')
      .update({ default_role: defaultRole })
      .eq('id', profileId);

    if (error) throw error;
  };

  const handleProfileSubmit = async () => {
    if (dialogMode !== "manual" && !selectedUser) {
      toast({
        title: "Kein Mitglied ausgewählt",
        description: "Bitte wählen Sie ein Mitglied aus, das bearbeitet werden soll.",
        variant: "destructive"
      });
      return;
    }

    // Validierung für manuelle Anlage: Vorname und Nachname sind Pflichtfelder
    if (dialogMode === "manual") {
      if (!formState.first_name?.trim() || !formState.last_name?.trim()) {
        toast({
          title: "Pflichtfelder fehlen",
          description: "Bitte füllen Sie Vorname und Nachname aus.",
          variant: "destructive"
        });
        return;
      }
    }

    let parsedQttrValue: number | null = null;
    if (canEditQttr) {
      const trimmedQttr = formState.qttr_value.trim();
      if (trimmedQttr.length > 0) {
        const parsed = Number.parseInt(trimmedQttr, 10);
        if (Number.isNaN(parsed)) {
          toast({
            title: "Ungültiger QTTR/TTR-Wert",
            description: "Bitte geben Sie eine gültige ganze Zahl für den QTTR/TTR-Wert ein.",
            variant: "destructive"
          });
          return;
        }
        parsedQttrValue = parsed;
      }
    }

    setIsSaving(true);

    try {
      if (dialogMode === "manual") {
        const payload: ManualMemberRequest = {
          first_name: formState.first_name.trim(),
          last_name: formState.last_name.trim(),
          email: formState.email?.trim() || "",
          phone: formState.phone || undefined,
          mobile: formState.mobile || undefined,
          member_number: formState.member_number || undefined,
          street: formState.street || undefined,
          postal_code: formState.postal_code || undefined,
          city: formState.city || undefined,
          birthday: formState.birthday || undefined,
          status: formState.status || "pending",
          roles: selectedRoles,
          qttr_value: canEditQttr ? parsedQttrValue ?? null : undefined,
          member_since: canEditMemberSince ? formState.member_since || undefined : undefined,
        };

        const { data, error: manualError } = await supabase.functions.invoke<ManualMemberResponse>(
          "create-manual-member",
          {
            body: payload,
          }
        );

        if (manualError) throw manualError;

        const createdProfile = data?.profile;

        if (!createdProfile?.user_id) {
          throw new Error("Das angelegte Mitglied verfügt über keine Benutzer-ID.");
        }

        const newUser: UserProfile = {
          ...(createdProfile as any),
          user_roles: (data?.user_roles || []).map(role => ({ role: role.role })),
        };

        setUsers(prev => [...prev, newUser]);
        setSelectedUser(newUser);

        toast({
          title: "Mitglied erfasst",
          description: "Das Mitglied wurde erfolgreich erstellt und gespeichert.",
        });
      } else if (selectedUser) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: formState.first_name || null,
            last_name: formState.last_name || null,
            email: formState.email || null,
            phone: formState.phone || null,
            mobile: formState.mobile || null,
            member_number: formState.member_number || null,
            street: formState.street || null,
            postal_code: formState.postal_code || null,
            city: formState.city || null,
            birthday: formState.birthday || null,
            status: formState.status,
            updated_at: new Date().toISOString(),
            ...(canEditQttr ? { qttr_value: parsedQttrValue } : {}),
            ...(canEditMemberSince ? { member_since: formState.member_since || null } : {}),
          })
          .eq('id', selectedUser.id);

        if (updateError) throw updateError;

        const updatedUser: UserProfile = {
          ...selectedUser,
          first_name: formState.first_name || null,
          last_name: formState.last_name || null,
          email: formState.email || null,
          phone: formState.phone || null,
          mobile: formState.mobile || null,
          member_number: formState.member_number || null,
          street: formState.street || null,
          postal_code: formState.postal_code || null,
          city: formState.city || null,
          birthday: formState.birthday || null,
          status: formState.status || selectedUser.status,
          user_roles: selectedRoles.map(role => ({ role: denormalizeRole(role) })),
          default_role: determineDefaultRole(selectedRoles),
          qttr_value: canEditQttr ? parsedQttrValue : selectedUser.qttr_value,
          member_since: canEditMemberSince ? (formState.member_since || null) : selectedUser.member_since,
        };

        // Only persist roles if user_id exists
        if (selectedUser.user_id) {
          await persistRoles(selectedUser.user_id, selectedRoles);
          await supabase
            .from('profiles')
            .update({ default_role: null })
            .eq('id', selectedUser.id);
        } else {
          await persistProfileDefaultRole(selectedUser.id, selectedRoles);
          try {
            await supabase.functions.invoke<AssignUserIdsResponse>("assign-user-ids");
          } catch (assignError) {
            console.error("Error assigning missing user IDs:", assignError);
          }
        }

        setUsers(prevUsers =>
          prevUsers.map(user => (user.id === selectedUser.id ? updatedUser : user))
        );
        setSelectedUser(updatedUser);

        toast({
          title: dialogMode === "create" ? "Mitglied freigegeben" : "Profil aktualisiert",
          description:
            dialogMode === "create"
              ? "Das Mitglied wurde erfolgreich freigegeben und aktualisiert."
              : "Die Profilinformationen wurden gespeichert.",
        });
      }

      handleDialogClose(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Fehler",
        description: "Das Profil konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileDelete = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);

    try {
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id);

      if (rolesError) throw rolesError;

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      toast({
        title: "Profil gelöscht",
        description: "Das Mitgliedsprofil wurde entfernt.",
      });

      handleDialogClose(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Fehler",
        description: "Das Profil konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPassword = async () => {
    if (!selectedUser || !selectedUser.email || !newPassword) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie ein Passwort ein.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Fehler",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
        variant: "destructive"
      });
      return;
    }

    setIsSettingPassword(true);

    try {
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email, {
        redirectTo: `${window.location.origin}/`
      });

      if (error) throw error;

      toast({
        title: "Passwort-Reset gesendet",
        description: `Eine E-Mail zum Zurücksetzen des Passworts wurde an ${selectedUser.email} gesendet.`,
      });

      setNewPassword("");
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Fehler",
        description: "Die Passwort-Reset-E-Mail konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setIsSettingPassword(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const displayName = getUserDisplayName(user);
    const userRoles = getUserRoles(user);
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || userRoles.includes(roleFilter as NormalizedRole);
    return matchesSearch && matchesRole;
  });

  const handleAssignUserIds = async () => {
    try {
      setAssigningUserIds(true);
      setLoading(true);
      const { data, error } = await supabase.functions.invoke<AssignUserIdsResponse>("assign-user-ids");

      if (error) {
        throw error;
      }

      const summary = data ?? null;

      await fetchUsers();

      if (summary?.errors?.length) {
        toast({
          title: "IDs teilweise vergeben",
          description: `Für ${summary.created} Mitglieder wurden Benutzer-IDs erzeugt. ${summary.errors.length} Profile konnten nicht verarbeitet werden.`,
          variant: "destructive",
        });
        console.error("assign-user-ids errors:", summary.errors);
      } else {
        toast({
          title: "Benutzer-IDs vergeben",
          description: summary
            ? `${summary.created} Benutzer-IDs wurden erfolgreich zugewiesen${summary.placeholders ? ` (${summary.placeholders} mit Platzhalter-E-Mail).` : "."}`
            : "Alle fehlenden Benutzer-IDs wurden erfolgreich erstellt.",
        });
      }
    } catch (error) {
      console.error("Error assigning user IDs:", error);
      toast({
        title: "Fehler",
        description: "Benutzer-IDs konnten nicht vergeben werden.",
        variant: "destructive",
      });
    } finally {
      setAssigningUserIds(false);
      setLoading(false);
    }
  };

  const teamToggleDisabled = !canEditTeams || !selectedUser?.user_id || teamsLoading || savingTeamAssignments;
  const teamSaveDisabled = !canEditTeams || !selectedUser?.user_id || !hasTeamChanges || savingTeamAssignments || teamsLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileInputChange}
      />
      
      {/* Left Panel - User List */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Benutzerverwaltung</h1>
            <p className="text-muted-foreground">Verwalten Sie Vereinsmitglieder und deren Berechtigungen</p>
          </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {canManageBackups && (
            <>
              <Button
                variant="outline"
                onClick={onNavigateToMemberUpdate}
                disabled={!onNavigateToMemberUpdate}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Update Mitglieder
              </Button>
              <Button
                variant="outline"
                onClick={handleExportMembers}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Backup exportieren
              </Button>
              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Backup importieren
              </Button>
            </>
          )}
          {canManageMembers && (
            <Button
              className="bg-muted text-muted-foreground hover:bg-muted/80"
              variant="outline"
              onClick={prepareDialogForManualEntry}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Mitglied erfassen
            </Button>
          )}
          <Button
            className="bg-gradient-primary hover:bg-primary-hover shadow-sport"
            onClick={() => prepareDialogForUser(pendingUsers[0] ?? null, "create")}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Neues Mitglied
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Mitglied suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Rolle filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Rollen</SelectItem>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="vorstand">Vorstand</SelectItem>
            <SelectItem value="captain">Mannschaftsführer</SelectItem>
            <SelectItem value="player">Spieler</SelectItem>
            <SelectItem value="jugend">Jugend</SelectItem>
            <SelectItem value="damen">Damen</SelectItem>
            <SelectItem value="senioren">Senioren</SelectItem>
            <SelectItem value="volleyball">Volleyball</SelectItem>
          </SelectContent>
        </Select>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Mitglieder ({filteredUsers.length})</CardTitle>
            <CardDescription>Übersicht aller Vereinsmitglieder</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => {
              const displayName = getUserDisplayName(user);
              const userRoles = getUserRoles(user);
              const userStatus = user.status || "pending";
              const initials = displayName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "MB";
              const memberSinceLabel = formatGermanDate(user.member_since ?? user.created_at);

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-accent transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  role="button"
                  tabIndex={0}
                  onClick={() => prepareDialogForUser(user, "edit")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      prepareDialogForUser(user, "edit");
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold mr-2">{displayName}</h3>
                        {userRoles.map((role) => {
                          const RoleIcon = getRoleIcon(role);
                          return (
                            <Badge key={`${user.id}-${role}`} className={getRoleBadge(role)}>
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {getRoleLabel(role)}
                            </Badge>
                          );
                        })}
                        <Badge className={getStatusBadge(userStatus)} variant="outline">
                          {getStatusLabel(userStatus)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {user.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                      {memberSinceLabel && (
                        <div className="text-sm text-muted-foreground">
                          Mitglied seit {memberSinceLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        prepareDialogForUser(user, "edit");
                      }}
                    >
                      Profil bearbeiten
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Gesamt Mitglieder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registrierte Benutzer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aktive Spieler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => (u.status || 'pending') === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Verfügbare Mitglieder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ausstehende Anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => (u.status || 'pending') === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Benötigen Bestätigung</p>
          </CardContent>
        </Card>


        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gesamt Mitglieder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Registrierte Benutzer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Aktive Spieler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => (u.status || 'pending') === 'active').length}</div>
              <p className="text-xs text-muted-foreground">Verfügbare Mitglieder</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ausstehende Anfragen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => (u.status || 'pending') === 'pending').length}</div>
              <p className="text-xs text-muted-foreground">Benötigen Bestätigung</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Edit Profile */}
      {selectedUser && (
        <div className="w-[600px] bg-background border-l">
          <Card className="h-full border-0">
            <CardHeader className="sticky top-0 bg-background border-b z-10">
              <div>
                <CardTitle>
                  {dialogMode === "create"
                    ? "Neues Mitglied freigeben"
                    : dialogMode === "manual"
                      ? "Mitglied manuell erfassen"
                      : "Mitgliedsprofil bearbeiten"}
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {dialogMode === "create"
                    ? "Weisen Sie einem neu registrierten Mitglied die richtigen Rollen zu."
                    : dialogMode === "manual"
                      ? "Erfassen Sie ein Mitglied manuell. Pflichtfelder sind markiert."
                      : "Aktualisieren Sie die Profildaten und Rollen des Mitglieds."}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b">
                  <span className="text-sm text-muted-foreground">Aktuelle Rollen:</span>
                  {selectedRoles.map((role) => {
                    const RoleIcon = getRoleIcon(role);
                    return (
                      <Badge key={role} className={getRoleBadge(role)}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {getRoleLabel(role)}
                      </Badge>
                    );
                  })}
                  <Badge className={getStatusBadge(formState.status)} variant="outline">
                    {getStatusLabel(formState.status)}
                  </Badge>
                </div>
              )}

              {dialogMode === "create" && (
                <div className="space-y-2 mb-6">
                  <Label htmlFor="pending-member">Registrierte Mitglieder</Label>
                  {pendingUsers.length > 0 ? (
                    <Select
                      value={selectedUser?.id ?? pendingUsers[0].id}
                      onValueChange={handleSelectPendingUser}
                    >
                      <SelectTrigger id="pending-member">
                        <SelectValue placeholder="Mitglied auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {getUserDisplayName(user)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Aktuell warten keine neuen Mitglieder auf ihre Freigabe.
                    </div>
                  )}
                </div>
              )}

              <Tabs
                value={profileDialogTab}
                onValueChange={handleProfileTabChange}
                className="space-y-6"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Profil</span>
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4" />
                    <span>Mannschaften</span>
                  </TabsTrigger>
                  <TabsTrigger value="roles" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Rollen</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">
                        Vorname {dialogMode === "manual" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="first_name"
                        value={formState.first_name}
                        onChange={handleFormChange('first_name')}
                        placeholder="Vorname"
                        required={dialogMode === "manual"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">
                        Nachname {dialogMode === "manual" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="last_name"
                        value={formState.last_name}
                        onChange={handleFormChange('last_name')}
                        placeholder="Nachname"
                        required={dialogMode === "manual"}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email">
                        E-Mail {dialogMode === "manual" && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formState.email}
                        onChange={handleFormChange('email')}
                        placeholder="name@example.com"
                        required={dialogMode === "manual"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member_number">Mitgliedsnummer</Label>
                      <Input
                        id="member_number"
                        value={formState.member_number}
                        onChange={handleFormChange('member_number')}
                        placeholder="z. B. 12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Geburtstag</Label>
                      <Input
                        id="birthday"
                        type="date"
                        value={formState.birthday}
                        onChange={handleFormChange('birthday')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={formState.phone}
                        onChange={handleFormChange('phone')}
                        placeholder="Festnetz"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobil</Label>
                      <Input
                        id="mobile"
                        value={formState.mobile}
                        onChange={handleFormChange('mobile')}
                        placeholder="Mobilnummer"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Straße</Label>
                      <Input
                        id="street"
                        value={formState.street}
                        onChange={handleFormChange('street')}
                        placeholder="Straße und Hausnummer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">PLZ</Label>
                      <Input
                        id="postal_code"
                        value={formState.postal_code}
                        onChange={handleFormChange('postal_code')}
                        placeholder="z. B. 12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ort</Label>
                      <Input
                        id="city"
                        value={formState.city}
                        onChange={handleFormChange('city')}
                        placeholder="Wohnort"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member_since">Mitglied seit</Label>
                      <Input
                        id="member_since"
                        type="date"
                        value={formState.member_since}
                        onChange={handleFormChange('member_since')}
                        disabled={!canEditMemberSince}
                        readOnly={!canEditMemberSince}
                        className={!canEditMemberSince ? "cursor-not-allowed opacity-70" : undefined}
                      />
                      <p className="text-xs text-muted-foreground">
                        {canEditMemberSince
                          ? "Legen Sie das Eintrittsdatum fest."
                          : "Nur Vorstand, Admin und Entwickler dürfen das Eintrittsdatum anpassen."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qttr_value">QTTR/TTR-Wert</Label>
                      <Input
                        id="qttr_value"
                        inputMode="numeric"
                        pattern="\\d*"
                        value={formState.qttr_value}
                        onChange={handleQttrChange}
                        readOnly={!canEditQttr}
                        placeholder="z. B. 1500"
                      />
                      {!canEditQttr && (
                        <p className="text-xs text-muted-foreground">
                          Nur Admins oder Vorstände können diesen Wert bearbeiten.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedUser?.email && dialogMode === "edit" && (
                    <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="new_password">Neues Passwort festlegen</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sendet eine Passwort-Reset-E-Mail an {selectedUser.email}
                      </p>
                      <Button
                        type="button"
                        onClick={handleSetPassword}
                        disabled={isSettingPassword || !selectedUser.email}
                        variant="outline"
                        className="w-full"
                      >
                        {isSettingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sende E-Mail...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Passwort-Reset senden
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formState.status} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="teams" className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Mannschaften</Label>
                        <p className="text-xs text-muted-foreground">
                          Verwalten Sie die Mannschaftszuordnungen.
                        </p>
                      </div>
                      {!canEditTeams && (
                        <Badge variant="outline" className="text-xs">Nur Lesen</Badge>
                      )}
                    </div>

                    {!selectedUser?.user_id ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Mannschaften können erst zugeordnet werden, wenn dem Profil ein Benutzerkonto zugewiesen ist.
                      </div>
                    ) : teamsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((placeholder) => (
                          <div key={placeholder} className="h-16 rounded-md bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : seasonTeams.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Es sind aktuell keine Mannschaften angelegt.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {seasonTeams.map((season) => (
                          <div key={season.seasonId} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">{season.label}</p>
                              {season.isCurrent && (
                                <Badge variant="outline" className="text-[10px]">
                                  Aktuelle Saison
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-2">
                              {season.teams.map((team) => (
                                <div
                                  key={team.id}
                                  className="flex items-center justify-between rounded-md border px-3 py-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium">{team.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {team.league}
                                      {team.division ? ` · ${team.division}` : ""}
                                    </p>
                                  </div>
                                  <Switch
                                    checked={Boolean(teamAssignments[team.id])}
                                    onCheckedChange={(checked) => handleTeamAssignmentToggle(team.id, Boolean(checked))}
                                    disabled={teamToggleDisabled}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSaveTeamAssignments}
                        disabled={teamSaveDisabled}
                      >
                        {savingTeamAssignments ? 'Speichern...' : 'Mannschaften speichern'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="roles" className="space-y-6">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Rollen verwalten</Label>
                      <p className="text-xs text-muted-foreground">
                        Wählen Sie die Rollen aus, die diesem Mitglied zugewiesen werden sollen.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {roleOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-start gap-3 rounded-md border p-3"
                        >
                          <Checkbox
                            id={`role-${option.value}`}
                            checked={selectedRoles.includes(option.value)}
                            onCheckedChange={(checked) => handleRoleToggle(option.value, Boolean(checked))}
                          />
                          <div className="space-y-1 flex-1">
                            <Label htmlFor={`role-${option.value}`} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                              <option.icon className="h-4 w-4" />
                              {option.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between pt-6 mt-6 border-t">
                {dialogMode === "edit" && selectedUser && (
                  <Button
                    variant="destructive"
                    onClick={handleProfileDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Löschen..." : "Profil löschen"}
                  </Button>
                )}

                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleProfileSubmit}
                    disabled={
                      isSaving ||
                      !canManageMembers ||
                      (dialogMode !== 'manual' && !selectedUser) ||
                      (dialogMode === 'create' && pendingUsers.length === 0)
                    }
                  >
                    {isSaving ? 'Speichern...' : 'Speichern'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
