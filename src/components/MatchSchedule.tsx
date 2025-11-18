import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Edit, Eye, Key, MapPin, Plus, Search, Trash2, Trophy, Users, Download, FileText, Save, X } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Match } from "@/types/match";

import { MatchLineup } from "@/components/MatchLineup";
import { HALL_UPDATE_EVENT } from "@/lib/hallEvents";

const LOCAL_STORAGE_KEY = "icsImportedMatches";
const IMPORT_EVENT = "ics-import-updated";
const TEAM_UPDATE_EVENT = "team-management-updated";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Geplant",
  completed: "Abgeschlossen",
  canceled: "Abgesagt"
};

const UNKNOWN_TEAM_LABEL = "Unbekannte Mannschaft";

const getTeamLabel = (team?: string | null) => {
  if (!team) return UNKNOWN_TEAM_LABEL;
  const trimmed = team.trim();
  return trimmed.length > 0 ? trimmed : UNKNOWN_TEAM_LABEL;
};

const getClubTeamName = (match: Match) => getTeamLabel(match.club_team ?? match.team);
const getHomeTeamName = (match: Match) => getTeamLabel(match.home_team ?? match.team);
const getAwayTeamName = (match: Match) => getTeamLabel(match.away_team ?? match.opponent);

const parseMatchDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchSortValue = (value?: string | null) => {
  const parsed = parseMatchDate(value);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
};

const datesAreOnSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const MatchSchedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [importedMatches, setImportedMatches] = useState<Match[]>([]);
  const [dbTeams, setDbTeams] = useState<Array<{ name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [matchFormMatch, setMatchFormMatch] = useState<Match | null>(null);
  const [matchForm, setMatchForm] = useState({
    team: "",
    opponent: "",
    date: "",
    time: "",
    location: "",
    status: "scheduled",
    clubTeam: ""
  });
  const [resultForm, setResultForm] = useState({ home: "", away: "" });
  const [selectedPinTeam, setSelectedPinTeam] = useState<string | null>(null);
  const [teamPins, setTeamPins] = useState<Record<string, { spielpin: string; spielpartie_pin: string | null }>>({});
  const [pinsDialogOpen, setPinsDialogOpen] = useState(false);
  const [selectedPinType, setSelectedPinType] = useState<"spielpin" | "spielpartie_pin" | null>(null);
  const [lineupDialogOpen, setLineupDialogOpen] = useState(false);
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
  const [halls, setHalls] = useState<Array<{ id: string; hall_number: number; name: string; address: string | null }>>([]);
  const [matchPins, setMatchPins] = useState<Record<string, { spielpin: string; spielpartie_pin: string | null }>>({});
  const [showPinsView, setShowPinsView] = useState(false);
  const [editingPinMatchId, setEditingPinMatchId] = useState<string | null>(null);
  const [editPinForm, setEditPinForm] = useState({ spielpin: "", spielpartie_pin: "" });
  const [homeRightLoading, setHomeRightLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const loadHalls = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("club_halls")
        .select("id, hall_number, name, address")
        .order("hall_number");

      if (error) throw error;
      setHalls(data || []);
    } catch (error) {
      console.error("Error loading halls:", error);
    }
  }, []);

  const loadDbTeams = useCallback(async () => {
    try {
      // Lade aktuelle Saisons aus der Datenbank
      const { data: currentSeasons, error: seasonsError } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true);

      if (seasonsError) throw seasonsError;

      let query = supabase.from("teams").select("name");

      if (currentSeasons && currentSeasons.length > 0) {
        const seasonIds = currentSeasons.map(s => s.id);
        query = query.in("season_id", seasonIds);
      }

      const { data, error } = await query.order("name", { ascending: true });

      if (error) throw error;
      setDbTeams((data || []).map(t => ({ name: t.name })));
    } catch (error) {
      console.error("Error loading teams from database:", error);
    }
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (data && data.length > 0) {
        // Check if user has any of the required roles
        const hasEditRole = data.some(r => 
          r.role === 'admin' || r.role === 'vorstand' || r.role === 'moderator' || r.role === 'mannschaftsfuehrer'
        );
        
        if (hasEditRole) {
          // Set to the first matching role for display purposes
          const editRole = data.find(r => 
            r.role === 'admin' || r.role === 'vorstand' || r.role === 'moderator' || r.role === 'mannschaftsfuehrer'
          );
          setUserRole(editRole?.role || null);
        } else {
          setUserRole(data[0].role);
        }
      }
    }
  };

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      const normalized = (data || []).map((match) => ({
        ...match,
        time: match.time || "",
        home_team: match.home_team ?? match.team,
        away_team: match.away_team ?? match.opponent,
        club_team: match.club_team ?? match.team,
        source: "supabase" as const
      }));
      setMatches(normalized);

      // Load match pins for all matches
      if (data && data.length > 0) {
        const matchIds = data.map((m) => m.id);
        const { data: pinsData, error: pinsError } = await supabase
          .from("match_pins")
          .select("*")
          .in("match_id", matchIds);

        if (pinsError) {
          console.error("Error loading match pins:", pinsError);
        } else if (pinsData) {
          const pinsMap: Record<string, { spielpin: string; spielpartie_pin: string | null }> = {};
          pinsData.forEach((pin) => {
            pinsMap[pin.match_id] = {
              spielpin: pin.spielpin,
              spielpartie_pin: pin.spielpartie_pin
            };
          });
          setMatchPins(pinsMap);
        }
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Fehler",
        description: "Spiele konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadImportedMatches = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        setImportedMatches([]);
        return;
      }

      let parsed: Match[];
      try {
        parsed = JSON.parse(stored) as Match[];
      } catch (error) {
        console.error("Fehler beim Parsen der gespeicherten Spiele:", error);
        setImportedMatches([]);
        return;
      }
      const normalized = parsed.map((match) => ({
        ...match,
        home_team: match.home_team ?? match.team,
        away_team: match.away_team ?? match.opponent,
        club_team: match.club_team ?? match.team,
        source: "ics" as const
      }));
      setImportedMatches(normalized);
    } catch (error) {
      console.error("Error loading ICS matches:", error);
      setImportedMatches([]);
    }
  }, []);

  const loadAllTeamPins = useCallback(async () => {
    try {
      // Get all match pins
      const { data: pins, error: pinsError } = await supabase
        .from("match_pins")
        .select(`
          spielpin,
          spielpartie_pin,
          matches!inner(team, club_team)
        `);

      if (pinsError) throw pinsError;

      // Group pins by team
      const pinsByTeam: Record<string, { spielpin: string; spielpartie_pin: string | null }> = {};
      if (pins) {
        pins.forEach((pin: any) => {
          const teamName = pin.matches?.club_team ?? pin.matches?.team;
          if (teamName && !pinsByTeam[teamName]) {
            pinsByTeam[teamName] = {
              spielpin: pin.spielpin,
              spielpartie_pin: pin.spielpartie_pin
            };
          }
        });
      }

      setTeamPins(pinsByTeam);
    } catch (error) {
      console.error("Error loading team pins:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserRole();
    fetchMatches();
    loadImportedMatches();
    loadDbTeams();
    loadAllTeamPins();
    loadHalls();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY) {
        loadImportedMatches();
      }
    };

    const handleImportUpdate = () => {
      loadImportedMatches();
    };

    const handleTeamUpdate = () => {
      loadDbTeams();
      loadAllTeamPins();
    };

    const handleHallUpdate = () => {
      loadHalls();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(IMPORT_EVENT, handleImportUpdate as EventListener);
    window.addEventListener(TEAM_UPDATE_EVENT, handleTeamUpdate as EventListener);
    window.addEventListener(HALL_UPDATE_EVENT, handleHallUpdate as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(IMPORT_EVENT, handleImportUpdate as EventListener);
      window.removeEventListener(TEAM_UPDATE_EVENT, handleTeamUpdate as EventListener);
      window.removeEventListener(HALL_UPDATE_EVENT, handleHallUpdate as EventListener);
    };
  }, [fetchMatches, loadImportedMatches, loadDbTeams, loadAllTeamPins, loadHalls]);

  const handleSaveResult = async () => {
    if (!resultMatch) return;

    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (resultMatch.source === "ics" && !canEditImported) {
      toast({
        title: "Nicht möglich",
        description: "Importierte Spiele werden über den ICS-Import verwaltet.",
        variant: "destructive"
      });
      return;
    }

    const homeScore = parseInt(resultForm.home, 10);
    const awayScore = parseInt(resultForm.away, 10);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      toast({
        title: "Ungültiges Ergebnis",
        description: "Bitte geben Sie gültige Zahlen für beide Ergebnisse ein.",
        variant: "destructive"
      });
      return;
    }

    try {
      const isIcsMatch = resultMatch.source === "ics";
      
      if (isIcsMatch) {
        // For ICS matches, create a new match in Supabase with the result
        const { error } = await supabase
          .from("matches")
          .insert([{ 
            team: resultMatch.home_team ?? resultMatch.team,
            opponent: resultMatch.away_team ?? resultMatch.opponent,
            date: resultMatch.date,
            time: resultMatch.time || "",
            location: resultMatch.location || "",
            home_score: homeScore,
            away_score: awayScore,
            status: "completed",
            home_team: resultMatch.home_team ?? resultMatch.team,
            away_team: resultMatch.away_team ?? resultMatch.opponent,
            club_team: resultMatch.club_team ?? resultMatch.team
          }]);

        if (error) throw error;

        // Remove from localStorage
        if (resultMatch.icsUid) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            try {
              const allIcsMatches = JSON.parse(stored) as Match[];
              const filtered = allIcsMatches.filter(m => m.icsUid !== resultMatch.icsUid);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            } catch (error) {
              console.error("Fehler beim Parsen der gespeicherten Spiele:", error);
            }
            loadImportedMatches();
          }
        }
      } else {
        // Update existing Supabase match
        const { error } = await supabase
          .from("matches")
          .update({
            home_score: homeScore,
            away_score: awayScore,
            status: "completed"
          } as Partial<Match>)
          .eq("id", resultMatch.id);

        if (error) throw error;
      }

      toast({
        title: "Erfolg",
        description: isIcsMatch 
          ? "ICS-Spiel mit Ergebnis in den regulären Spielplan übernommen."
          : "Ergebnis wurde gespeichert."
      });

      fetchMatches();
      setResultDialogOpen(false);
      setResultMatch(null);
    } catch (error) {
      console.error("Error saving result:", error);
      toast({
        title: "Fehler",
        description: "Ergebnis konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveMatch = async () => {
    if (!matchForm.team || !matchForm.opponent || !matchForm.date || !matchForm.time || !matchForm.location) {
      toast({
        title: "Pflichtfelder fehlen",
        description: "Bitte füllen Sie alle Felder aus, um den Spielplan zu speichern.",
        variant: "destructive"
      });
      return;
    }

    try {
      const isIcsMatch = matchFormMatch?.source === "ics";
      const preferredClubTeam = matchForm.clubTeam?.trim();
      const resolvedClubTeam =
        preferredClubTeam && preferredClubTeam.length > 0
          ? preferredClubTeam
          : (() => {
              const teamMatch = dbTeams.find((team) => team.name.toLowerCase() === matchForm.team.toLowerCase());
              if (teamMatch) return teamMatch.name;
              const opponentMatch = dbTeams.find((team) => team.name.toLowerCase() === matchForm.opponent.toLowerCase());
              if (opponentMatch) return opponentMatch.name;
              return matchForm.team;
            })();

      if (matchFormMatch && !isIcsMatch) {
        // Update existing Supabase match
        const { error } = await supabase
          .from("matches")
          .update({
            team: matchForm.team,
            opponent: matchForm.opponent,
            date: matchForm.date,
            time: matchForm.time,
            location: matchForm.location,
            status: matchForm.status,
            home_team: matchForm.team,
            away_team: matchForm.opponent,
            club_team: resolvedClubTeam
          } as Partial<Match>)
          .eq("id", matchFormMatch.id);

        if (error) throw error;

        toast({
          title: "Spiel aktualisiert",
          description: "Die Spielplandaten wurden erfolgreich aktualisiert."
        });
      } else {
        // Create new match (either new or converted from ICS)
        const { error } = await supabase
          .from("matches")
          .insert([{ 
            team: matchForm.team,
            opponent: matchForm.opponent,
            date: matchForm.date,
            time: matchForm.time,
            location: matchForm.location,
            status: matchForm.status,
            home_score: null,
            away_score: null,
            home_team: matchForm.team,
            away_team: matchForm.opponent,
            club_team: resolvedClubTeam
          }]);

        if (error) throw error;

        // If this was an ICS match, remove it from localStorage
        if (isIcsMatch && matchFormMatch?.icsUid) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            try {
              const allIcsMatches = JSON.parse(stored) as Match[];
              const filtered = allIcsMatches.filter(m => m.icsUid !== matchFormMatch.icsUid);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            } catch (error) {
              console.error("Fehler beim Parsen der gespeicherten Spiele:", error);
            }
            loadImportedMatches();
          }
        }

        toast({
          title: isIcsMatch ? "ICS-Spiel übernommen" : "Spiel erstellt",
          description: isIcsMatch 
            ? "Das ICS-Spiel wurde in den regulären Spielplan übernommen." 
            : "Das Spiel wurde zum Spielplan hinzugefügt."
        });
      }

      fetchMatches();
      resetMatchForm();
    } catch (error) {
      console.error("Error saving match:", error);
      toast({
        title: "Fehler",
        description: "Der Spielplan konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMatch = async (match: Match) => {
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (match.source === "ics" && !canEditImported) {
      toast({
        title: "Aktion nicht verfügbar",
        description: "Importierte Spiele können hier nicht gelöscht werden.",
        variant: "destructive"
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Soll das Spiel ${getHomeTeamName(match)} vs ${getAwayTeamName(match)} wirklich gelöscht werden?`
    );
    if (!confirmDelete) return;

    try {
      const isIcsMatch = match.source === "ics";
      
      if (isIcsMatch) {
        // Delete from localStorage
        if (match.icsUid) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            try {
              const allIcsMatches = JSON.parse(stored) as Match[];
              const filtered = allIcsMatches.filter(m => m.icsUid !== match.icsUid);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            } catch (error) {
              console.error("Fehler beim Parsen der gespeicherten Spiele:", error);
            }
            loadImportedMatches();
          }
        }
      } else {
        // Delete from Supabase
        const { error } = await supabase
          .from("matches")
          .delete()
          .eq("id", match.id);

        if (error) throw error;
        fetchMatches();
      }

      toast({
        title: "Spiel gelöscht",
        description: "Das Spiel wurde aus dem Spielplan entfernt."
      });
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Fehler",
        description: "Das Spiel konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const resetMatchForm = () => {
    setMatchDialogOpen(false);
    setMatchFormMatch(null);
    setMatchForm({
      team: "",
      opponent: "",
      date: "",
      time: "",
      location: "",
      status: "scheduled",
      clubTeam: ""
    });
  };

  const openCreateDialog = (preselectedTeam?: string) => {
    setMatchFormMatch(null);
    setMatchForm({
      team: preselectedTeam || "",
      opponent: "",
      date: "",
      time: "",
      location: "",
      status: "scheduled",
      clubTeam: preselectedTeam || ""
    });
    setMatchDialogOpen(true);
  };

  const openEditDialog = (match: Match) => {
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (match.source === "ics" && !canEditImported) {
      toast({
        title: "Bearbeitung nicht möglich",
        description: "Importierte Spiele können nur über den ICS-Import angepasst werden.",
        variant: "destructive"
      });
      return;
    }

    setMatchFormMatch(match);
    setMatchForm({
      team: match.home_team ?? match.team,
      opponent: match.away_team ?? match.opponent,
      date: match.date ? match.date.split("T")[0] : "",
      time: match.time || "",
      location: match.location || "",
      status: match.status || "scheduled",
      clubTeam: match.club_team ?? match.team
    });
    setMatchDialogOpen(true);
  };

  const openResultDialog = (match: Match) => {
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (match.source === "ics" && !canEditImported) {
      toast({
        title: "Bearbeitung nicht möglich",
        description: "Importierte Spiele können nur über den ICS-Import angepasst werden.",
        variant: "destructive"
      });
      return;
    }

    setResultMatch(match);
    setResultForm({
      home: match.home_score !== null && match.home_score !== undefined ? String(match.home_score) : "",
      away: match.away_score !== null && match.away_score !== undefined ? String(match.away_score) : ""
    });
    setResultDialogOpen(true);
  };

  const canEdit = useMemo(() => {
    if (!userRole) return false;
    if (userRole === "admin" || userRole === "moderator" || userRole === "vorstand" || userRole === "mannschaftsfuehrer") return true;
    return false;
  }, [userRole]);

  const canEditPins = useMemo(() => {
    return userRole === "admin" || userRole === "vorstand";
  }, [userRole]);

  const handleStartEditPin = (matchId: string) => {
    const pins = matchPins[matchId] || { spielpin: "", spielpartie_pin: "" };
    setEditPinForm({
      spielpin: pins.spielpin || "",
      spielpartie_pin: pins.spielpartie_pin || ""
    });
    setEditingPinMatchId(matchId);
  };

  const handleCancelEditPin = () => {
    setEditingPinMatchId(null);
    setEditPinForm({ spielpin: "", spielpartie_pin: "" });
  };

  const handleSavePin = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("match_pins")
        .upsert({
          match_id: matchId,
          spielpin: editPinForm.spielpin,
          spielpartie_pin: editPinForm.spielpartie_pin || null
        }, {
          onConflict: "match_id"
        });

      if (error) throw error;

      setMatchPins(prev => ({
        ...prev,
        [matchId]: {
          spielpin: editPinForm.spielpin,
          spielpartie_pin: editPinForm.spielpartie_pin || null
        }
      }));

      toast({
        title: "Gespeichert",
        description: "Die Pins wurden erfolgreich aktualisiert."
      });

      setEditingPinMatchId(null);
      setEditPinForm({ spielpin: "", spielpartie_pin: "" });
    } catch (error) {
      console.error("Error saving pins:", error);
      toast({
        title: "Fehler",
        description: "Die Pins konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const allMatches = useMemo(
    () => [...matches, ...importedMatches],
    [matches, importedMatches]
  );

  const sortedAllMatches = useMemo(
    () =>
      [...allMatches].sort(
        (a, b) => matchSortValue(a.date) - matchSortValue(b.date)
      ),
    [allMatches]
  );

  const matchesByTeam = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    sortedAllMatches.forEach((match) => {
      const teamLabel = getClubTeamName(match);
      if (!grouped[teamLabel]) {
        grouped[teamLabel] = [];
      }
      grouped[teamLabel].push(match);
    });

    return grouped;
  }, [sortedAllMatches]);

  const teams = useMemo(() => {
    // Sort by category (erwachsene first, then jugend) and then alphabetically within each category
    return dbTeams
      .sort((a, b) => {
        // Sort by category first
        if (a.category !== b.category) {
          return a.category === "erwachsene" ? -1 : 1;
        }
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name, "de-DE");
      })
      .map(t => t.name);
  }, [dbTeams]);

  // Get next matchday (upcoming matches)
  const nextMatchdayMatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all upcoming matches
    const upcomingMatches = sortedAllMatches.filter((match) => {
      const matchDate = parseMatchDate(match.date);
      if (!matchDate) return false;
      const normalized = new Date(matchDate);
      normalized.setHours(0, 0, 0, 0);
      return normalized >= today;
    });

    if (upcomingMatches.length === 0) return [];

    // Find the date of the next matchday
    const nextMatchdayDate = upcomingMatches[0].date;
    const nextDate = parseMatchDate(nextMatchdayDate);
    if (!nextDate) return [];

    // Get all matches on that date
    return upcomingMatches.filter((match) => {
      const matchDate = parseMatchDate(match.date);
      if (!matchDate) return false;
      return datesAreOnSameDay(matchDate, nextDate);
    });
  }, [sortedAllMatches]);

  const currentMatchdayDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = sortedAllMatches.find((match) => {
      const matchDate = parseMatchDate(match.date);
      if (!matchDate) return false;
      const normalized = new Date(matchDate);
      normalized.setHours(0, 0, 0, 0);
      return normalized >= today;
    });

    if (upcoming) {
      return upcoming.date;
    }

    const last = [...sortedAllMatches]
      .reverse()
      .find((match) => parseMatchDate(match.date));

    return last ? last.date : null;
  }, [sortedAllMatches]);

  const overviewMatches = useMemo(() => {
    if (!currentMatchdayDate) return [];
    const reference = parseMatchDate(currentMatchdayDate);
    if (!reference) return [];

    return sortedAllMatches.filter((match) => {
      const matchDate = parseMatchDate(match.date);
      if (!matchDate) return false;
      return datesAreOnSameDay(matchDate, reference);
    });
  }, [sortedAllMatches, currentMatchdayDate]);

  const formattedMatchdayDate = useMemo(() => {
    if (!currentMatchdayDate) return "";
    const date = parseMatchDate(currentMatchdayDate);
    return date ? date.toLocaleDateString("de-DE") : "";
  }, [currentMatchdayDate]);

  const generateTeamPinsPDF = (teamName: string) => {
    const teamMatches = matchesByTeam[teamName] || [];
    const matchesWithPins = teamMatches
      .map(match => {
        if (!match.id) return null;
        const pins = matchPins[match.id];
        if (!pins) return null;
        return { match, pins };
      })
      .filter((item): item is { match: Match; pins: { spielpin: string; spielpartie_pin: string | null } } => item !== null);

    if (matchesWithPins.length === 0) {
      toast({
        title: "Keine Daten",
        description: "Keine Pins für diese Mannschaft gefunden.",
        variant: "destructive"
      });
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Pins und Spielcodes - ${teamName}`, 14, 20);
    
    const tableData = matchesWithPins.map(({ match, pins }) => [
      parseMatchDate(match.date)?.toLocaleDateString("de-DE") || match.date,
      match.time || "-",
      match.opponent || "-",
      match.location || "-",
      pins.spielpin || "-",
      pins.spielpartie_pin || "-"
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [["Datum", "Zeit", "Gegner", "Ort", "Spielpin", "Spielpartie Pin"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [220, 38, 38] }
    });

    doc.save(`pins-${teamName.replace(/\s+/g, "-")}.pdf`);
    toast({
      title: "PDF erstellt",
      description: "Die Pins wurden erfolgreich als PDF gespeichert."
    });
  };

  const generateAllPinsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Alle Pins und Spielcodes", 14, 20);
    
    let yPosition = 35;
    let hasData = false;
    
    teams.forEach((team, index) => {
      const teamMatches = matchesByTeam[team] || [];
      const matchesWithPins = teamMatches
        .map(match => {
          if (!match.id) return null;
          const pins = matchPins[match.id];
          if (!pins) return null;
          return { match, pins };
        })
        .filter((item): item is { match: Match; pins: { spielpin: string; spielpartie_pin: string | null } } => item !== null);

      if (matchesWithPins.length === 0) return;
      hasData = true;

      if (index > 0 && yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text(team, 14, yPosition);
      yPosition += 5;

      const tableData = matchesWithPins.map(({ match, pins }) => [
        parseMatchDate(match.date)?.toLocaleDateString("de-DE") || match.date,
        match.time || "-",
        match.opponent || "-",
        pins.spielpin || "-",
        pins.spielpartie_pin || "-"
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Datum", "Zeit", "Gegner", "Spielpin", "Spielpartie Pin"]],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 38, 38] },
        margin: { left: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    });

    if (!hasData) {
      toast({
        title: "Keine Daten",
        description: "Keine Pins gefunden.",
        variant: "destructive"
      });
      return;
    }

    doc.save("alle-pins-spielcodes.pdf");
    toast({
      title: "PDF erstellt",
      description: "Alle Pins wurden erfolgreich als PDF gespeichert."
    });
  };

  const handleToggleHomeRight = useCallback(
    async (match: Match, shouldBeHome: boolean) => {
      const clubTeam = getTeamLabel(match.club_team ?? match.team);
      const currentHomeTeamRaw = match.home_team ?? match.team;
      const currentAwayTeamRaw = match.away_team ?? match.opponent;
      const currentHomeTeam = getTeamLabel(currentHomeTeamRaw);
      const currentAwayTeam = getTeamLabel(currentAwayTeamRaw);
      const isCurrentlyHome = currentHomeTeam === clubTeam;

      if (!currentHomeTeamRaw || !currentAwayTeamRaw) {
        toast({
          title: "Heimrecht nicht verfügbar",
          description: "Für dieses Spiel fehlen die Teamzuordnungen.",
          variant: "destructive"
        });
        return;
      }

      if (isCurrentlyHome === shouldBeHome) {
        return;
      }

      const newHomeTeamRaw = currentAwayTeamRaw;
      const newAwayTeamRaw = currentHomeTeamRaw;
      const matchIdentifier = match.id || match.icsUid || `${match.date}-${currentHomeTeamRaw}-${currentAwayTeamRaw}`;

      setHomeRightLoading((prev) => ({ ...prev, [matchIdentifier]: true }));

      try {
        if (match.source === "ics") {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (!stored) {
            throw new Error("Keine importierten Spiele gefunden.");
          }

          let parsed: Match[];
          try {
            parsed = JSON.parse(stored) as Match[];
          } catch (error) {
            console.error("Fehler beim Parsen der gespeicherten Spiele:", error);
            return;
          }
          const updated = parsed.map((item) => {
            const matchesSameGame =
              (match.icsUid && item.icsUid === match.icsUid) ||
              (!match.icsUid && item.date === match.date && getTeamLabel(item.team) === currentHomeTeam && getTeamLabel(item.opponent) === currentAwayTeam);

            if (!matchesSameGame) {
              return item;
            }

            return {
              ...item,
              team: newHomeTeamRaw,
              opponent: newAwayTeamRaw,
              home_team: newHomeTeamRaw,
              away_team: newAwayTeamRaw,
              club_team: match.club_team ?? match.team
            };
          });

          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          loadImportedMatches();
        } else {
          if (!match.id) {
            throw new Error("Spiel-ID fehlt.");
          }

          const { error } = await supabase
            .from("matches")
            .update({
              team: newHomeTeamRaw,
              opponent: newAwayTeamRaw,
              home_team: newHomeTeamRaw,
              away_team: newAwayTeamRaw,
              club_team: match.club_team ?? match.team
            } as Partial<Match>)
            .eq("id", match.id);

          if (error) {
            throw error;
          }

          fetchMatches();
        }

        toast({
          title: "Heimrecht angepasst",
          description: clubTeam === getTeamLabel(newHomeTeamRaw)
            ? "Die Begegnung ist nun ein Heimspiel."
            : "Die Begegnung ist nun ein Auswärtsspiel."
        });
      } catch (error) {
        console.error("Error toggling home right:", error);
        toast({
          title: "Fehler",
          description: "Das Heimrecht konnte nicht aktualisiert werden.",
          variant: "destructive"
        });
      } finally {
        setHomeRightLoading((prev) => {
          const updated = { ...prev };
          delete updated[matchIdentifier];
          return updated;
        });
      }
    },
    [fetchMatches, loadImportedMatches, toast]
  );

  const renderMatchCard = (match: Match) => {
    const isImported = match.source === "ics";
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    const matchDate = parseMatchDate(match.date);
    const formattedDate = matchDate
      ? matchDate.toLocaleDateString("de-DE")
      : match.date;
    const formattedTime = match.time
      ? match.time
      : matchDate
        ? matchDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
    const statusKey = match.status || "scheduled";
    const homeTeamLabel = getHomeTeamName(match);
    const awayTeamLabel = getAwayTeamName(match);
    const opponentLabel = awayTeamLabel;
    const matchKey = `${match.source || "supabase"}-${
      match.id ||
      match.icsUid ||
      [homeTeamLabel, opponentLabel, match.date].filter(Boolean).join("-")
    }`;
    const matchIdentifier = match.id || match.icsUid || matchKey;
    const clubTeamLabel = getClubTeamName(match);
    const isClubTeamHome = clubTeamLabel === homeTeamLabel;
    const canToggleHomeRight = canEdit && (!isImported || canEditImported);
    const isToggleDisabled = !canToggleHomeRight || !!homeRightLoading[matchIdentifier];

    return (
      <div
        key={matchKey}
        className="flex flex-col gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {formattedDate}
              {formattedTime ? ` um ${formattedTime}` : ""}
            </span>
            <Badge
              variant={
                statusKey === "completed"
                  ? "default"
                  : statusKey === "canceled"
                    ? "destructive"
                    : "outline"
              }
            >
              {STATUS_LABELS[statusKey] || statusKey}
            </Badge>
            {isImported && <Badge variant="secondary">ICS-Import</Badge>}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">
              {homeTeamLabel} vs {opponentLabel}
            </div>
            {canToggleHomeRight && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`home-right-${matchIdentifier}`} className="text-sm font-medium text-muted-foreground">
                  Heimrecht:
                </Label>
                <Switch
                  id={`home-right-${matchIdentifier}`}
                  checked={isClubTeamHome}
                  disabled={isToggleDisabled}
                  onCheckedChange={(checked) => handleToggleHomeRight(match, checked)}
                  className="data-[state=checked]:bg-orange-500"
                />
                <span className="text-xs text-muted-foreground">
                  {homeRightLoading[matchIdentifier]
                    ? "Tauscht..."
                    : isClubTeamHome
                      ? "Heim"
                      : "Auswärts"}
                </span>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {match.location || "Ort noch nicht festgelegt"}
          </div>

          {match.id && (
            <div className="flex flex-wrap items-center gap-4 text-sm pt-2 mt-2 border-t border-border/40">
              {editingPinMatchId === match.id ? (
                <>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Spiel-Pin:</span>
                    <Input
                      value={editPinForm.spielpin}
                      onChange={(e) => setEditPinForm(prev => ({ ...prev, spielpin: e.target.value }))}
                      className="h-8 w-32 font-mono"
                      placeholder="Pin"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Spiel-Code:</span>
                    <Input
                      value={editPinForm.spielpartie_pin}
                      onChange={(e) => setEditPinForm(prev => ({ ...prev, spielpartie_pin: e.target.value }))}
                      className="h-8 w-32 font-mono"
                      placeholder="Code"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSavePin(match.id)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Speichern
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditPin}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Abbrechen
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">Spiel-Pin:</span>
                    <code className="px-2 py-1 bg-muted rounded font-mono">
                      {matchPins[match.id]?.spielpin || "—"}
                    </code>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">Spiel-Code:</span>
                    <code className="px-2 py-1 bg-muted rounded font-mono">
                      {matchPins[match.id]?.spielpartie_pin || "—"}
                    </code>
                  </div>
                  {canEditPins && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEditPin(match.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Ändern
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          
          {match.description && (
            <div className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {match.description}
            </div>
          )}
          {match.home_score !== null && match.away_score !== null && (
            <div className="mt-2 text-lg font-bold">
              Ergebnis: {match.home_score}:{match.away_score}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex flex-col gap-2 sm:items-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLineupMatch(match);
                setLineupDialogOpen(true);
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Aufstellung
            </Button>
          </div>
          {canEdit && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => openEditDialog(match)}
                disabled={isImported && !canEditImported}
                className="bg-gradient-primary hover:bg-primary-hover"
              >
                <Edit className="mr-2 h-4 w-4" />
                Ändern
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openResultDialog(match)}
                disabled={isImported && !canEditImported}
              >
                <Trophy className="mr-2 h-4 w-4" />
                {match.home_score !== null ? "Ergebnis ändern" : "Ergebnis"}
              </Button>
              {(userRole === "admin" || userRole === "vorstand") && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteMatch(match)}
                  disabled={isImported && !canEditImported}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-1/4 rounded bg-gray-200 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Spielplanverwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Spielpaarungen für alle Mannschaften.
          </p>
        </div>
      </div>

      {halls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Unsere Hallen
            </CardTitle>
            <CardDescription>
              Alle Spielorte und Adressen im Überblick
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {halls.map((hall) => (
                <div
                  key={hall.id}
                  className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-2"
                >
                  <h3 className="font-semibold text-foreground">
                    {hall.name}
                  </h3>
                  {hall.address && (
                    <p className="text-sm text-muted-foreground">
                      {hall.address}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Spielpläne nach Mannschaften</h2>
          <div className="flex gap-2">
            <Button
              variant={showPinsView ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPinsView(!showPinsView)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {showPinsView ? "Spiele anzeigen" : "Pins & Codes"}
            </Button>
            {showPinsView && (
              <Button
                variant="outline"
                size="sm"
                onClick={generateAllPinsPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Alle Pins (PDF)
              </Button>
            )}
          </div>
        </div>
        
        {teams.length > 0 ? (
          <Tabs defaultValue={teams[0]} className="w-full">
            <TabsList className="flex-wrap h-auto">
              {teams.map((team) => (
                <TabsTrigger key={team} value={team}>
                  {team}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {teams.map((team) => {
              const teamMatches = matchesByTeam[team] || [];
              
              return (
                <TabsContent key={team} value={team} className="space-y-4">
                  {!showPinsView ? (
                    <>
                      {canEdit && (
                        <div className="flex justify-end">
                          <Button onClick={() => openCreateDialog(team)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Neues Spiel für {team}
                          </Button>
                        </div>
                      )}
                      
                      {teamMatches.length > 0 ? (
                        <div className="space-y-3">
                          {teamMatches.map((match) => renderMatchCard(match))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-8">
                            <p className="text-center text-muted-foreground">
                              Keine Spiele für {team} geplant.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Pins und Spielcodes - {team}</CardTitle>
                            <CardDescription>Übersicht aller Pins für diese Mannschaft</CardDescription>
                          </div>
                          <Button onClick={() => generateTeamPinsPDF(team)} size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            PDF Download
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {teamMatches.length > 0 ? (
                          <div className="space-y-3">
                            {teamMatches
                              .filter(match => match.id && matchPins[match.id])
                              .map((match) => {
                                const pins = matchPins[match.id!];
                                
                                return (
                                  <Card key={match.id} className="bg-muted/50">
                                    <CardContent className="pt-4">
                                      <div className="grid gap-2">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-medium">{match.opponent}</div>
                                            <div className="text-sm text-muted-foreground">
                                              {parseMatchDate(match.date)?.toLocaleDateString("de-DE") || match.date} • {match.time}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{match.location}</div>
                                          </div>
                                          <div className="text-right space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-muted-foreground">Spielpin:</span>
                                              <Badge variant="secondary">{pins.spielpin}</Badge>
                                            </div>
                                            {pins.spielpartie_pin && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">Spielpartie Pin:</span>
                                                <Badge variant="outline">{pins.spielpartie_pin}</Badge>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            {teamMatches.every(match => !match.id || !matchPins[match.id]) && (
                              <p className="text-center text-muted-foreground py-8">
                                Keine Pins für {team} hinterlegt
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground">
                            Keine Spiele für {team} gefunden
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Es wurden noch keine Mannschaften angelegt. Erstellen Sie Mannschaften in der Mannschaftsverwaltung.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {nextMatchdayMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Nächster Spieltag
            </CardTitle>
            <CardDescription>
              {parseMatchDate(nextMatchdayMatches[0].date)?.toLocaleDateString("de-DE", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nextMatchdayMatches.map((match) => {
                const homeTeam = getHomeTeamName(match);
                const awayTeam = getAwayTeamName(match);
                const matchKey = `next-${match.source || "supabase"}-${
                  match.id || match.icsUid || [homeTeam, awayTeam, match.date].filter(Boolean).join("-")
                }`;

                return (
                  <div
                    key={matchKey}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/10"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        {match.time && (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span>{match.time} Uhr</span>
                          </>
                        )}
                        {match.source === "ics" && (
                          <Badge variant="secondary" className="text-xs">ICS</Badge>
                        )}
                      </div>
                      <div className="font-medium">
                        {homeTeam} vs {awayTeam}
                      </div>
                      {match.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{match.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      <Badge variant="outline">
                        {getClubTeamName(match)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={resultDialogOpen}
        onOpenChange={(open) => {
          setResultDialogOpen(open);
          if (!open) {
            setResultMatch(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ergebnis eintragen</DialogTitle>
            <DialogDescription>
              {resultMatch ? `${getHomeTeamName(resultMatch)} vs ${getAwayTeamName(resultMatch)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="homeScore">{resultMatch ? getHomeTeamName(resultMatch) : "Heimmannschaft"}</Label>
              <Input
                id="homeScore"
                type="number"
                min="0"
                value={resultForm.home}
                onChange={(event) => setResultForm((prev) => ({ ...prev, home: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="awayScore">{resultMatch ? getAwayTeamName(resultMatch) : "Gastmannschaft"}</Label>
              <Input
                id="awayScore"
                type="number"
                min="0"
                value={resultForm.away}
                onChange={(event) => setResultForm((prev) => ({ ...prev, away: event.target.value }))}
              />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={handleSaveResult}>
            Speichern
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={matchDialogOpen}
        onOpenChange={(open) => {
          setMatchDialogOpen(open);
          if (!open) {
            resetMatchForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{matchFormMatch ? "Spiel bearbeiten" : "Neues Spiel"}</DialogTitle>
            <DialogDescription>Erfassen oder ändern Sie die Details eines Spiels.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="team">Heimmannschaft</Label>
                <Input
                  id="team"
                  value={matchForm.team}
                  onChange={(event) =>
                    setMatchForm((prev) => {
                      const value = event.target.value;
                      const shouldUpdateClubTeam = !prev.clubTeam || prev.clubTeam === prev.team;
                      return {
                        ...prev,
                        team: value,
                        clubTeam: shouldUpdateClubTeam ? value : prev.clubTeam,
                      };
                    })
                  }
                  placeholder="z. B. Herren I"
                />
              </div>
              <div>
                <Label htmlFor="opponent">Gastmannschaft</Label>
                <Input
                  id="opponent"
                  value={matchForm.opponent}
                  onChange={(event) =>
                    setMatchForm((prev) => {
                      const value = event.target.value;
                      const shouldUpdateClubTeam = !prev.clubTeam || prev.clubTeam === prev.opponent;
                      return {
                        ...prev,
                        opponent: value,
                        clubTeam: shouldUpdateClubTeam ? value : prev.clubTeam,
                      };
                    })
                  }
                  placeholder="z. B. TTC Musterstadt"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={matchForm.date}
                  onChange={(event) => setMatchForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="time">Uhrzeit</Label>
                <Input
                  id="time"
                  type="time"
                  value={matchForm.time}
                  onChange={(event) => setMatchForm((prev) => ({ ...prev, time: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Spielort</Label>
              <Input
                id="location"
                value={matchForm.location}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="z. B. Sporthalle Musterstadt"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={matchForm.status} onValueChange={(value) => setMatchForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Geplant</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="canceled">Abgesagt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveMatch}>
              {matchFormMatch ? "Änderungen speichern" : "Spiel erstellen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pinsDialogOpen} onOpenChange={setPinsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPinType === "spielpin" ? "Spielpin" : "Spielcode"}
            </DialogTitle>
            <DialogDescription>
              {selectedPinTeam && `PIN für ${selectedPinTeam}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-center text-2xl font-bold font-mono">
                {selectedPinTeam && teamPins[selectedPinTeam] && selectedPinType
                  ? teamPins[selectedPinTeam][selectedPinType]
                  : ""}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (selectedPinTeam && teamPins[selectedPinTeam] && selectedPinType) {
                  const pin = teamPins[selectedPinTeam][selectedPinType];
                  if (pin) {
                    navigator.clipboard.writeText(pin);
                    toast({
                      title: "Kopiert",
                      description: "Der Pin wurde in die Zwischenablage kopiert."
                    });
                  }
                }
              }}
            >
              Kopieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {lineupMatch && (
        <MatchLineup
          match={lineupMatch}
          open={lineupDialogOpen}
          onOpenChange={setLineupDialogOpen}
        />
      )}
    </div>
  );
};
