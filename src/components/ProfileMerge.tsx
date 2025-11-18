import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Merge } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  birthday: string | null;
  member_number: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  qttr_value: number | null;
  photo_url: string | null;
  deleted_at: string | null;
}

interface UserRole {
  role: string;
}

interface TeamAssignment {
  team_id: string;
  team_name: string;
  is_captain: boolean;
  position: string | null;
}

export const ProfileMerge = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [primaryProfileId, setPrimaryProfileId] = useState<string>("");
  const [secondaryProfileId, setSecondaryProfileId] = useState<string>("");
  const [primaryProfile, setPrimaryProfile] = useState<Profile | null>(null);
  const [secondaryProfile, setSecondaryProfile] = useState<Profile | null>(null);
  const [mergedData, setMergedData] = useState<Partial<Profile>>({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [primaryRoles, setPrimaryRoles] = useState<string[]>([]);
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [primaryTeamAssignments, setPrimaryTeamAssignments] = useState<TeamAssignment[]>([]);
  const [secondaryTeamAssignments, setSecondaryTeamAssignments] = useState<TeamAssignment[]>([]);
  const [selectedTeamAssignments, setSelectedTeamAssignments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (primaryProfileId) {
      const profile = profiles.find(p => p.id === primaryProfileId);
      setPrimaryProfile(profile || null);
      if (profile) {
        setMergedData({ ...profile });
        loadRoles(profile.id, setPrimaryRoles);
        loadTeamAssignments(profile.id, setPrimaryTeamAssignments);
      }
    }
  }, [primaryProfileId, profiles]);

  useEffect(() => {
    if (secondaryProfileId) {
      const profile = profiles.find(p => p.id === secondaryProfileId);
      setSecondaryProfile(profile || null);
      if (profile) {
        loadRoles(profile.id, setSecondaryRoles);
        loadTeamAssignments(profile.id, setSecondaryTeamAssignments);
      }
    }
  }, [secondaryProfileId, profiles]);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .is("deleted_at", null)
      .order("last_name", { ascending: true });

    if (error) {
      toast.error("Fehler beim Laden der Profile");
      return;
    }

    setProfiles(data || []);
  };

  const loadRoles = async (userId: string, setRolesState: (roles: string[]) => void) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Fehler beim Laden der Rollen:", error);
      return;
    }

    setRolesState((data || []).map((r: UserRole) => r.role));
  };

  const loadTeamAssignments = async (userId: string, setTeamAssignmentsState: (assignments: TeamAssignment[]) => void) => {
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        team_id,
        is_captain,
        position,
        teams!inner(name)
      `)
      .eq("member_id", userId);

    if (error) {
      console.error("Fehler beim Laden der Mannschaftszuordnungen:", error);
      return;
    }

    const assignments = (data || []).map((assignment: any) => ({
      team_id: assignment.team_id,
      team_name: assignment.teams.name,
      is_captain: assignment.is_captain,
      position: assignment.position
    }));

    setTeamAssignmentsState(assignments);
  };

  const toggleFieldSelection = (field: string, value: any) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
      // Revert to primary value
      setMergedData(prev => ({
        ...prev,
        [field]: primaryProfile?.[field as keyof Profile]
      }));
    } else {
      newSelected.add(field);
      // Use secondary value
      setMergedData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setSelectedFields(newSelected);
  };

  const toggleRoleSelection = (role: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(role)) {
      newSelected.delete(role);
    } else {
      newSelected.add(role);
    }
    setSelectedRoles(newSelected);
  };

  const toggleTeamAssignmentSelection = (teamId: string) => {
    const newSelected = new Set(selectedTeamAssignments);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeamAssignments(newSelected);
  };

  const handleMerge = async () => {
    if (!primaryProfile || !secondaryProfile) {
      toast.error("Bitte wählen Sie beide Profile aus");
      return;
    }

    if (primaryProfileId === secondaryProfileId) {
      toast.error("Bitte wählen Sie unterschiedliche Profile aus");
      return;
    }

    try {
      // Update primary profile with merged data
      const { error: updateError } = await supabase
        .from("profiles")
        .update(mergedData)
        .eq("id", primaryProfileId);

      if (updateError) throw updateError;

      // Add selected roles from secondary to primary
      if (selectedRoles.size > 0) {
        const rolesToAdd = Array.from(selectedRoles).filter(role => !primaryRoles.includes(role));
        
        for (const role of rolesToAdd) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert([{
              user_id: primaryProfile.id,
              role: role as any
            }]);
          
          if (roleError) {
            console.error("Error adding role:", roleError);
          }
        }
      }

      // Add selected team assignments from secondary to primary
      if (selectedTeamAssignments.size > 0) {
        const assignmentsToAdd = secondaryTeamAssignments.filter(assignment => 
          selectedTeamAssignments.has(assignment.team_id)
        );
        
        for (const assignment of assignmentsToAdd) {
          const { error: teamError} = await supabase
            .from("team_members")
            .insert([{
              team_id: assignment.team_id,
              user_id: primaryProfile.id,
              position: typeof assignment.position === 'string' ? parseInt(assignment.position) : assignment.position
            }]);
          
          if (teamError) {
            console.error("Error adding team assignment:", teamError);
          }
        }
      }

      // Soft delete secondary profile
      const { error: deleteError } = await supabase.rpc("soft_delete_profile", {
        profile_id: secondaryProfileId
      });

      if (deleteError) throw deleteError;

      toast.success("Profile erfolgreich zusammengeführt");
      setPrimaryProfileId("");
      setSecondaryProfileId("");
      setPrimaryProfile(null);
      setSecondaryProfile(null);
      setMergedData({});
      setSelectedFields(new Set());
      setPrimaryRoles([]);
      setSecondaryRoles([]);
      setSelectedRoles(new Set());
      setPrimaryTeamAssignments([]);
      setSecondaryTeamAssignments([]);
      setSelectedTeamAssignments(new Set());
      loadProfiles();
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Fehler beim Zusammenführen der Profile");
    }
  };

  const renderFieldComparison = (fieldName: string, label: string, primaryValue: any, secondaryValue: any) => {
    if (!primaryValue && !secondaryValue) return null;
    
    const isDifferent = primaryValue !== secondaryValue;
    const displayPrimary = primaryValue || "-";
    const displaySecondary = secondaryValue || "-";

    return (
      <div className="grid grid-cols-12 gap-2 items-center py-2 border-b">
        <div className="col-span-3 font-medium text-sm">{label}</div>
        <div className="col-span-4 text-sm">{displayPrimary}</div>
        {isDifferent && secondaryValue && (
          <>
            <div className="col-span-1 flex justify-center">
              <Checkbox
                checked={selectedFields.has(fieldName)}
                onCheckedChange={() => toggleFieldSelection(fieldName, secondaryValue)}
              />
            </div>
            <div className="col-span-4 text-sm text-muted-foreground">{displaySecondary}</div>
          </>
        )}
        {(!isDifferent || !secondaryValue) && (
          <div className="col-span-5"></div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Profile zusammenführen
          </CardTitle>
          <CardDescription>
            Wählen Sie ein primäres Profil und ein sekundäres Profil zum Zusammenführen aus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primäres Profil (wird übernommen)</Label>
              <Select value={primaryProfileId} onValueChange={setPrimaryProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Primäres Profil wählen" />
                </SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(p => p.id !== secondaryProfileId)
                    .map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name} ({profile.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sekundäres Profil (wird gelöscht)</Label>
              <Select value={secondaryProfileId} onValueChange={setSecondaryProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sekundäres Profil wählen" />
                </SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(p => p.id !== primaryProfileId)
                    .map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name} ({profile.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {primaryProfile && secondaryProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datenvergleich</CardTitle>
                <CardDescription>
                  Wählen Sie Felder aus dem sekundären Profil aus, die übernommen werden sollen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 pb-2 border-b-2 font-semibold text-sm">
                    <div className="col-span-3">Feld</div>
                    <div className="col-span-4">Primär</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Sekundär</div>
                  </div>
                  {renderFieldComparison("first_name", "Vorname", primaryProfile.first_name, secondaryProfile.first_name)}
                  {renderFieldComparison("last_name", "Nachname", primaryProfile.last_name, secondaryProfile.last_name)}
                  {renderFieldComparison("email", "E-Mail", primaryProfile.email, secondaryProfile.email)}
                  {renderFieldComparison("phone", "Telefon", primaryProfile.phone, secondaryProfile.phone)}
                  {renderFieldComparison("mobile", "Mobil", primaryProfile.mobile, secondaryProfile.mobile)}
                  {renderFieldComparison("birthday", "Geburtstag", primaryProfile.birthday, secondaryProfile.birthday)}
                  {renderFieldComparison("member_number", "Mitgliedsnummer", primaryProfile.member_number, secondaryProfile.member_number)}
                  {renderFieldComparison("street", "Straße", primaryProfile.street, secondaryProfile.street)}
                  {renderFieldComparison("postal_code", "PLZ", primaryProfile.postal_code, secondaryProfile.postal_code)}
                  {renderFieldComparison("city", "Ort", primaryProfile.city, secondaryProfile.city)}
                  {renderFieldComparison("qttr_value", "Q-TTR", primaryProfile.qttr_value, secondaryProfile.qttr_value)}
                  
                  {/* Rollen Vergleich */}
                  <div className="grid grid-cols-12 gap-2 items-center py-3 border-b mt-4">
                    <div className="col-span-3 font-medium text-sm">Rollen</div>
                    <div className="col-span-4">
                      <div className="flex flex-wrap gap-1">
                        {primaryRoles.length > 0 ? (
                          primaryRoles.map(role => (
                            <Badge key={role} variant="secondary">{role}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1"></div>
                    <div className="col-span-4">
                      <div className="flex flex-wrap gap-1">
                        {secondaryRoles.length > 0 ? (
                          secondaryRoles.map(role => {
                            const alreadyHasRole = primaryRoles.includes(role);
                            return (
                              <div key={role} className="flex items-center gap-1">
                                {!alreadyHasRole && (
                                  <Checkbox
                                    checked={selectedRoles.has(role)}
                                    onCheckedChange={() => toggleRoleSelection(role)}
                                  />
                                )}
                                <Badge 
                                  variant={alreadyHasRole ? "outline" : "secondary"}
                                  className={alreadyHasRole ? "opacity-50" : ""}
                                >
                                  {role}
                                </Badge>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mannschaftszuordnungen Vergleich */}
                  <div className="grid grid-cols-12 gap-2 items-center py-3 border-b mt-4">
                    <div className="col-span-3 font-medium text-sm">Mannschaften</div>
                    <div className="col-span-4">
                      <div className="flex flex-wrap gap-1">
                        {primaryTeamAssignments.length > 0 ? (
                          primaryTeamAssignments.map(assignment => (
                            <Badge key={assignment.team_id} variant="secondary">
                              {assignment.team_name}
                              {assignment.is_captain && " (Kapitän)"}
                              {assignment.position && ` (${assignment.position})`}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1"></div>
                    <div className="col-span-4">
                      <div className="flex flex-wrap gap-1">
                        {secondaryTeamAssignments.length > 0 ? (
                          secondaryTeamAssignments.map(assignment => {
                            const alreadyHasTeam = primaryTeamAssignments.some(pa => pa.team_id === assignment.team_id);
                            return (
                              <div key={assignment.team_id} className="flex items-center gap-1">
                                {!alreadyHasTeam && (
                                  <Checkbox
                                    checked={selectedTeamAssignments.has(assignment.team_id)}
                                    onCheckedChange={() => toggleTeamAssignmentSelection(assignment.team_id)}
                                  />
                                )}
                                <Badge 
                                  variant={alreadyHasTeam ? "outline" : "secondary"}
                                  className={alreadyHasTeam ? "opacity-50" : ""}
                                >
                                  {assignment.team_name}
                                  {assignment.is_captain && " (Kapitän)"}
                                  {assignment.position && ` (${assignment.position})`}
                                </Badge>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleMerge}
              disabled={!primaryProfile || !secondaryProfile}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Profile zusammenführen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
