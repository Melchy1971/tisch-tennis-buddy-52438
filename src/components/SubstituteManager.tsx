import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, AlertCircle, CheckCircle, UserPlus, ClipboardCheck, Calendar, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SubstituteAssignmentDialog } from "./SubstituteAssignmentDialog";
import { SubstituteApproval } from "./SubstituteApproval";
import { useToast } from "@/components/ui/use-toast";

interface SubstituteRequest {
  id: string;
  player_id: string;
  team_name: string;
  needs_substitute: boolean;
  notes: string | null;
  created_at: string;
  valid_until: string | null;
  match_id: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
  match?: {
    opponent: string;
    date: string;
    time: string;
    home_team: string | null;
    away_team: string | null;
  } | null;
}

interface SubstituteAssignment {
  id: string;
  substitute_player_id: string;
  status: "pending" | "approved" | "rejected";
  archived: boolean;
  team_name: string;
  substitute_profile: {
    first_name: string;
    last_name: string;
  };
  request_profile: {
    first_name: string;
    last_name: string;
  };
}

export const SubstituteManager = () => {
  const [substituteRequestsList, setSubstituteRequestsList] = useState<SubstituteRequest[]>([]);
  const [assignments, setAssignments] = useState<Record<string, SubstituteAssignment[]>>({});
  const [approvedAssignments, setApprovedAssignments] = useState<SubstituteAssignment[]>([]);
  const [archivedAssignments, setArchivedAssignments] = useState<SubstituteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState<string>("");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles) {
      setUserRoles(roles.map(r => r.role));
    }
  };

  const canArchive = userRoles.includes("admin") || userRoles.includes("vorstand");
  const isAdmin = userRoles.includes("admin");

  useEffect(() => {
    loadAvailabilityData();
  }, []);

  const loadAvailabilityData = async () => {
    try {
      setLoading(true);

      console.log("Loading substitute requests...");

      // Load substitute requests from team_substitute_requests
      const { data: substituteData, error: substituteError } = await supabase
        .from("team_substitute_requests")
        .select("id, player_id, team_name, needs_substitute, notes, created_at, valid_until, match_id, archived")
        .eq("needs_substitute", true)
        .eq("archived", false)
        .order("team_name", { ascending: true });

      console.log("Substitute requests loaded:", substituteData);
      
      if (substituteError) {
        console.error("Error loading substitute requests:", substituteError);
        throw substituteError;
      }

      if (!substituteData || substituteData.length === 0) {
        console.log("No substitute requests found");
        setSubstituteRequestsList([]);
        setAssignments({});
        return;
      }

      console.log(`Found ${substituteData.length} substitute requests`);

      // Load match information for requests that have a match_id
      const matchIds = substituteData.map(req => req.match_id).filter(Boolean);
      let matchesData = null;
      if (matchIds.length > 0) {
        const { data: matches, error: matchesError } = await supabase
          .from("matches")
          .select("id, opponent, date, time, home_team, away_team")
          .in("id", matchIds);

        if (matchesError) throw matchesError;
        matchesData = matches;
        console.log(`Loaded ${matchesData?.length || 0} matches`);
      }

      // Load profiles separately - player_id IS the profile.id in team_substitute_requests
      const playerIds = substituteData.map(req => req.player_id);
      console.log("Loading profiles for player IDs:", playerIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", playerIds);

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
        throw profilesError;
      }

      console.log("Profiles loaded:", profilesData);

      // Merge the data with profiles and matches
      const mergedData = substituteData.map(req => {
        const profile = profilesData?.find(p => p.id === req.player_id);
        const match = matchesData?.find(m => m.id === req.match_id);
        
        console.log(`Merging data for player ${req.player_id}:`, {
          foundProfile: !!profile,
          profileName: profile ? `${profile.first_name} ${profile.last_name}` : "Not found",
          foundMatch: !!match
        });
        
        return {
          ...req,
          profiles: {
            first_name: profile?.first_name || "Unbekannt",
            last_name: profile?.last_name || ""
          },
          match: match ? {
            opponent: match.opponent,
            date: match.date,
            time: match.time,
            home_team: match.home_team,
            away_team: match.away_team
          } : null
        };
      });

      console.log("Final merged data:", mergedData);
      setSubstituteRequestsList(mergedData as SubstituteRequest[]);

      // Load substitute assignments for these teams
      const teamNames = [...new Set(substituteData.map(req => req.team_name))];
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("team_substitute_assignments")
        .select("*")
        .in("team_name", teamNames)
        .eq("archived", false);

      if (assignmentsError) throw assignmentsError;

      // Load approved assignments for Mannschaftsführer tab
      const { data: approvedData, error: approvedError } = await supabase
        .from("team_substitute_assignments")
        .select("*")
        .eq("status", "approved")
        .eq("archived", false);

      if (approvedError) throw approvedError;

      // Load archived assignments
      const { data: archivedData, error: archivedError } = await supabase
        .from("team_substitute_assignments")
        .select("*")
        .eq("archived", true);

      if (archivedError) throw archivedError;

      // Load substitute requests to get player_id for original requesters
      const { data: requestsData, error: requestsError } = await supabase
        .from("team_substitute_requests")
        .select("team_name, player_id")
        .in("team_name", teamNames);

      if (requestsError) throw requestsError;

      // Process all assignment data
      const allAssignmentData = [...(assignmentsData || []), ...(approvedData || []), ...(archivedData || [])];
      
      if (allAssignmentData.length > 0) {
        // Collect all unique player IDs
        const substituteIds = allAssignmentData.map(a => a.substitute_player_id);
        const requestPlayerIds = requestsData?.map(r => r.player_id) || [];
        
        const allPlayerIds = [...new Set([...substituteIds, ...requestPlayerIds])];

        // Load all profiles at once
        const { data: allProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", allPlayerIds);

        if (profilesError) throw profilesError;

        // Helper to create assignment with profiles
        const createAssignmentWithProfiles = (assignment: any): SubstituteAssignment => {
          const substituteProfile = allProfiles?.find(p => p.id === assignment.substitute_player_id);
          
          // Find the original request to get player_id
          const request = requestsData?.find(r => r.team_name === assignment.team_name);
          const requestProfile = allProfiles?.find(p => p.id === request?.player_id);
          
          return {
            id: assignment.id,
            substitute_player_id: assignment.substitute_player_id,
            status: assignment.status as "pending" | "approved" | "rejected",
            archived: assignment.archived || false,
            team_name: assignment.team_name,
            substitute_profile: {
              first_name: substituteProfile?.first_name || "Unbekannt",
              last_name: substituteProfile?.last_name || ""
            },
            request_profile: {
              first_name: requestProfile?.first_name || "Unbekannt",
              last_name: requestProfile?.last_name || ""
            }
          };
        };

        // Group active assignments by team
        const assignmentsByTeam: Record<string, SubstituteAssignment[]> = {};
        assignmentsData?.forEach(assignment => {
          const assignmentWithProfile = createAssignmentWithProfiles(assignment);
          if (!assignmentsByTeam[assignment.team_name]) {
            assignmentsByTeam[assignment.team_name] = [];
          }
          assignmentsByTeam[assignment.team_name].push(assignmentWithProfile);
        });
        setAssignments(assignmentsByTeam);

        // Process approved assignments
        const approvedList = approvedData?.map(createAssignmentWithProfiles) || [];
        setApprovedAssignments(approvedList);

        // Process archived assignments
        const archivedList = archivedData?.map(createAssignmentWithProfiles) || [];
        setArchivedAssignments(archivedList);
      } else {
        setAssignments({});
        setApprovedAssignments([]);
        setArchivedAssignments([]);
      }
    } catch (error) {
      console.error("Error loading availability data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignDialog = (teamName: string) => {
    setSelectedTeamForAssignment(teamName);
    setAssignDialogOpen(true);
  };

  const handleDialogClose = () => {
    setAssignDialogOpen(false);
    loadAvailabilityData(); // Reload to show new assignments
  };

  const handleArchive = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("team_substitute_assignments")
        .update({ archived: true })
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Ersatzstellung archiviert",
        description: "Die Ersatzstellung wurde erfolgreich archiviert.",
      });

      loadAvailabilityData();
    } catch (error) {
      console.error("Error archiving assignment:", error);
      toast({
        title: "Fehler",
        description: "Die Ersatzstellung konnte nicht archiviert werden.",
        variant: "destructive",
      });
    }
  };

  const handleArchiveRequest = async (requestId: string, teamName: string) => {
    try {
      // Archive the substitute request
      const { error: requestError } = await supabase
        .from("team_substitute_requests")
        .update({ archived: true })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // Also archive all related assignments
      const { error: assignmentsError } = await supabase
        .from("team_substitute_assignments")
        .update({ archived: true })
        .eq("team_name", teamName);

      if (assignmentsError) throw assignmentsError;

      toast({
        title: "Ersatzanfrage archiviert",
        description: "Die Ersatzanfrage und alle zugehörigen Zuordnungen wurden archiviert.",
      });

      loadAvailabilityData();
    } catch (error) {
      console.error("Error archiving request:", error);
      toast({
        title: "Fehler",
        description: "Die Ersatzanfrage konnte nicht archiviert werden.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteArchivedAssignment = async (assignmentId: string) => {
    if (!confirm("Möchten Sie diese archivierte Ersatzstellung wirklich endgültig löschen?")) return;

    try {
      const { error } = await supabase
        .from("team_substitute_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Ersatzstellung gelöscht",
        description: "Die archivierte Ersatzstellung wurde endgültig gelöscht.",
      });

      loadAvailabilityData();
    } catch (error) {
      console.error("Error deleting archived assignment:", error);
      toast({
        title: "Fehler",
        description: "Die Ersatzstellung konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Ausstehend
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Genehmigt
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Abgelehnt
          </Badge>
        );
    }
  };

  const renderSubstituteRequestCard = (item: SubstituteRequest) => {
    const teamAssignments = assignments[item.team_name] || [];
    
    return (
      <div key={item.id} className="p-4 rounded-lg border bg-card hover:shadow-accent transition-shadow">
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarFallback>
              {item.profiles.first_name?.[0]}{item.profiles.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="font-semibold">
                {item.profiles.first_name} {item.profiles.last_name}
              </h3>
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" variant="outline">
                <AlertCircle className="w-3 h-3 mr-1" />
                Ersatz benötigt
              </Badge>
              {item.match && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {item.match.home_team || item.team_name} vs {item.match.away_team || item.match.opponent}
                </Badge>
              )}
            </div>
            
            <div className="font-medium text-primary">{item.team_name}</div>
            
            {item.match && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  Spiel: {item.match.home_team || item.team_name} - {item.match.away_team || item.match.opponent}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.match.date).toLocaleDateString("de-DE")} um {item.match.time} Uhr
                </div>
              </div>
            )}
            
            {!item.match && item.valid_until && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Gültig bis: {new Date(item.valid_until).toLocaleDateString("de-DE")}
              </div>
            )}
            
            {item.notes && (
              <div className="text-sm bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground">Notiz: </span>
                {item.notes}
              </div>
            )}

            {teamAssignments.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Zugeordnete Ersatzspieler:</div>
                {teamAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between gap-2 text-sm bg-muted/30 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <span>
                        {assignment.substitute_profile.first_name} {assignment.substitute_profile.last_name}
                      </span>
                      {getStatusBadge(assignment.status)}
                    </div>
                    {canArchive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchive(assignment.id)}
                      >
                        Archivieren
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenAssignDialog(item.team_name)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Ersatz zuordnen
              </Button>
              {canArchive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleArchiveRequest(item.id, item.team_name)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Archivieren
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Group substitute requests by team
  const groupSubstitutesByTeam = (items: SubstituteRequest[]) => {
    const groups: Record<string, SubstituteRequest[]> = {};
    
    items.forEach(item => {
      if (!groups[item.team_name]) {
        groups[item.team_name] = [];
      }
      groups[item.team_name].push(item);
    });
    
    return groups;
  };

  const substituteRequestsGroups = groupSubstitutesByTeam(substituteRequestsList);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-1/4 rounded bg-gray-200 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ersatzstellung</h1>
        <p className="text-muted-foreground">Übersicht über Spieler-Verfügbarkeit und Ersatzbedarf</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Ersatz benötigt
          </TabsTrigger>
          <TabsTrigger value="approve" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Freigaben
          </TabsTrigger>
          <TabsTrigger value="captain" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Mannschaftsführer
          </TabsTrigger>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Archiv
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {Object.keys(substituteRequestsGroups).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600 opacity-50" />
                <p className="text-muted-foreground">Derzeit wird kein Ersatz benötigt</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {Object.entries(substituteRequestsGroups).map(([team, items]) => (
                <Card key={team}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {team}
                    </CardTitle>
                    <CardDescription>Spieler, die Ersatz benötigen</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map(renderSubstituteRequestCard)}
                  </CardContent>
                </Card>
              ))}

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Ersatz benötigt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{substituteRequestsList.length}</div>
                    <p className="text-xs text-muted-foreground">Spieler benötigen Ersatz</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Mannschaften</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {Object.keys(substituteRequestsGroups).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Betroffene Teams</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="approve">
          <SubstituteApproval onStatusChange={loadAvailabilityData} />
        </TabsContent>

        <TabsContent value="captain" className="space-y-4">
          {approvedAssignments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Keine genehmigten Ersatzstellungen</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Genehmigte Ersatzstellungen</CardTitle>
                <CardDescription>Übersicht aller genehmigten Ersatzspieler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvedAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-primary">{assignment.team_name}</div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Ersatz für: </span>
                          <span className="font-medium">
                            {assignment.request_profile.first_name} {assignment.request_profile.last_name}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Ersatzspieler: </span>
                          <span className="font-medium">
                            {assignment.substitute_profile.first_name} {assignment.substitute_profile.last_name}
                          </span>
                        </div>
                        {getStatusBadge(assignment.status)}
                      </div>
                      {canArchive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(assignment.id)}
                        >
                          Archivieren
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archive" className="space-y-4">
          {archivedAssignments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Keine archivierten Ersatzstellungen</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Archivierte Ersatzstellungen</CardTitle>
                <CardDescription>Übersicht aller archivierten Ersatzspieler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {archivedAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 rounded-lg border bg-card opacity-75">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-primary">{assignment.team_name}</div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Ersatz für: </span>
                          <span className="font-medium">
                            {assignment.request_profile.first_name} {assignment.request_profile.last_name}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Ersatzspieler: </span>
                          <span className="font-medium">
                            {assignment.substitute_profile.first_name} {assignment.substitute_profile.last_name}
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Archiviert
                        </Badge>
                      </div>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteArchivedAssignment(assignment.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Löschen
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SubstituteAssignmentDialog
        open={assignDialogOpen}
        onOpenChange={handleDialogClose}
        preselectedTeam={selectedTeamForAssignment}
      />
    </div>
  );
};
