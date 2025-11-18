import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, UserX, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface TeamMember {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface Match {
  id: string;
  opponent: string;
  date: string;
  time: string;
}

interface SubstituteRequest {
  id?: string;
  player_id: string;
  needs_substitute: boolean;
  notes: string;
  valid_until: string;
  match_id: string;
}

export const TeamAvailabilityManager = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const teamName = searchParams.get("team");
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [substituteRequests, setSubstituteRequests] = useState<Record<string, SubstituteRequest>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (teamName) {
      loadData();
      loadUserRoles();
    }
  }, [teamName]);

  const loadUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      setUserRoles(data?.map(r => r.role) || []);
    } catch (error) {
      console.error("Error loading user roles:", error);
    }
  };

  const canEdit = () => {
    // Admin and vorstand can always edit
    if (userRoles.includes("admin") || userRoles.includes("vorstand")) {
      return true;
    }
    
    // Mannschaftsführer can only edit if valid_until is in the future
    if (userRoles.includes("mannschaftsfuehrer")) {
      if (!validUntil) return true; // No date set, allow editing
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(validUntil);
      deadline.setHours(0, 0, 0, 0);
      return deadline >= today;
    }
    
    return false;
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Load upcoming matches for this team
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("id, opponent, date, time, team")
        .eq("team", teamName)
        .gte("date", new Date().toISOString().split('T')[0])
        .order("date", { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      // Load team members
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id,
          team_members!inner (
            member_id
          )
        `)
        .eq("name", teamName);

      if (teamsError) throw teamsError;

      if (teamsData && teamsData.length > 0) {
        const memberIds = teamsData.flatMap(t => 
          (t.team_members as any[]).map(tm => tm.member_id)
        );

        if (memberIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", memberIds)
            .order("last_name", { ascending: true });

          if (profilesError) throw profilesError;
          setTeamMembers((profilesData || []).map(p => ({ ...p, user_id: p.id })));

          // Load existing substitute requests
          const { data: requestsData, error: requestsError } = await supabase
            .from("team_substitute_requests")
            .select("id, player_id, needs_substitute, notes, valid_until, match_id")
            .eq("team_name", teamName);

          if (requestsError) throw requestsError;

          const requestsMap: Record<string, SubstituteRequest> = {};
          let commonValidUntil = "";
          let commonMatchId = "";
          (requestsData || []).forEach(req => {
            requestsMap[req.player_id] = {
              id: req.id,
              player_id: req.player_id,
              needs_substitute: req.needs_substitute,
              notes: req.notes || "",
              valid_until: req.valid_until || "",
              match_id: req.match_id || ""
            };
            if (req.valid_until && !commonValidUntil) {
              commonValidUntil = req.valid_until;
            }
            if (req.match_id && !commonMatchId) {
              commonMatchId = req.match_id;
            }
          });
          setSubstituteRequests(requestsMap);
          setValidUntil(commonValidUntil);
          setSelectedMatchId(commonMatchId);
        } else {
          console.log("No member IDs found for team:", teamName);
          setTeamMembers([]);
        }
      } else {
        console.log("No team found with name:", teamName);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubstitute = (playerId: string, checked: boolean) => {
    setSubstituteRequests(prev => ({
      ...prev,
      [playerId]: {
        id: prev[playerId]?.id,
        player_id: playerId,
        needs_substitute: checked,
        notes: prev[playerId]?.notes || "",
        valid_until: prev[playerId]?.valid_until || validUntil || "",
        match_id: prev[playerId]?.match_id || selectedMatchId || ""
      }
    }));
  };

  const handleNotesChange = (playerId: string, notes: string) => {
    setSubstituteRequests(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        player_id: playerId,
        needs_substitute: prev[playerId]?.needs_substitute || false,
        notes,
        valid_until: prev[playerId]?.valid_until || validUntil || "",
        match_id: prev[playerId]?.match_id || selectedMatchId || ""
      }
    }));
  };

  const handleSave = async () => {
    if (!canEdit()) {
      toast({
        title: "Keine Berechtigung",
        description: "Der Spieltag ist vorbei. Nur Admins und Vorstand können noch Änderungen vornehmen.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedMatchId) {
      toast({
        title: "Kein Spiel ausgewählt",
        description: "Bitte wählen Sie ein Spiel aus, für das Ersatz benötigt wird.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      // Get the selected match to extract date for valid_until
      const selectedMatch = matches.find(m => m.id === selectedMatchId);
      if (!selectedMatch) {
        throw new Error("Ausgewähltes Spiel nicht gefunden");
      }
      const matchDate = selectedMatch.date;

      // Process each player
      for (const [playerId, request] of Object.entries(substituteRequests)) {
        if (request.needs_substitute) {
          // Upsert substitute request
          const { error } = await supabase
            .from("team_substitute_requests")
            .upsert({
              id: request.id,
              team_name: teamName,
              player_id: playerId,
              needs_substitute: true,
              notes: request.notes || null,
              valid_until: matchDate,
              match_id: selectedMatchId,
              marked_by: user.id
            });

          if (error) throw error;
        } else if (request.id) {
          // Delete if unchecked and exists
          const { error } = await supabase
            .from("team_substitute_requests")
            .delete()
            .eq("id", request.id);

          if (error) throw error;
        }
      }

      // Reload data to reflect changes
      await loadData();

      toast({
        title: "Gespeichert",
        description: "Ersatzanfragen wurden erfolgreich gespeichert."
      });
    } catch (error) {
      console.error("Error saving substitute requests:", error);
      toast({
        title: "Fehler",
        description: "Ersatzanfragen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/?team=${encodeURIComponent(teamName || "")}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Spielübersicht
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <User className="w-8 h-8 text-primary" />
            Ersatzverwaltung: {teamName}
          </h1>
          <p className="text-muted-foreground">
            Markieren Sie Spieler, die Ersatz benötigen
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="space-y-2">
            <Label htmlFor="match-select" className="text-sm">
              Spiel auswählen
            </Label>
            <Select
              value={selectedMatchId}
              onValueChange={setSelectedMatchId}
              disabled={!canEdit()}
            >
              <SelectTrigger id="match-select" className="w-64">
                <SelectValue placeholder="Spiel auswählen" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    {match.opponent} - {new Date(match.date).toLocaleDateString("de-DE")} {match.time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving || !canEdit()} size="lg">
            {saving ? "Speichert..." : "Änderungen speichern"}
          </Button>
        </div>
      </div>

      {!canEdit() && (
        <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Hinweis:</strong> Der Spieltag ist vorbei. Als Mannschaftsführer können Sie keine Änderungen mehr vornehmen. Admins und Vorstand können weiterhin bearbeiten.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
      {/* Player list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Mannschaftsspieler
            </CardTitle>
            <CardDescription>
              {teamMembers.length > 0 
                ? `${teamMembers.length} Spieler in ${teamName}`
                : "Spieler als ersatzbedürftig markieren"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground mb-2">
                  Keine Spieler in dieser Mannschaft gefunden.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bitte fügen Sie Spieler zur Mannschaft "{teamName}" im Bereich Teams hinzu.
                </p>
              </div>
            ) : (
              teamMembers.map(member => {
              const request = substituteRequests[member.user_id];
              const needsSubstitute = request?.needs_substitute || false;
              
              return (
                <Card key={member.user_id} className="border border-border/60">
                  <CardContent className="p-4">
                     <div className="flex items-start gap-3">
                      <Checkbox
                        id={`player-${member.user_id}`}
                        checked={needsSubstitute}
                        onCheckedChange={(checked) => 
                          handleToggleSubstitute(member.user_id, checked as boolean)
                        }
                        disabled={!canEdit()}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <Label 
                          htmlFor={`player-${member.user_id}`}
                          className="text-base font-medium cursor-pointer"
                        >
                          {member.first_name} {member.last_name}
                        </Label>
                        
                        {needsSubstitute && (
                          <div className="space-y-1">
                            <Label htmlFor={`notes-${member.user_id}`} className="text-xs">
                              Notiz (optional)
                            </Label>
                            <Textarea
                              id={`notes-${member.user_id}`}
                              value={request?.notes || ""}
                              onChange={(e) => handleNotesChange(member.user_id, e.target.value)}
                              placeholder="z.B. Verletzung, Urlaub..."
                              rows={2}
                              disabled={!canEdit()}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  );
                })
            )}
          </CardContent>
        </Card>

        {/* Substitute needed list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserX className="w-5 h-5 text-destructive" />
              Ersatz benötigt
            </CardTitle>
            <CardDescription>
              Übersicht der Spieler, die Ersatz benötigen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.values(substituteRequests).filter(r => r.needs_substitute).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aktuell werden keine Ersatzspieler benötigt
              </p>
            ) : (
              <div className="space-y-3">
                {teamMembers
                  .filter(member => substituteRequests[member.user_id]?.needs_substitute)
                  .map(member => {
                    const request = substituteRequests[member.user_id];
                    return (
                      <Card key={member.user_id} className="border border-destructive/20 bg-destructive/5">
                        <CardContent className="p-4">
                          <div className="font-medium text-destructive mb-1">
                            {member.first_name} {member.last_name}
                          </div>
                          {request.notes && (
                            <p className="text-sm text-muted-foreground">
                              {request.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
