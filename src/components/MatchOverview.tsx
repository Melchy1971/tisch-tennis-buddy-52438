import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Trophy, Edit, Trash2, ArrowLeft, User, Lock, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import type { Match } from "@/types/match";

interface MatchPin {
  id: string;
  match_id: string;
  spielpin: string;
  spielpartie_pin: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Geplant",
  completed: "Abgeschlossen",
  canceled: "Abgesagt"
};

const getTeamLabel = (team?: string | null) => {
  if (!team) return "Unbekannte Mannschaft";
  const trimmed = team.trim();
  return trimmed.length > 0 ? trimmed : "Unbekannte Mannschaft";
};

export const MatchOverview = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPins, setMatchPins] = useState<Record<string, MatchPin>>({});
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
  });
  const [resultForm, setResultForm] = useState({ home: "", away: "" });
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRole();
    loadMatches();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (data && data.length > 0) {
        const hasEditRole = data.some(r => 
          r.role === 'admin' || r.role === 'vorstand' || r.role === 'mannschaftsfuehrer'
        );
        
        if (hasEditRole) {
          const editRole = data.find(r => 
            r.role === 'admin' || r.role === 'vorstand' || r.role === 'mannschaftsfuehrer'
          );
          setUserRole(editRole?.role || null);
        } else {
          setUserRole(data[0].role);
        }
      }
    }
  };

  const loadMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      setMatches(data || []);

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
          const pinsMap: Record<string, MatchPin> = {};
          pinsData.forEach((pin) => {
            pinsMap[pin.match_id] = pin;
          });
          setMatchPins(pinsMap);
        }
      }
    } catch (error) {
      console.error("Error loading matches:", error);
      toast({
        title: "Fehler",
        description: "Spiele konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const canEdit = useMemo(() => {
    if (!userRole) return false;
    return userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
  }, [userRole]);

  const openEditDialog = (match: Match) => {
    setMatchFormMatch(match);
    setMatchForm({
      team: match.home_team ?? match.team,
      opponent: match.away_team ?? match.opponent,
      date: match.date ? match.date.split("T")[0] : "",
      time: match.time || "",
      location: match.location || "",
      status: match.status || "scheduled",
    });
    setMatchDialogOpen(true);
  };

  const openResultDialog = (match: Match) => {
    setResultMatch(match);
    setResultForm({
      home: match.home_score !== null && match.home_score !== undefined ? String(match.home_score) : "",
      away: match.away_score !== null && match.away_score !== undefined ? String(match.away_score) : ""
    });
    setResultDialogOpen(true);
  };

  const handleSaveMatch = async () => {
    if (!matchForm.team || !matchForm.opponent || !matchForm.date || !matchForm.time || !matchForm.location) {
      toast({
        title: "Pflichtfelder fehlen",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive"
      });
      return;
    }

    try {
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
        } as Partial<Match>)
        .eq("id", matchFormMatch?.id);

      if (error) throw error;

      toast({
        title: "Spiel aktualisiert",
        description: "Die Spielplandaten wurden erfolgreich aktualisiert."
      });

      loadMatches();
      setMatchDialogOpen(false);
      setMatchFormMatch(null);
    } catch (error) {
      console.error("Error saving match:", error);
      toast({
        title: "Fehler",
        description: "Der Spielplan konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveResult = async () => {
    if (!resultMatch) return;

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
      const { error } = await supabase
        .from("matches")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "completed"
        } as Partial<Match>)
        .eq("id", resultMatch.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Ergebnis wurde gespeichert."
      });

      loadMatches();
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

  const handleDeleteMatch = async (match: Match) => {
    const confirmDelete = window.confirm(
      `Soll das Spiel ${getTeamLabel(match.home_team ?? match.team)} vs ${getTeamLabel(match.away_team ?? match.opponent)} wirklich gelöscht werden?`
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", match.id);

      if (error) throw error;

      toast({
        title: "Spiel gelöscht",
        description: "Das Spiel wurde aus dem Spielplan entfernt."
      });

      loadMatches();
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Fehler",
        description: "Das Spiel konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  // Group matches by team
  const matchesByTeam = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    
    matches.forEach((match) => {
      const teamName = getTeamLabel(match.club_team ?? match.team);
      if (!grouped[teamName]) {
        grouped[teamName] = [];
      }
      grouped[teamName].push(match);
    });

    return grouped;
  }, [matches]);

  const teams = useMemo(() => Object.keys(matchesByTeam).sort(), [matchesByTeam]);

  // Filter by selected team from URL parameter
  const selectedTeam = searchParams.get("team");
  const filteredTeams = useMemo(() => {
    if (selectedTeam) {
      return teams.filter(team => team === selectedTeam);
    }
    return teams;
  }, [teams, selectedTeam]);

  const clearTeamFilter = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          {selectedTeam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTeamFilter}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Alle Teams
            </Button>
          )}
        </div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-8 h-8 text-primary" />
          {selectedTeam ? selectedTeam : "Spielübersicht"}
        </h1>
        <p className="text-muted-foreground">
          {selectedTeam 
            ? `Alle Spiele von ${selectedTeam} im Überblick.`
            : "Alle aktuellen Spiele aller Mannschaften im Überblick."}
        </p>
      </div>

      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Noch keine Spiele angelegt.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredTeams.map((team) => {
            const teamMatches = matchesByTeam[team] || [];
            
            return (
              <Card key={team}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    {team}
                  </CardTitle>
                  <CardDescription>
                    {teamMatches.length} {teamMatches.length === 1 ? 'Spiel' : 'Spiele'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamMatches.map((match) => {
                      const matchDate = match.date ? new Date(match.date) : null;
                      const homeTeam = getTeamLabel(match.home_team ?? match.team);
                      const awayTeam = getTeamLabel(match.away_team ?? match.opponent);

                      return (
                        <Card key={match.id} className="border border-border/60">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {matchDate
                                      ? matchDate.toLocaleDateString("de-DE", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                        })
                                      : "Kein Datum"}
                                  </span>
                                  {match.time && <span>• {match.time} Uhr</span>}
                                </div>
                                <Badge variant={match.status === "completed" ? "default" : "secondary"}>
                                  {STATUS_LABELS[match.status] || match.status}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 text-right">
                                  <p className="font-medium">{homeTeam}</p>
                                </div>
                                <div className="flex items-center gap-2 px-4">
                                  {match.status === "completed" &&
                                  match.home_score !== null &&
                                  match.away_score !== null ? (
                                    <div className="text-lg font-bold">
                                      {match.home_score} : {match.away_score}
                                    </div>
                                  ) : (
                                    <div className="text-lg font-bold text-muted-foreground">vs</div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{awayTeam}</p>
                                </div>
                              </div>

                              {match.location && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>{match.location}</span>
                                </div>
                              )}

                              {matchPins[match.id] && (
                                <div className="flex flex-wrap items-center gap-4 text-sm pt-2 border-t border-border/40">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Lock className="h-4 w-4" />
                                    <span className="font-medium">Spiel-Pin:</span>
                                    <code className="px-2 py-1 bg-muted rounded font-mono">
                                      {matchPins[match.id].spielpin}
                                    </code>
                                  </div>
                                  {matchPins[match.id].spielpartie_pin && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Key className="h-4 w-4" />
                                      <span className="font-medium">Spiel-Code:</span>
                                      <code className="px-2 py-1 bg-muted rounded font-mono">
                                        {matchPins[match.id].spielpartie_pin}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              )}

                              {canEdit && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => navigate(`/team-availability?team=${encodeURIComponent(team)}`)}
                                  >
                                    <User className="mr-2 h-3 w-3" />
                                    Ersatz
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(match)}
                                  >
                                    <Edit className="mr-2 h-3 w-3" />
                                    Ändern
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openResultDialog(match)}
                                  >
                                    <Trophy className="mr-2 h-3 w-3" />
                                    {match.home_score !== null ? "Ergebnis ändern" : "Ergebnis"}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteMatch(match)}
                                  >
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Löschen
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ergebnis eintragen</DialogTitle>
            <DialogDescription>
              {resultMatch ? `${getTeamLabel(resultMatch.home_team ?? resultMatch.team)} vs ${getTeamLabel(resultMatch.away_team ?? resultMatch.opponent)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="homeScore">{resultMatch ? getTeamLabel(resultMatch.home_team ?? resultMatch.team) : "Heimmannschaft"}</Label>
              <Input
                id="homeScore"
                type="number"
                min="0"
                value={resultForm.home}
                onChange={(e) => setResultForm((prev) => ({ ...prev, home: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="awayScore">{resultMatch ? getTeamLabel(resultMatch.away_team ?? resultMatch.opponent) : "Gastmannschaft"}</Label>
              <Input
                id="awayScore"
                type="number"
                min="0"
                value={resultForm.away}
                onChange={(e) => setResultForm((prev) => ({ ...prev, away: e.target.value }))}
              />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={handleSaveResult}>
            Speichern
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Spiel bearbeiten</DialogTitle>
            <DialogDescription>Ändern Sie die Details des Spiels.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="team">Heimmannschaft</Label>
                <Input
                  id="team"
                  value={matchForm.team}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, team: e.target.value }))}
                  placeholder="z. B. Herren I"
                />
              </div>
              <div>
                <Label htmlFor="opponent">Gastmannschaft</Label>
                <Input
                  id="opponent"
                  value={matchForm.opponent}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, opponent: e.target.value }))}
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
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="time">Uhrzeit</Label>
                <Input
                  id="time"
                  type="time"
                  value={matchForm.time}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Spielort</Label>
              <Input
                id="location"
                value={matchForm.location}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, location: e.target.value }))}
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
              Änderungen speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
