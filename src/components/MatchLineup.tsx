import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Match } from "@/types/match";

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  qttr_value: number | null;
}

interface PlayerAvailability {
  player_id: string;
  status: "available" | "unavailable" | "substitute_needed";
  notes: string | null;
}

interface MatchLineupProps {
  match: Match;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MatchLineup = ({ match, open, onOpenChange }: MatchLineupProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availability, setAvailability] = useState<Record<string, PlayerAvailability>>({});
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTeamMembers();
      loadAvailability();
      getCurrentUser();
    }
  }, [open, match.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profile) {
        setCurrentUserId(profile.user_id);
        console.log("Current user ID set:", profile.user_id);
      } else {
        console.warn("No profile found for user");
      }
    } else {
      console.warn("No authenticated user");
    }
  };

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Get team ID from assigned club team name
      const { data: teamData } = await supabase
        .from("teams")
        .select("id")
        .eq("name", match.club_team ?? match.team)
        .maybeSingle();

      if (!teamData) return;

      // Get team members
      const { data: memberIds } = await supabase
        .from("team_members")
        .select("member_id")
        .eq("team_id", teamData.id);

      if (!memberIds || memberIds.length === 0) return;

      // Get profiles for team members
      const memberIdList = memberIds.map(m => m.member_id);
      if (memberIdList.length === 0) return;

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, qttr_value")
        .in("user_id", memberIdList)
        .order("qttr_value", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setTeamMembers(profiles || []);
    } catch (error) {
      console.error("Error loading team members:", error);
      toast({
        title: "Fehler",
        description: "Mannschaftsmitglieder konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("match_availability")
        .select("player_id, status, notes")
        .eq("match_id", match.id);

      if (error) throw error;

      const availabilityMap: Record<string, PlayerAvailability> = {};
      (data || []).forEach((item) => {
        availabilityMap[item.player_id] = {
          player_id: item.player_id,
          status: item.status as "available" | "unavailable" | "substitute_needed",
          notes: item.notes,
        };
      });

      setAvailability(availabilityMap);
    } catch (error) {
      console.error("Error loading availability:", error);
    }
  };

  const handleStatusChange = async (playerId: string, status: "available" | "unavailable" | "substitute_needed") => {
    try {
      console.log("Status change:", { playerId, status, currentUserId });

      // Update match_availability
      const { error: availabilityError } = await supabase
        .from("match_availability")
        .upsert({
          match_id: match.id,
          player_id: playerId,
          status: status,
          notes: availability[playerId]?.notes || null,
        }, {
          onConflict: "match_id,player_id"
        });

      if (availabilityError) throw availabilityError;

      // Sync with team_substitute_requests
      if (status === "substitute_needed") {
        // Ensure we have currentUserId
        if (!currentUserId) {
          console.error("No current user ID available");
          throw new Error("Benutzer-ID nicht verfügbar");
        }

        // Check if request already exists
        const { data: existingRequest } = await supabase
          .from("team_substitute_requests")
          .select("id")
          .eq("player_id", playerId)
          .eq("team_name", match.club_team ?? match.team)
          .eq("match_id", match.id)
          .maybeSingle();

        console.log("Existing request:", existingRequest);

        if (existingRequest) {
          // Update existing request
          const { error: updateError } = await supabase
            .from("team_substitute_requests")
            .update({
              needs_substitute: true,
              notes: availability[playerId]?.notes || null,
              valid_until: match.date,
              archived: false,
            })
            .eq("id", existingRequest.id);

          if (updateError) throw updateError;
          console.log("Request updated");
        } else {
          // Create new request
          const requestData = {
            player_id: playerId,
            team_name: match.club_team ?? match.team,
            match_id: match.id,
            needs_substitute: true,
            notes: availability[playerId]?.notes || null,
            marked_by: currentUserId,
            valid_until: match.date,
            archived: false,
          };
          
          console.log("Creating new request:", requestData);

          const { error: insertError } = await supabase
            .from("team_substitute_requests")
            .insert(requestData);

          if (insertError) {
            console.error("Insert error:", insertError);
            throw insertError;
          }
          console.log("Request created successfully");
        }
      } else {
        // Remove substitute request when status changes away from substitute_needed
        const { error: deleteError } = await supabase
          .from("team_substitute_requests")
          .delete()
          .eq("player_id", playerId)
          .eq("team_name", match.club_team ?? match.team)
          .eq("match_id", match.id);

        if (deleteError) throw deleteError;
        console.log("Request deleted");
      }

      setAvailability({
        ...availability,
        [playerId]: {
          player_id: playerId,
          status: status,
          notes: availability[playerId]?.notes || null,
        },
      });

      toast({
        title: "Gespeichert",
        description: "Verfügbarkeit wurde aktualisiert und mit Ersatzanfragen synchronisiert",
      });
    } catch (error) {
      console.error("Error updating availability:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Verfügbarkeit konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "unavailable":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "substitute_needed":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "available":
        return "Verfügbar";
      case "unavailable":
        return "Nicht verfügbar";
      case "substitute_needed":
        return "Ersatz benötigt";
      default:
        return "Keine Angabe";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Aufstellung - {match.club_team ?? match.team}
          </DialogTitle>
          <DialogDescription>
            {match.opponent} • {new Date(match.date).toLocaleDateString("de-DE")} um {match.time}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Linke Spalte: Alle Spieler */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Mannschaftsaufstellung</h3>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Lade Mannschaftsaufstellung...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Keine Mannschaftsmitglieder gefunden</p>
              </div>
            ) : (
              teamMembers.map((member, index) => {
                const playerStatus = availability[member.id]?.status;
                const needsSubstitute = playerStatus === "substitute_needed";
                
                return (
                  <Card key={member.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {member.first_name} {member.last_name}
                            </CardTitle>
                            <CardDescription>
                              {member.qttr_value ? `QTTR: ${member.qttr_value}` : "Keine QTTR-Wertung"}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`substitute-${member.id}`}
                          checked={needsSubstitute}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleStatusChange(member.id, "substitute_needed");
                            } else {
                              // When unchecked, remove the status by setting to null/default
                              handleStatusChange(member.id, "available");
                            }
                          }}
                        />
                        <Label htmlFor={`substitute-${member.id}`} className="cursor-pointer">
                          Ersatz benötigt
                        </Label>
                      </div>
                      
                      {needsSubstitute && (
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${member.id}`}>Notiz (optional)</Label>
                          <Textarea
                            id={`notes-${member.id}`}
                            placeholder="Grund für Abwesenheit..."
                            value={availability[member.id]?.notes || ""}
                            onChange={(e) => {
                              setAvailability({
                                ...availability,
                                [member.id]: {
                                  ...availability[member.id],
                                  player_id: member.id,
                                  status: "substitute_needed",
                                  notes: e.target.value,
                                },
                              });
                            }}
                            onBlur={async () => {
                              if (availability[member.id]) {
                                try {
                                  // Update match_availability
                                  await supabase
                                    .from("match_availability")
                                    .upsert({
                                      match_id: match.id,
                                      player_id: member.id,
                                      status: availability[member.id].status,
                                      notes: availability[member.id].notes,
                                    }, {
                                      onConflict: "match_id,player_id"
                                    });

                                  // Sync notes with team_substitute_requests
                                  if (availability[member.id].status === "substitute_needed") {
                                    await supabase
                                      .from("team_substitute_requests")
                                      .update({
                                        notes: availability[member.id].notes,
                                      })
                                      .eq("player_id", member.id)
                                      .eq("team_name", match.club_team ?? match.team)
                                      .eq("match_id", match.id);
                                  }
                                } catch (error) {
                                  console.error("Error saving notes:", error);
                                }
                              }
                            }}
                            rows={2}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Rechte Spalte: Fehlende Spieler */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Fehlende Spieler
            </h3>
            {teamMembers.filter(member => availability[member.id]?.status === "substitute_needed").length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Keine fehlenden Spieler</p>
              </div>
            ) : (
              teamMembers
                .filter(member => availability[member.id]?.status === "substitute_needed")
                .map((member, index) => (
                  <Card key={member.id} className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
                          {teamMembers.findIndex(m => m.id === member.id) + 1}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {member.first_name} {member.last_name}
                          </CardTitle>
                          <CardDescription>
                            {member.qttr_value ? `QTTR: ${member.qttr_value}` : "Keine QTTR-Wertung"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    {availability[member.id]?.notes && (
                      <CardContent>
                        <div className="text-sm">
                          <span className="font-medium">Notiz: </span>
                          <span className="text-muted-foreground">{availability[member.id].notes}</span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Schließen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
