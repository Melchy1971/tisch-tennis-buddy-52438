import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DeletedProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  deleted_at: string | null;
}

export const ProfileTrash = () => {
  const [deletedProfiles, setDeletedProfiles] = useState<DeletedProfile[]>([]);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  useEffect(() => {
    loadDeletedProfiles();
  }, []);

  const loadDeletedProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, first_name, last_name, email, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der gelöschten Profile");
      return;
    }

    setDeletedProfiles(data || []);
  };

  const handleRestore = async (profileId: string) => {
    try {
      const { error } = await supabase.rpc("restore_profile", {
        profile_id: profileId
      });

      if (error) throw error;

      toast.success("Profil wiederhergestellt");
      loadDeletedProfiles();
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("Fehler beim Wiederherstellen des Profils");
    }
  };

  const handlePermanentDelete = async (profileId: string) => {
    try {
      const { error } = await supabase.rpc("permanently_delete_profile", {
        profile_id: profileId
      });

      if (error) throw error;

      toast.success("Profil endgültig gelöscht");
      loadDeletedProfiles();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Fehler beim Löschen des Profils");
    }
  };

  const handleEmptyTrash = async () => {
    if (deletedProfiles.length === 0) return;

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

      loadDeletedProfiles();
    } catch (error) {
      console.error("Empty trash error:", error);
      toast.error("Fehler beim Leeren des Papierkorbs");
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Papierkorb
              </CardTitle>
              <CardDescription>
                Gelöschte Profile können wiederhergestellt oder endgültig gelöscht werden
              </CardDescription>
            </div>
            {deletedProfiles.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isEmptyingTrash}
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
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Papierkorb leeren?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden. Alle {deletedProfiles.length} Profile im Papierkorb werden permanent aus der Datenbank entfernt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEmptyTrash}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Papierkorb leeren
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {deletedProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine gelöschten Profile vorhanden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Gelöscht am</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      {profile.first_name} {profile.last_name}
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>{formatDate(profile.deleted_at)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(profile.id)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Wiederherstellen
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Endgültig löschen
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Profil endgültig löschen?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Diese Aktion kann nicht rückgängig gemacht werden. Das Profil "{profile.first_name} {profile.last_name}" wird permanent aus der Datenbank entfernt.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePermanentDelete(profile.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Endgültig löschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
