import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Team {
  id: string;
  name: string;
}

interface Player {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface SubstituteAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTeam?: string;
}

export const SubstituteAssignmentDialog = ({ 
  open, 
  onOpenChange,
  preselectedTeam = ""
}: SubstituteAssignmentDialogProps) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedRequestingTeam, setSelectedRequestingTeam] = useState<string>("");
  const [selectedSubstituteTeam, setSelectedSubstituteTeam] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [canRequest, setCanRequest] = useState(false);

  useEffect(() => {
    loadTeams();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles) {
      const rolesList = roles.map(r => r.role);
      setUserRoles(rolesList);
      
      // Check if user has required role
      const hasPermission = rolesList.some(role => 
        role === "mannschaftsfuehrer" || role === "admin" || role === "vorstand"
      );
      setCanRequest(hasPermission);
    }
  };

  useEffect(() => {
    if (preselectedTeam && teams.length > 0) {
      setSelectedRequestingTeam(preselectedTeam);
    }
  }, [preselectedTeam, teams]);

  useEffect(() => {
    if (selectedSubstituteTeam) {
      loadPlayersFromTeam(selectedSubstituteTeam);
    } else {
      setPlayers([]);
      setSelectedPlayer("");
    }
  }, [selectedSubstituteTeam]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Fehler",
        description: "Mannschaften konnten nicht geladen werden.",
        variant: "destructive",
      });
    }
  };

  const loadPlayersFromTeam = async (teamName: string) => {
    try {
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
            .select("user_id, first_name, last_name")
            .in("user_id", memberIds)
            .order("last_name", { ascending: true });

          if (profilesError) throw profilesError;
          setPlayers(profilesData || []);
        } else {
          setPlayers([]);
        }
      }
    } catch (error) {
      console.error("Error loading players:", error);
      toast({
        title: "Fehler",
        description: "Spieler konnten nicht geladen werden.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!canRequest) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, Ersatzspieler anzufordern.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRequestingTeam || !selectedSubstituteTeam || !selectedPlayer) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte alle Felder ausfüllen.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase
        .from("team_substitute_assignments")
        .insert({
          team_name: selectedRequestingTeam,
          substitute_player_id: selectedPlayer,
          substitute_team_name: selectedSubstituteTeam,
          requested_by: user.id,
          notes: notes || null,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Ersatzspieler-Anfrage wurde erstellt und wartet auf Freigabe durch den Mannschaftsführer.",
      });

      // Reset form and close dialog
      setSelectedRequestingTeam("");
      setSelectedSubstituteTeam("");
      setSelectedPlayer("");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating substitute assignment:", error);
      toast({
        title: "Fehler",
        description: "Ersatzspieler-Anfrage konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ersatzspieler zuordnen</DialogTitle>
          <DialogDescription>
            Ordnen Sie einen Spieler aus einer anderen Mannschaft als Ersatz zu
          </DialogDescription>
        </DialogHeader>
        
        {!canRequest ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">
              Sie haben keine Berechtigung, Ersatzspieler anzufordern.
              <br />
              Nur Mannschaftsführer, Admins und Vorstandsmitglieder können Ersatz anfordern.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="requesting-team">Mannschaft, die Ersatz braucht</Label>
            <Select value={selectedRequestingTeam} onValueChange={setSelectedRequestingTeam}>
              <SelectTrigger id="requesting-team">
                <SelectValue placeholder="Mannschaft wählen..." />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.name}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="substitute-team">Mannschaft des Ersatzspielers</Label>
            <Select value={selectedSubstituteTeam} onValueChange={setSelectedSubstituteTeam}>
              <SelectTrigger id="substitute-team">
                <SelectValue placeholder="Mannschaft wählen..." />
              </SelectTrigger>
              <SelectContent>
                {teams
                  .filter((t) => t.name !== selectedRequestingTeam)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.name}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSubstituteTeam && (
            <div className="space-y-2">
              <Label htmlFor="substitute-player">Ersatzspieler</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger id="substitute-player">
                  <SelectValue placeholder="Spieler wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.user_id} value={player.user_id}>
                      {player.first_name} {player.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notiz (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Informationen..."
              rows={3}
            />
          </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "Wird erstellt..." : "Ersatzspieler zuordnen"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
