import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Check, X, Clock, Trash2 } from "lucide-react";

interface SubstituteAssignment {
  id: string;
  team_name: string;
  substitute_player_id: string;
  substitute_team_name: string;
  requested_by: string;
  approved_by: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
  substitute_profile: {
    first_name: string;
    last_name: string;
  };
  requester_profile: {
    first_name: string;
    last_name: string;
  };
}

interface SubstituteApprovalProps {
  onStatusChange?: () => void;
}

export const SubstituteApproval = ({ onStatusChange }: SubstituteApprovalProps) => {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<SubstituteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userTeams, setUserTeams] = useState<string[]>([]);

  useEffect(() => {
    loadUserData();
    loadAssignments();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    // Load user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles) {
      setUserRoles(roles.map(r => r.role));
    }

    // Load teams where user is captain
    const { data: captainTeams } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("member_id", user.id)
      .eq("is_captain", true);

    if (captainTeams && captainTeams.length > 0) {
      const teamIds = captainTeams.map(t => t.team_id);
      const { data: teams } = await supabase
        .from("teams")
        .select("name")
        .in("id", teamIds);

      if (teams) {
        setUserTeams(teams.map(t => t.name));
      }
    }
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("team_substitute_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        return;
      }

      // Load substitute profiles
      const substitutePlayerIds = assignmentsData.map(a => a.substitute_player_id);
      const { data: substituteProfiles, error: substituteError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", substitutePlayerIds);

      if (substituteError) throw substituteError;

      // Load requester profiles
      const requesterIds = assignmentsData.map(a => a.requested_by);
      const { data: requesterProfiles, error: requesterError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", requesterIds);

      if (requesterError) throw requesterError;

      // Merge the data
      const mergedData = assignmentsData.map(assignment => {
        const substituteProfile = substituteProfiles?.find(p => p.id === assignment.substitute_player_id);
        const requesterProfile = requesterProfiles?.find(p => p.id === assignment.requested_by);
        
        return {
          ...assignment,
          substitute_profile: {
            first_name: substituteProfile?.first_name || "Unbekannt",
            last_name: substituteProfile?.last_name || ""
          },
          requester_profile: {
            first_name: requesterProfile?.first_name || "Unbekannt",
            last_name: requesterProfile?.last_name || ""
          }
        };
      });

      setAssignments(mergedData as SubstituteAssignment[]);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast({
        title: "Fehler",
        description: "Anfragen konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canApproveAssignment = (assignment: SubstituteAssignment): boolean => {
    // Admin and vorstand can approve everything
    if (userRoles.includes("admin") || userRoles.includes("vorstand")) {
      return true;
    }

    // Mannschaftsführer can only approve if they are captain of the substitute team
    if (userRoles.includes("mannschaftsfuehrer")) {
      return userTeams.includes(assignment.substitute_team_name);
    }

    return false;
  };

  const handleApprove = async (id: string, assignment: SubstituteAssignment) => {
    if (!canApproveAssignment(assignment)) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, diese Anfrage zu genehmigen.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingId(id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase
        .from("team_substitute_assignments")
        .update({
          status: "approved",
          approved_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Genehmigt",
        description: "Ersatzspieler wurde freigegeben.",
      });

      await loadAssignments();
      onStatusChange?.(); // Notify parent to reload
    } catch (error) {
      console.error("Error approving assignment:", error);
      toast({
        title: "Fehler",
        description: "Freigabe konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, assignment: SubstituteAssignment) => {
    if (!canApproveAssignment(assignment)) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, diese Anfrage abzulehnen.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingId(id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase
        .from("team_substitute_assignments")
        .update({
          status: "rejected",
          approved_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Abgelehnt",
        description: "Ersatzspieler-Anfrage wurde abgelehnt.",
      });

      await loadAssignments();
      onStatusChange?.(); // Notify parent to reload
    } catch (error) {
      console.error("Error rejecting assignment:", error);
      toast({
        title: "Fehler",
        description: "Ablehnung konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setProcessingId(id);

      const { error } = await supabase
        .from("team_substitute_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Gelöscht",
        description: "Freigabe wurde erfolgreich gelöscht.",
      });

      await loadAssignments();
      onStatusChange?.(); // Notify parent to reload
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Fehler",
        description: "Freigabe konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Ausstehend
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check className="w-3 h-3 mr-1" />
            Genehmigt
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <X className="w-3 h-3 mr-1" />
            Abgelehnt
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Keine Ersatzspieler-Anfragen vorhanden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {assignment.team_name} ← {assignment.substitute_team_name}
                </CardTitle>
                <CardDescription>
                  Angefordert von {assignment.requester_profile.first_name}{" "}
                  {assignment.requester_profile.last_name}
                </CardDescription>
              </div>
              {getStatusBadge(assignment.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {assignment.substitute_profile.first_name?.[0]}
                  {assignment.substitute_profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">
                  {assignment.substitute_profile.first_name}{" "}
                  {assignment.substitute_profile.last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Ersatzspieler von {assignment.substitute_team_name}
                </div>
              </div>
            </div>

            {assignment.notes && (
              <div className="text-sm bg-muted/50 p-3 rounded">
                <span className="font-medium">Notiz: </span>
                {assignment.notes}
              </div>
            )}

            <div className="flex gap-2">
              {assignment.status === "pending" && canApproveAssignment(assignment) && (
                <>
                  <Button
                    onClick={() => handleApprove(assignment.id, assignment)}
                    disabled={processingId === assignment.id}
                    className="flex-1"
                    variant="default"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Genehmigen
                  </Button>
                  <Button
                    onClick={() => handleReject(assignment.id, assignment)}
                    disabled={processingId === assignment.id}
                    className="flex-1"
                    variant="destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Ablehnen
                  </Button>
                </>
              )}
              {assignment.status === "pending" && !canApproveAssignment(assignment) && (
                <div className="flex-1 text-sm text-muted-foreground p-2 bg-muted/50 rounded">
                  Nur der Mannschaftsführer von {assignment.substitute_team_name} kann diese Anfrage genehmigen.
                </div>
              )}
              {(userRoles.includes("admin") || userRoles.includes("vorstand")) && (
                <Button
                  onClick={() => handleDelete(assignment.id)}
                  disabled={processingId === assignment.id}
                  variant="outline"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Erstellt am {new Date(assignment.created_at).toLocaleDateString("de-DE")}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
