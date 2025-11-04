import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  AlertTriangle, 
  User,
  CheckCircle,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string; // This is the user_id (references auth.users)
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export const AdminTransfer = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<Profile | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setFetchingData(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('last_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Get current admin info
      const currentAdminProfile = profilesData?.find(p => p.id === user.id);
      setCurrentAdmin(currentAdminProfile || null);

      // Filter out current admin from selection list
      const otherProfiles = profilesData?.filter(p => p.id !== user.id) || [];
      setProfiles(otherProfiles);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Fehler",
        description: "Mitgliederdaten konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setFetchingData(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!selectedUserId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Mitglied aus",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm(
      "Möchten Sie die Administrator-Rolle wirklich übertragen? Sie verlieren damit Ihre Admin-Rechte!"
    )) {
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current roles of the selected user
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', selectedUserId);

      const hasRoles = existingRoles?.map(r => r.role) || [];

      // Roles to assign (all except mannschaftsfuehrer which must be set manually)
      type AppRole = 'admin' | 'vorstand' | 'moderator' | 'player' | 'mannschaftsfuehrer' | 'substitute';
      const rolesToAssign: AppRole[] = ['admin', 'vorstand', 'moderator', 'player'];

      // Add missing roles
      const rolesToAdd = rolesToAssign.filter(role => !hasRoles.includes(role));
      
      if (rolesToAdd.length > 0) {
        const { error: addRolesError } = await supabase
          .from('user_roles')
          .insert(
            rolesToAdd.map(role => ({
              user_id: selectedUserId,
              role: role as AppRole
            }))
          );

        if (addRolesError) throw addRolesError;
      }

      // Remove admin role from current user
      const { error: removeAdminError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (removeAdminError) throw removeAdminError;

      toast({
        title: "Administrator übertragen",
        description: "Die Administrator-Rolle wurde erfolgreich übertragen. Sie werden jetzt abgemeldet.",
      });

      // Sign out current user after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 2000);

    } catch (error) {
      console.error('Error transferring admin:', error);
      toast({
        title: "Fehler",
        description: "Administrator-Rolle konnte nicht übertragen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (profile: Profile) => {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
    return name || profile.email || 'Unbekannt';
  };

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-neutral-900">Administrator übertragen</h2>
        <p className="text-muted-foreground mt-2">
          Übertragen Sie die Administrator-Rolle auf ein anderes Mitglied
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Wichtiger Hinweis:</strong> Nach der Übertragung verlieren Sie Ihre Administrator-Rechte 
          und werden automatisch abgemeldet. Das neue Admin-Mitglied erhält die Rollen: Admin, Vorstand, 
          Moderator und Spieler. Die Rolle "Mannschaftsführer" muss bei Bedarf manuell gesetzt werden.
        </AlertDescription>
      </Alert>

      {currentAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Aktueller Administrator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <div className="font-semibold">{getDisplayName(currentAdmin)}</div>
                <div className="text-sm text-muted-foreground">{currentAdmin.email}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Neuen Administrator auswählen</CardTitle>
          <CardDescription>
            Wählen Sie das Mitglied aus, das die Administrator-Rolle erhalten soll
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mitglied</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Mitglied auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {getDisplayName(profile)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserId && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{getDisplayName(profiles.find(p => p.id === selectedUserId)!)}</strong> wird 
                die folgenden Rollen erhalten: Administrator, Vorstand, Moderator, Spieler
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleTransferAdmin}
            disabled={loading || !selectedUserId}
            className="w-full"
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Übertrage Administrator-Rolle...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Administrator-Rolle übertragen
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
