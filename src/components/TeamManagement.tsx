import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter as DialogFooterPrimitive, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Crown, Flag, Layers, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Season, SeasonState } from "@/types/team";
import { initialSeasons } from "@/lib/teamData";
import { supabase } from "@/integrations/supabase/client";
import { MAX_LINEUP_POSITIONS, buildTeamPosition, compareTeamPositions } from "@/lib/teamPositions";

const TEAM_UPDATE_EVENT = "team-management-updated";

type TeamFormState = {
  name: string;
  competition: string;
  trainingDay1: string;
  trainingTime1: string;
  trainingDay2: string;
  trainingTime2: string;
  homeVenue: string;
  category: "erwachsene" | "jugend";
};

const WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag"
];

const createEmptyTeamForm = (category: "erwachsene" | "jugend" = "erwachsene"): TeamFormState => ({
  name: "",
  competition: "",
  trainingDay1: "",
  trainingTime1: "",
  trainingDay2: "",
  trainingTime2: "",
  homeVenue: "",
  category
});

export const TeamManagement = () => {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<"erwachsene" | "jugend">("erwachsene");
  const [seasonStates, setSeasonStates] = useState<Record<string, SeasonState>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSeasonIdAdults, setSelectedSeasonIdAdults] = useState<string>(
    initialSeasons.find((season) => season.isCurrent)?.id ?? initialSeasons[0]?.id
  );
  const [selectedSeasonIdYouth, setSelectedSeasonIdYouth] = useState<string>("");
  const [seasonList, setSeasonList] = useState<Season[]>([]);
  const [isSeasonDialogOpen, setIsSeasonDialogOpen] = useState(false);
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [seasonForm, setSeasonForm] = useState({
    label: "",
    startYear: "",
    endYear: "",
    isArchived: false
  });
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [teamForm, setTeamForm] = useState<TeamFormState>(createEmptyTeamForm());
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [positionUpdates, setPositionUpdates] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<string>("");

  const selectedSeasonId = activeCategory === "erwachsene" ? selectedSeasonIdAdults : selectedSeasonIdYouth;
  const setSelectedSeasonId = activeCategory === "erwachsene" ? setSelectedSeasonIdAdults : setSelectedSeasonIdYouth;
  const selectedSeason = seasonList.find((season) => season.id === selectedSeasonId);
  const selectedState = seasonStates[`${selectedSeasonId}-${activeCategory}`];
  const isCurrentSeason = !Boolean(selectedSeason?.isArchived);
  const canEditPositions = userRole === "admin" || userRole === "vorstand";

  const showSeasonLockedToast = () =>
    toast({
      title: "Bearbeitung nicht möglich",
      description: "Vergangene Saisons können nur von Administratoren bearbeitet werden.",
      variant: "destructive"
    });

  const updateTeamForm = (field: keyof TeamFormState, value: string) =>
    setTeamForm((prev) => ({
      ...prev,
      [field]: value
    }));

  const fetchUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roles && roles.length > 0) {
        const roleList = roles.map((r) => r.role);
        if (roleList.includes("admin")) {
          setUserRole("admin");
        } else if (roleList.includes("vorstand")) {
          setUserRole("vorstand");
        } else {
          setUserRole(roleList[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }, []);

  const loadSeasons = useCallback(async () => {
    try {
      const { data: seasons, error } = await supabase
        .from("seasons")
        .select("*")
        .order("start_year", { ascending: false });

      if (error) throw error;

      if (seasons && seasons.length > 0) {
        // Filter out seasons without valid label, start_year or end_year
        const mappedSeasons: Season[] = seasons
          .filter((s) => s.label && s.label.trim() !== "" && s.start_year && s.end_year)
          .map((s) => ({
            id: s.id,
            label: s.label,
            startYear: s.start_year,
            endYear: s.end_year,
            isCurrent: s.is_current,
            isArchived: s.is_archived ?? false,
            category: (s.category || "erwachsene") as "erwachsene" | "jugend"
          }));
        
        setSeasonList(mappedSeasons);
        
        // Set default seasons separately for each category based on label prefix
        const adultsSeasons = mappedSeasons.filter(s => s.label.startsWith('E '));
        const youthSeasons = mappedSeasons.filter(s => s.label.startsWith('J '));
        
        // Find current or most recent season for adults
        const currentAdultSeason = adultsSeasons.find((s) => s.isCurrent);
        const defaultAdultSeason = currentAdultSeason ?? adultsSeasons[0];
        
        if (defaultAdultSeason) {
          setSelectedSeasonIdAdults(defaultAdultSeason.id);
        }
        
        // Find current or most recent season for youth
        const currentYouthSeason = youthSeasons.find((s) => s.isCurrent);
        const defaultYouthSeason = currentYouthSeason ?? youthSeasons[0];
        
        if (defaultYouthSeason) {
          setSelectedSeasonIdYouth(defaultYouthSeason.id);
        }
      }
    } catch (error) {
      console.error("Error loading seasons:", error);
      toast({
        title: "Fehler",
        description: "Saisons konnten nicht geladen werden.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const loadTeamsForSeason = useCallback(async (seasonId: string, category: "erwachsene" | "jugend") => {
    try {
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("season_id", seasonId)
        .eq("category", category);

      if (teamsError) throw teamsError;

      if (!teams || teams.length === 0) {
        setSeasonStates((prev) => ({
          ...prev,
          [`${seasonId}-${category}`]: {
            teams: []
          }
        }));
        return;
      }

      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .in("team_id", teams.map((team) => team.id));

      if (membersError) throw membersError;

      const memberIds = Array.from(new Set((teamMembers || []).map((tm) => tm.member_id)));

      let profileMap = new Map<
        string,
        {
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          qttr_value: number | null;
        }
      >();

      if (memberIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, qttr_value")
          .in("id", memberIds)
          .is("deleted_at", null);

        if (profilesError) throw profilesError;

        profileMap = new Map(
          ((profiles || []) as {
            id: string;
            first_name: string | null;
            last_name: string | null;
            email: string | null;
            qttr_value: number | null;
          }[]).map(p => [p.id, { ...p, user_id: p.id }])
        );
      }

      const teamsWithMembers = teams.map((team) => {
        const members = (teamMembers || [])
          .filter((tm) => tm.team_id === team.id)
          .map((tm) => {
            const profile = profileMap.get(tm.member_id);
            const fullName = profile
              ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
              : "";

            return {
              id: tm.member_id,
              name: fullName || profile?.email || tm.member_id,
              email: profile?.email || "",
              rating: profile?.qttr_value ?? 0,
              playStyle: undefined,
              isCaptain: tm.is_captain,
              position: tm.position || undefined
            };
          })
          .sort((a, b) => {
            const positionComparison = compareTeamPositions(a.position, b.position);
            if (positionComparison !== 0) return positionComparison;
            return a.name.localeCompare(b.name, "de-DE");
          });

        const rawHomeMatch = (team.home_match as
          | { location?: string | null; day?: string | null; time?: string | null }
          | null) ?? {
          location: undefined,
          day: undefined,
          time: undefined
        };

        const homeMatch = rawHomeMatch && (rawHomeMatch.location || rawHomeMatch.day || rawHomeMatch.time)
          ? {
              location: rawHomeMatch.location ?? "",
              day: rawHomeMatch.day ?? undefined,
              time: rawHomeMatch.time ?? undefined
            }
          : undefined;

        return {
          id: team.id,
          name: team.name,
          league: team.league,
          division: team.division || undefined,
          trainingSlots: (team.training_slots as any[]) || [],
          homeMatch,
          members
        };
      }).sort((a, b) => a.name.localeCompare(b.name, "de-DE", { numeric: true }));

      setSeasonStates((prev) => ({
        ...prev,
        [`${seasonId}-${category}`]: {
          teams: teamsWithMembers
        }
      }));
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Fehler",
        description: "Mannschaften konnten nicht geladen werden.",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchUserRole();
      await loadSeasons();
      setLoading(false);
    };

    loadInitialData();

    const handleMembersImported = () => {
      if (selectedSeasonIdAdults) {
        loadTeamsForSeason(selectedSeasonIdAdults, "erwachsene");
      }
      if (selectedSeasonIdYouth) {
        loadTeamsForSeason(selectedSeasonIdYouth, "jugend");
      }
    };

    window.addEventListener("members-imported", handleMembersImported);

    return () => {
      window.removeEventListener("members-imported", handleMembersImported);
    };
  }, [loadSeasons, fetchUserRole, selectedSeasonIdAdults, selectedSeasonIdYouth, loadTeamsForSeason]);

  useEffect(() => {
    if (selectedSeasonIdAdults) {
      loadTeamsForSeason(selectedSeasonIdAdults, "erwachsene");
    }
  }, [selectedSeasonIdAdults, loadTeamsForSeason]);

  useEffect(() => {
    if (selectedSeasonIdYouth) {
      loadTeamsForSeason(selectedSeasonIdYouth, "jugend");
    }
  }, [selectedSeasonIdYouth, loadTeamsForSeason]);

  const notifyTeamUpdate = () => {
    window.dispatchEvent(new Event(TEAM_UPDATE_EVENT));
  };

  const handleUpdateMemberPosition = async (
    teamId: string,
    memberId: string,
    rawPosition: string,
    currentPosition: string | undefined
  ) => {
    if (!canEditPositions) {
      toast({
        title: "Berechtigung erforderlich",
        description: "Nur Administratoren und Vorstandsmitglieder können Positionen zuteilen.",
        variant: "destructive"
      });
      return;
    }
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    if (!selectedSeasonId) return;

    const newPosition = rawPosition === "unassigned" ? null : rawPosition;
    if ((newPosition ?? undefined) === currentPosition) {
      return;
    }

    const memberKey = `${teamId}-${memberId}`;
    setPositionUpdates((prev) => ({ ...prev, [memberKey]: true }));

    try {
      const { error } = await supabase
        .from("team_members")
        .update({ position: newPosition })
        .eq("team_id", teamId)
        .eq("member_id", memberId);

      if (error) throw error;

      await loadTeamsForSeason(selectedSeasonId, activeCategory);
      notifyTeamUpdate();

      toast({
        title: "Spielposition aktualisiert",
        description: "Die Spielposition wurde erfolgreich gespeichert."
      });
    } catch (error) {
      console.error("Error updating member position:", error);
      toast({
        title: "Fehler",
        description: "Die Spielposition konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setPositionUpdates((prev) => {
        const updated = { ...prev };
        delete updated[memberKey];
        return updated;
      });
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    if (!selectedState) return;

    const removedMember = selectedState.teams
      .find((team) => team.id === teamId)
      ?.members.find((member) => member.id === memberId);

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("member_id", memberId);

      if (error) throw error;

      await loadTeamsForSeason(selectedSeasonId, activeCategory);
      notifyTeamUpdate();

      if (removedMember) {
        toast({
          title: "Mitglied entfernt",
          description: `${removedMember.name} wurde aus der Mannschaft entfernt.`
        });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Fehler",
        description: "Mitglied konnte nicht entfernt werden.",
        variant: "destructive"
      });
    }
  };

  const handleSetCaptain = async (teamId: string, memberId: string) => {
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    if (!selectedState) return;

    const newCaptain = selectedState.teams
      .find((team) => team.id === teamId)
      ?.members.find((member) => member.id === memberId);

    try {
      const { error: unsetError } = await supabase
        .from("team_members")
        .update({ is_captain: false })
        .eq("team_id", teamId);

      if (unsetError) throw unsetError;

      const { error: setError } = await supabase
        .from("team_members")
        .update({ is_captain: true })
        .eq("team_id", teamId)
        .eq("member_id", memberId);

      if (setError) throw setError;

      await loadTeamsForSeason(selectedSeasonId, activeCategory);
      notifyTeamUpdate();

      if (newCaptain) {
        toast({
          title: "Mannschaftsführer gesetzt",
          description: `${newCaptain.name} ist jetzt Mannschaftsführer${newCaptain.name.endsWith("a") ? "in" : ""}.`
        });
      }
    } catch (error) {
      console.error("Error setting captain:", error);
      toast({
        title: "Fehler",
        description: "Mannschaftsführer konnte nicht gesetzt werden.",
        variant: "destructive"
      });
    }
  };

  const resetTeamDialog = () => {
    setTeamForm(createEmptyTeamForm());
    setEditingTeamId(null);
  };

  const handleOpenCreateTeam = () => {
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    resetTeamDialog();
    setTeamForm((prev) => ({ ...prev, category: activeCategory }));
    setIsTeamDialogOpen(true);
  };

  const handleEditTeam = (teamId: string) => {
    if (!selectedState) return;
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }

    const teamToEdit = selectedState.teams.find((team) => team.id === teamId);
    if (!teamToEdit) return;

    const competition = teamToEdit.division
      ? `${teamToEdit.league} · ${teamToEdit.division}`
      : teamToEdit.league;

    setTeamForm({
      name: teamToEdit.name,
      competition,
      trainingDay1: teamToEdit.trainingSlots[0]?.day ?? "",
      trainingTime1: teamToEdit.trainingSlots[0]?.time ?? "",
      trainingDay2: teamToEdit.trainingSlots[1]?.day ?? "",
      trainingTime2: teamToEdit.trainingSlots[1]?.time ?? "",
      homeVenue: teamToEdit.homeMatch?.location ?? "",
      category: activeCategory
    });
    setEditingTeamId(teamId);
    setIsTeamDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!selectedState) return;
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }

    if (!teamForm.name.trim() || !teamForm.competition.trim()) {
      toast({
        title: "Angaben unvollständig",
        description: "Bitte geben Sie mindestens Mannschaftsname und Spielklasse/Staffel an.",
        variant: "destructive"
      });
      return;
    }

    const hasTraining1 = teamForm.trainingDay1 && teamForm.trainingTime1;
    const hasTraining2 = teamForm.trainingDay2 && teamForm.trainingTime2;
    const training1Partial =
      (teamForm.trainingDay1 && !teamForm.trainingTime1) || (!teamForm.trainingDay1 && teamForm.trainingTime1);
    const training2Partial =
      (teamForm.trainingDay2 && !teamForm.trainingTime2) || (!teamForm.trainingDay2 && teamForm.trainingTime2);

    if (training1Partial || training2Partial) {
      toast({
        title: "Trainingstag unvollständig",
        description: "Bitte geben Sie für Trainingstage immer Wochentag und Uhrzeit an.",
        variant: "destructive"
      });
      return;
    }

    const trainingSlots: { day: string; time: string }[] = [];
    if (hasTraining1) {
      trainingSlots.push({ day: teamForm.trainingDay1, time: teamForm.trainingTime1.trim() });
    }
    if (hasTraining2) {
      trainingSlots.push({ day: teamForm.trainingDay2, time: teamForm.trainingTime2.trim() });
    }

    if (trainingSlots.length === 0) {
      toast({
        title: "Training fehlt",
        description: "Bitte hinterlegen Sie mindestens einen Trainingstag mit Uhrzeit.",
        variant: "destructive"
      });
      return;
    }

    const competitionRaw = teamForm.competition.trim();
    const [leagueValue, ...divisionParts] = competitionRaw
      .split("·")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!leagueValue) {
      toast({
        title: "Spielklasse fehlt",
        description: "Bitte geben Sie mindestens eine Spielklasse an.",
        variant: "destructive"
      });
      return;
    }

    const divisionValue = divisionParts.length > 0 ? divisionParts.join(" · ") : null;

    const homeMatch = teamForm.homeVenue.trim()
      ? {
          location: teamForm.homeVenue.trim()
        }
      : null;

    try {
      if (editingTeamId) {
        const { error } = await supabase
          .from("teams")
          .update({
            name: teamForm.name.trim(),
            league: leagueValue,
            division: divisionValue,
            training_slots: trainingSlots,
            home_match: homeMatch,
            category: teamForm.category
          })
          .eq("id", editingTeamId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("teams")
          .insert([
            {
              season_id: selectedSeasonId,
              name: teamForm.name.trim(),
              league: leagueValue,
              division: divisionValue,
              training_slots: trainingSlots,
              home_match: homeMatch,
              category: teamForm.category
            }
          ]);

        if (error) throw error;
      }

      await loadTeamsForSeason(selectedSeasonId, activeCategory);
      notifyTeamUpdate();

      toast({
        title: editingTeamId ? "Mannschaft aktualisiert" : "Mannschaft erstellt",
        description: `${teamForm.name.trim()} wurde ${editingTeamId ? "aktualisiert" : "angelegt"}.`
      });

      setIsTeamDialogOpen(false);
      resetTeamDialog();
    } catch (error) {
      console.error("Error saving team:", error);
      toast({
        title: "Fehler",
        description: "Mannschaft konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!selectedState) return;
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }

    const teamToDelete = selectedState.teams.find((team) => team.id === teamId);
    if (!teamToDelete) return;

    const confirmDelete = window.confirm(`Soll die Mannschaft "${teamToDelete.name}" wirklich gelöscht werden?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;

      await loadTeamsForSeason(selectedSeasonId, activeCategory);
      notifyTeamUpdate();

      toast({
        title: "Mannschaft gelöscht",
        description: `${teamToDelete.name} wurde entfernt.`
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Fehler",
        description: "Mannschaft konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleOpenSeasonDialog = async (seasonId?: string, category?: "erwachsene" | "jugend") => {
    if (!canEditPositions) {
      toast({
        title: "Berechtigung erforderlich",
        description: "Nur Administratoren und Vorstandsmitglieder können Saisons bearbeiten.",
        variant: "destructive"
      });
      return;
    }

    if (seasonId) {
      try {
        const { data: season, error } = await supabase
          .from("seasons")
          .select("*")
          .eq("id", seasonId)
          .single();

        if (error) throw error;

        if (season) {
          setEditingSeasonId(seasonId);
          setSeasonForm({
            label: season.label,
            startYear: season.start_year.toString(),
            endYear: season.end_year.toString(),
            isArchived: season.is_archived ?? false
          });
        }
      } catch (error) {
        console.error("Error loading season:", error);
        toast({
          title: "Fehler",
          description: "Saison konnte nicht geladen werden.",
          variant: "destructive"
        });
        return;
      }
    } else {
      setEditingSeasonId(null);
      const categoryPrefix = category === "jugend" ? "J" : "E";
      setSeasonForm({
        label: `${categoryPrefix} Saison `,
        startYear: "",
        endYear: "",
        isArchived: false
      });
    }
    setIsSeasonDialogOpen(true);
  };

  const handleDeleteSeason = async (seasonId: string) => {
    if (!canManageSeasons) {
      toast({
        title: "Berechtigung erforderlich",
        description: "Nur Administratoren und Vorstandsmitglieder können Saisons löschen.",
        variant: "destructive"
      });
      return;
    }

    const seasonToDelete = seasonList.find((s) => s.id === seasonId);
    if (!seasonToDelete) return;

    const confirmDelete = window.confirm(
      `Soll die Saison "${seasonToDelete.label}" wirklich gelöscht werden?\n\nAlle Mannschaften und deren Zuordnungen werden ebenfalls entfernt.`
    );
    if (!confirmDelete) return;

    try {
      // First delete all teams in this season (team_members will be deleted by CASCADE)
      const { error: teamsError } = await supabase
        .from("teams")
        .delete()
        .eq("season_id", seasonId);

      if (teamsError) throw teamsError;

      // Then delete the season itself
      const { error: seasonError } = await supabase
        .from("seasons")
        .delete()
        .eq("id", seasonId);

      if (seasonError) throw seasonError;

      // Reload seasons
      await loadSeasons();

      // Reset selected season if deleted
      if (selectedSeasonIdAdults === seasonId) {
        setSelectedSeasonIdAdults("");
      }
      if (selectedSeasonIdYouth === seasonId) {
        setSelectedSeasonIdYouth("");
      }

      notifyTeamUpdate();

      toast({
        title: "Saison gelöscht",
        description: `${seasonToDelete.label} und alle zugehörigen Mannschaften wurden entfernt.`
      });
    } catch (error) {
      console.error("Error deleting season:", error);
      toast({
        title: "Fehler",
        description: "Saison konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveSeason = async () => {
    if (!seasonForm.label || !seasonForm.label.trim() || !seasonForm.startYear || !seasonForm.endYear) {
      toast({
        title: "Angaben unvollständig",
        description: "Bitte geben Sie einen Namen sowie Start- und Endjahr an.",
        variant: "destructive"
      });
      return;
    }

    const seasonId = `${seasonForm.startYear}-${seasonForm.endYear}`;
    
    try {
      if (editingSeasonId) {
        // Check if the new time range conflicts with another season
        const { data: existing } = await supabase
          .from("seasons")
          .select("id")
          .eq("id", seasonId)
          .maybeSingle();

        if (existing && existing.id !== editingSeasonId) {
          toast({
            title: "Zeitraum bereits belegt",
            description: `Der Zeitraum ${seasonForm.startYear}/${seasonForm.endYear} wird bereits von einer anderen Saison verwendet.`,
            variant: "destructive"
          });
          return;
        }

        // If ID changed, we need to update all references
        if (seasonId !== editingSeasonId) {
          // Update teams to reference new season ID
          const { error: teamsError } = await supabase
            .from("teams")
            .update({ season_id: seasonId })
            .eq("season_id", editingSeasonId);

          if (teamsError) throw teamsError;

          // Delete old season
          const { error: deleteError } = await supabase
            .from("seasons")
            .delete()
            .eq("id", editingSeasonId);

          if (deleteError) throw deleteError;

          // Create new season with updated ID (keep archive status from edit)
          const categoryFromLabel = seasonForm.label.trim().startsWith("J") ? "jugend" : "erwachsene";
          const { error: insertError } = await supabase
            .from("seasons")
            .insert({
              id: seasonId,
              label: seasonForm.label.trim(),
              start_year: Number(seasonForm.startYear),
              end_year: Number(seasonForm.endYear),
              is_current: false,
              is_archived: seasonForm.isArchived,
              category: categoryFromLabel
            });

          if (insertError) throw insertError;
        } else {
          // Just update the label if ID stayed the same
          const { error } = await supabase
            .from("seasons")
            .update({
              label: seasonForm.label.trim(),
              start_year: Number(seasonForm.startYear),
              end_year: Number(seasonForm.endYear),
              is_archived: seasonForm.isArchived
            })
            .eq("id", editingSeasonId);

          if (error) throw error;
        }

        toast({
          title: "Saison aktualisiert",
          description: `${seasonForm.label} wurde aktualisiert.`
        });
      } else {
        // Check if season already exists
        const { data: existing } = await supabase
          .from("seasons")
          .select("id")
          .eq("id", seasonId)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Saison existiert bereits",
            description: `Für den Zeitraum ${seasonForm.startYear}/${seasonForm.endYear} wurde schon eine Saison angelegt.`,
            variant: "destructive"
          });
          return;
        }

        // Create new season (always active, never archived)
        // Determine category based on label prefix (E or J)
        const categoryFromLabel = seasonForm.label.trim().startsWith("J") ? "jugend" : "erwachsene";
        const { error } = await supabase
          .from("seasons")
          .insert({
            id: seasonId,
            label: seasonForm.label.trim(),
            start_year: Number(seasonForm.startYear),
            end_year: Number(seasonForm.endYear),
            is_current: false,
            is_archived: false,
            category: categoryFromLabel
          });

        if (error) throw error;

        toast({
          title: "Neue Saison erstellt",
          description: `${seasonForm.label} wurde angelegt.`
        });
      }

      await loadSeasons();
      setIsSeasonDialogOpen(false);
      setEditingSeasonId(null);
      setSeasonForm({ label: "", startYear: "", endYear: "", isArchived: false });
    } catch (error) {
      console.error("Error saving season:", error);
      toast({
        title: "Fehler",
        description: "Saison konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const canManageSeasons = userRole === "admin" || userRole === "vorstand";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-1/4 rounded bg-muted mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Mannschaftsverwaltung
          </h2>
          <p className="text-muted-foreground">
            Ordnen Sie Mitglieder den Mannschaften zu, definieren Sie Mannschaftsführer und behalten Sie vergangene Saisons im Blick.
          </p>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as "erwachsene" | "jugend")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="erwachsene">Erwachsene</TabsTrigger>
          <TabsTrigger value="jugend">Jugend</TabsTrigger>
        </TabsList>

        <TabsContent value="erwachsene" className="space-y-6">
          {renderCategoryContent("erwachsene")}
        </TabsContent>

        <TabsContent value="jugend" className="space-y-6">
          {renderCategoryContent("jugend")}
        </TabsContent>
      </Tabs>

      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Mannschaftszuordnungen im Profil
          </CardTitle>
          <CardDescription>
            Aktivieren oder deaktivieren Sie Spieler:innen pro Mannschaft direkt im jeweiligen Profil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Öffnen Sie das Profil eines Mitglieds und wechseln Sie zum Reiter "Mannschaften", um Einsätze festzulegen.</p>
          <p>Beim Speichern werden die Zuordnungen übernommen. Entfernen Sie ein Mitglied hier aus einer Mannschaft, wird die Zuordnung im Profil automatisch deaktiviert.</p>
        </CardContent>
      </Card>

      <Dialog open={isSeasonDialogOpen} onOpenChange={setIsSeasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeasonId ? "Saison bearbeiten" : "Neue Saison anlegen"}
            </DialogTitle>
            <DialogDescription>
              {editingSeasonId
                ? "Passen Sie die Saisondaten an."
                : `Erfassen Sie eine neue Spielzeit, um Mannschaften und Mitglieder später zuzuordnen.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="season-label">Bezeichnung</Label>
              <Input
                id="season-label"
                placeholder="z. B. Saison 2026/27"
                value={seasonForm.label}
                onChange={(event) =>
                  setSeasonForm((prev) => ({ ...prev, label: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="season-start">Startjahr</Label>
                <Input
                  id="season-start"
                  type="number"
                  placeholder="2026"
                  value={seasonForm.startYear}
                  onChange={(event) =>
                    setSeasonForm((prev) => ({ ...prev, startYear: event.target.value }))
                  }
                  disabled={!!editingSeasonId}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="season-end">Endjahr</Label>
                <Input
                  id="season-end"
                  type="number"
                  placeholder="2027"
                  value={seasonForm.endYear}
                  onChange={(event) =>
                    setSeasonForm((prev) => ({ ...prev, endYear: event.target.value }))
                  }
                  disabled={!!editingSeasonId}
                />
                <p className="text-xs text-muted-foreground">
                  Hinweis: Jugend-Saisons können im gleichen Jahr starten und enden (z.B. VR und RR).
                </p>
              </div>
            </div>
            {editingSeasonId && (
              <div className="flex items-center space-x-2 pt-2 border-t mt-4 pt-4">
                <input
                  type="checkbox"
                  id="season-archived"
                  checked={seasonForm.isArchived}
                  onChange={(event) =>
                    setSeasonForm((prev) => ({ ...prev, isArchived: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="season-archived" className="text-sm font-normal cursor-pointer">
                  Saison archivieren (nicht mehr aktiv für neue Mannschaften)
                </Label>
              </div>
            )}
          </div>
          <DialogFooterPrimitive className="sm:justify-start">
            <Button onClick={handleSaveSeason} className="bg-gradient-secondary hover:bg-secondary/90">
              {editingSeasonId ? "Änderungen speichern" : "Saison speichern"}
            </Button>
          </DialogFooterPrimitive>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTeamDialogOpen}
        onOpenChange={(open) => {
          setIsTeamDialogOpen(open);
          if (!open) {
            resetTeamDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeamId ? "Mannschaft bearbeiten" : "Neue Mannschaft anlegen"}</DialogTitle>
            <DialogDescription>
              Hinterlegen Sie Spielklasse/Staffel, Trainingszeiten und den Heimspielort für diese Saison.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Mannschaftsname</Label>
              <Input
                id="team-name"
                value={teamForm.name}
                onChange={(event) => updateTeamForm("name", event.target.value)}
                placeholder="z. B. Herren I"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-competition">Spielklasse &amp; Staffel / Gruppe</Label>
              <Input
                id="team-competition"
                value={teamForm.competition}
                onChange={(event) => updateTeamForm("competition", event.target.value)}
                placeholder="z. B. Verbandsliga Süd · Staffel A"
              />
            </div>
            <div className="grid gap-2">
              <Label>Trainingstag 1</Label>
              <div className="grid gap-2 sm:grid-cols-[2fr,1fr]">
                <Select
                  value={teamForm.trainingDay1}
                  onValueChange={(value) => updateTeamForm("trainingDay1", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wochentag wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={`training-day1-${day}`} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={teamForm.trainingTime1}
                  onChange={(event) => updateTeamForm("trainingTime1", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Trainingstag 2 (optional)</Label>
              <div className="grid gap-2 sm:grid-cols-[2fr,1fr]">
                <Select
                  value={teamForm.trainingDay2 || "none"}
                  onValueChange={(value) => {
                    const newValue = value === "none" ? "" : value;
                    updateTeamForm("trainingDay2", newValue);
                    if (value === "none") {
                      updateTeamForm("trainingTime2", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optionaler Wochentag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein zweiter Termin</SelectItem>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={`training-day2-${day}`} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={teamForm.trainingTime2}
                  onChange={(event) => updateTeamForm("trainingTime2", event.target.value)}
                  disabled={!teamForm.trainingDay2}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-home-venue">Heimspielort (optional)</Label>
              <Input
                id="team-home-venue"
                value={teamForm.homeVenue}
                onChange={(event) => updateTeamForm("homeVenue", event.target.value)}
                placeholder="z. B. Sporthalle Musterstadt, Musterstraße 1"
              />
              <p className="text-xs text-muted-foreground">
                Wird unter anderem beim Spielplan-Import zur Adresszuordnung verwendet.
              </p>
            </div>
          </div>
          <DialogFooterPrimitive className="sm:justify-start">
            <Button onClick={handleSaveTeam} className="bg-gradient-primary hover:bg-primary-hover">
              {editingTeamId ? "Änderungen speichern" : "Mannschaft speichern"}
            </Button>
          </DialogFooterPrimitive>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderCategoryContent(category: "erwachsene" | "jugend") {
    const currentSeasonId = category === "erwachsene" ? selectedSeasonIdAdults : selectedSeasonIdYouth;
    const setCurrentSeasonId = category === "erwachsene" ? setSelectedSeasonIdAdults : setSelectedSeasonIdYouth;
    const currentSeason = seasonList.find((season) => season.id === currentSeasonId);
    const currentState = seasonStates[`${currentSeasonId}-${category}`];
    const isSeasonActive = !Boolean(currentSeason?.isArchived);
    
    // Filter seasons by category based on label prefix
    const categorizedSeasons = seasonList.filter(s => {
      if (category === 'erwachsene') {
        return s.label.startsWith('E ');
      } else {
        return s.label.startsWith('J ');
      }
    });

    return (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={currentSeasonId} onValueChange={setCurrentSeasonId}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Saison auswählen" />
              </SelectTrigger>
              <SelectContent>
                {categorizedSeasons.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.label} {season.isCurrent && "• Aktuell"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageSeasons && (
              <>
                <Button
                  onClick={() => handleOpenSeasonDialog(undefined, category)}
                  className="bg-gradient-primary hover:bg-primary-hover shadow-sport"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {category === "erwachsene" ? "E" : "J"} Saison anlegen
                </Button>
                {currentSeasonId && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleOpenSeasonDialog(currentSeasonId, category)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {category === "erwachsene" ? "E" : "J"} Saison bearbeiten
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteSeason(currentSeasonId)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {category === "erwachsene" ? "E" : "J"} Saison löschen
                    </Button>
                  </>
                
                )}
              </>
            )}
          </div>
        </div>

        {currentSeason && (
          <Card className="border-dashed border-primary/40">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  {currentSeason.label}
                </CardTitle>
                <CardDescription>
                  Zeitraum {currentSeason.startYear}/{currentSeason.endYear} · {currentSeason.isArchived ? "Archiv" : "Aktiv"}
                </CardDescription>
              </div>
              {currentSeason.isCurrent && (
                <Badge className="bg-primary/10 text-primary border border-primary/40 flex items-center gap-1">
                  <Flag className="h-3.5 w-3.5" /> Aktuell
                </Badge>
              )}
            </CardHeader>
          </Card>
        )}

        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-foreground">Teams der Saison</h3>
              <p className="text-sm text-muted-foreground">
                Pflegen Sie Spielklassen, Trainingszeiten und Heimspielorte für die {category === "erwachsene" ? "Erwachsenen" : "Jugend"}-Mannschaften.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateTeam}
              className={cn(
                "bg-gradient-secondary hover:bg-secondary-hover shadow-sport",
                !isSeasonActive && "opacity-60"
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              Neue Mannschaft
            </Button>
          </div>

          {!isSeasonActive && (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-4 text-sm text-muted-foreground">
              Diese Saison ist archiviert. Änderungen an Mannschaften sind nur für Administratoren möglich.
            </div>
          )}

          {currentState && currentState.teams.length === 0 ? (
            <Card className="border-dashed border-muted-foreground/40 bg-muted/10">
              <CardContent className="py-8 text-center text-muted-foreground space-y-3">
                <p>Noch keine Mannschaften für diese Saison angelegt.</p>
                <p>
                  Nutzen Sie "Neue Mannschaft", um zu starten und ordnen Sie anschließend Spieler:innen über den Profil-Reiter "Mannschaften" zu.
                </p>
              </CardContent>
            </Card>
          ) : (
            currentState?.teams.map((team, teamIndex) => (
              <Card key={team.id} className="shadow-sm border-border/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {team.name}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" /> {team.league}
                        </Badge>
                        {team.division && <Badge variant="outline">{team.division}</Badge>}
                        {team.trainingSlots.map((slot, index) => (
                          <Badge key={`${team.id}-training-${index}`} variant="outline">
                            Training {index + 1}: {slot.day} · {slot.time} Uhr
                          </Badge>
                        ))}
                        {team.homeMatch && (team.homeMatch.location || team.homeMatch.day) && (
                          <Badge variant="outline">
                            {team.homeMatch.day && team.homeMatch.time
                              ? `Heimspiel: ${team.homeMatch.day} · ${team.homeMatch.time} Uhr · ${team.homeMatch.location}`
                              : `Heimspielort: ${team.homeMatch.location}`}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-secondary/10 text-secondary-foreground">
                        {team.members.length} Spieler:innen
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTeam(team.id)}
                        className={cn("hover:text-primary", !isSeasonActive && "opacity-60")}
                        title={
                          isSeasonActive
                            ? "Mannschaft bearbeiten"
                            : "Nur in der aktuellen Saison bearbeitbar"
                        }
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Mannschaft bearbeiten</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTeam(team.id)}
                        className={cn("text-destructive hover:text-destructive", !isSeasonActive && "opacity-60")}
                        title={
                          isSeasonActive
                            ? "Mannschaft löschen"
                            : "Nur in der aktuellen Saison löschbar"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Mannschaft löschen</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {team.members.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                        Noch keine Mitglieder in dieser Mannschaft. Ordnen Sie Spieler:innen direkt über den Profil-Reiter "Mannschaften" zu.
                      </div>
                    ) : (
                      team.members.map((member) => {
                        const teamOrder = teamIndex + 1;
                        const memberKey = `${team.id}-${member.id}`;
                        const isUpdatingPosition = Boolean(positionUpdates[memberKey]);
                        const currentPositionValue = member.position ?? "unassigned";
                        const basePositionOptions = Array.from({ length: team.members.length }, (_, index) =>
                          buildTeamPosition(teamOrder, index + 1)
                        );
                        const positionOptions = Array.from(
                          new Set([
                            ...basePositionOptions,
                            ...(member.position ? [member.position] : [])
                          ])
                        ).sort((a, b) => compareTeamPositions(a, b));

                        return (
                          <div
                            key={member.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-muted/70 bg-muted/20 p-4"
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="bg-primary/10 text-primary">
                                <AvatarFallback>
                                  {member.name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground">{member.name}</p>
                                  {member.isCaptain && (
                                    <Badge className="bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                                      <Crown className="h-3.5 w-3.5" /> Mannschaftsführer:in
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                                  <Badge variant="outline">QTTR {member.rating}</Badge>
                                  {member.playStyle && <Badge variant="outline">Spielstil: {member.playStyle}</Badge>}
                                  {member.position && (
                                    <Badge variant="outline" className="border-primary/40 text-primary">
                                      Position {member.position}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                              <Select
                                value={currentPositionValue}
                                onValueChange={(value) =>
                                  handleUpdateMemberPosition(team.id, member.id, value, member.position)
                                }
                                disabled={!isSeasonActive || isUpdatingPosition || !canEditPositions}
                              >
                                <SelectTrigger className="w-44">
                                  <SelectValue placeholder="Position wählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Keine Position</SelectItem>
                                  {positionOptions.map((positionValue) => (
                                    <SelectItem key={positionValue} value={positionValue}>
                                      {`Position ${positionValue}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={member.isCaptain ? "default" : "outline"}
                                  className={cn(
                                    member.isCaptain ? "bg-gradient-secondary" : "",
                                    "flex items-center gap-2",
                                    !isSeasonActive && "opacity-60"
                                  )}
                                  onClick={() => handleSetCaptain(team.id, member.id)}
                                >
                                  <Crown className="h-4 w-4" />
                                  {member.isCaptain ? "Mannschaftsführer" : "Als Mannschaftsführer setzen"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "text-destructive hover:text-destructive",
                                    !isSeasonActive && "opacity-60"
                                  )}
                                  onClick={() => handleRemoveMember(team.id, member.id)}
                                >
                                  Entfernen
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Weitere Zuordnungen verwalten Sie über den Profil-Reiter "Mannschaften" der jeweiligen Mitglieder.
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </>
    );
  }
};