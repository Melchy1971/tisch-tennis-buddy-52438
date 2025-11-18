import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, RefreshCw, Trash, Loader2, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  deleted_at: string | null;
}

type ProfilesTab = "active" | "trash";

interface ProfilesManagerProps {
  onTabChange?: (tab: ProfilesTab) => void;
}

export const ProfilesManager = ({ onTabChange }: ProfilesManagerProps) => {
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [deletedProfiles, setDeletedProfiles] = useState<Profile[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfilesTab>("active");
  const [sortBy, setSortBy] = useState<"name" | "email" | "firstname">("name");

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  const loadProfiles = async () => {
    // Load active profiles
    const { data: active, error: activeError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, deleted_at")
      .is("deleted_at", null)
      .order("last_name", { ascending: true });

    if (activeError) {
      toast.error("Fehler beim Laden der aktiven Profile");
      console.error(activeError);
    } else {
      setActiveProfiles(active || []);
    }

    // Load deleted profiles
    const { data: deleted, error: deletedError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (deletedError) {
      toast.error("Fehler beim Laden der gelöschten Profile");
      console.error(deletedError);
    } else {
      setDeletedProfiles(deleted || []);
    }
  };

  const handleSoftDelete = async (profile: Profile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (!selectedProfile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("soft_delete_profile", {
        profile_id: selectedProfile.id
      });

      if (error) throw error;

      toast.success("Profil in den Papierkorb verschoben");
      await loadProfiles();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Fehler beim Löschen des Profils");
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setSelectedProfile(null);
    }
  };

  const handleRestore = async (profile: Profile) => {
    setSelectedProfile(profile);
    setRestoreDialogOpen(true);
  };

  const handleEmptyTrash = async () => {
    if (deletedProfiles.length === 0) return;

    const confirmed = window.confirm(
      `Den Papierkorb mit ${deletedProfiles.length} Profil(en) endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );

    if (!confirmed) return;

    setIsEmptyingTrash(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const profile of deletedProfiles) {
        try {
          const { error } = await supabase.rpc("permanently_delete_profile", {
            profile_id: profile.id
          });

          if (error) {
            errorCount++;
            console.error(`Error deleting profile ${profile.id}:`, error);
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          console.error(`Error deleting profile ${profile.id}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} Profile endgültig gelöscht`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} Profile konnten nicht gelöscht werden`);
      }

      await loadProfiles();
    } catch (error) {
      console.error("Empty trash error:", error);
      toast.error("Fehler beim Leeren des Papierkorbs");
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  const confirmRestore = async () => {
    if (!selectedProfile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("restore_profile", {
        profile_id: selectedProfile.id
      });

      if (error) throw error;

      toast.success("Profil wiederhergestellt");
      await loadProfiles();
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Fehler beim Wiederherstellen des Profils");
    } finally {
      setIsLoading(false);
      setRestoreDialogOpen(false);
      setSelectedProfile(null);
    }
  };

  const handlePermanentDelete = async (profile: Profile) => {
    const confirmed = window.confirm(
      `Möchten Sie das Profil von ${profile.first_name} ${profile.last_name} ENDGÜLTIG löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("permanently_delete_profile", {
        profile_id: profile.id
      });

      if (error) throw error;

      toast.success("Profil endgültig gelöscht");
      await loadProfiles();
    } catch (error) {
      console.error("Permanent delete error:", error);
      toast.error("Fehler beim endgültigen Löschen");
    } finally {
      setIsLoading(false);
    }
  };

  const getProfileName = (profile: Profile) => {
    return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unbekannt";
  };

  const handleTabChange = (value: string) => {
    const nextTab: ProfilesTab = value === "trash" ? "trash" : "active";
    setActiveTab(nextTab);
  };

  const sortedActiveProfiles = useMemo(() => {
    return [...activeProfiles].sort((a, b) => {
      if (sortBy === "name") {
        // Sortiere zuerst nach Nachname, dann nach Vorname
        const lastNameA = (a.last_name || "").toLowerCase();
        const lastNameB = (b.last_name || "").toLowerCase();
        const lastNameCompare = lastNameA.localeCompare(lastNameB, "de-DE");
        
        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }
        
        // Bei gleichem Nachnamen nach Vorname sortieren
        const firstNameA = (a.first_name || "").toLowerCase();
        const firstNameB = (b.first_name || "").toLowerCase();
        return firstNameA.localeCompare(firstNameB, "de-DE");
      } else if (sortBy === "firstname") {
        const firstNameA = (a.first_name || "").toLowerCase();
        const firstNameB = (b.first_name || "").toLowerCase();
        return firstNameA.localeCompare(firstNameB, "de-DE");
      } else {
        const emailA = (a.email || "").toLowerCase();
        const emailB = (b.email || "").toLowerCase();
        return emailA.localeCompare(emailB, "de-DE");
      }
    });
  }, [activeProfiles, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profilverwaltung</h2>
        <p className="text-muted-foreground">
          Verwalten Sie aktive Profile und den Papierkorb
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Aktive Profile ({activeProfiles.length})
          </TabsTrigger>
          <TabsTrigger value="trash">
            Papierkorb ({deletedProfiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sortieren nach:</span>
                <Select value={sortBy} onValueChange={(value: "name" | "email" | "firstname") => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nachname</SelectItem>
                    <SelectItem value="firstname">Vorname</SelectItem>
                    <SelectItem value="email">E-Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nachname</TableHead>
                  <TableHead>Vorname</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedActiveProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Keine aktiven Profile vorhanden
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedActiveProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.last_name || "-"}
                      </TableCell>
                      <TableCell>
                        {profile.first_name || "-"}
                      </TableCell>
                      <TableCell>{profile.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSoftDelete(profile)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="trash">
          <Card>
            {deletedProfiles.length > 0 && (
              <div className="flex items-center justify-end gap-2 p-4 border-b">
                <Button
                  variant="destructive"
                  onClick={handleEmptyTrash}
                  disabled={isLoading || isEmptyingTrash}
                  className="gap-2"
                >
                  {isEmptyingTrash ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird geleert...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Papierkorb leeren
                    </>
                  )}
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nachname</TableHead>
                  <TableHead>Vorname</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Gelöscht am</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Papierkorb ist leer
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.last_name || "-"}
                      </TableCell>
                      <TableCell>
                        {profile.first_name || "-"}
                      </TableCell>
                      <TableCell>{profile.email || "-"}</TableCell>
                      <TableCell>
                        {profile.deleted_at
                          ? new Date(profile.deleted_at).toLocaleDateString("de-DE")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(profile)}
                          disabled={isLoading}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePermanentDelete(profile)}
                          disabled={isLoading}
                          className="text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profil löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Profil von {selectedProfile && getProfileName(selectedProfile)} wird in den
              Papierkorb verschoben und kann später wiederhergestellt werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSoftDelete} disabled={isLoading}>
              In Papierkorb verschieben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profil wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Profil von {selectedProfile && getProfileName(selectedProfile)} wird
              wiederhergestellt und ist wieder aktiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={isLoading}>
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
