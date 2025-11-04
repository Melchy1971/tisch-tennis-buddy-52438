import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, UserCog, AlertTriangle } from "lucide-react";

interface DeveloperInfo {
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
  created_at: string;
}

export const DeveloperProfile = () => {
  const [developerInfo, setDeveloperInfo] = useState<DeveloperInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeveloperProfile();
  }, []);

  const fetchDeveloperProfile = async () => {
    try {
      // Fetch profile with entwickler role
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, created_at')
        .eq('email', 'mdickscheit@gmail.com')
        .single();

      if (profileError || !profiles) {
        console.error('Error fetching developer profile:', profileError);
        setLoading(false);
        return;
      }

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profiles.id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      setDeveloperInfo({
        email: profiles.email || '',
        first_name: profiles.first_name,
        last_name: profiles.last_name,
        roles: roles?.map(r => r.role) || [],
        created_at: profiles.created_at
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Entwicklerprofil</h2>
          <p className="text-muted-foreground mt-2">
            Lade Entwicklerinformationen...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-neutral-900">Entwicklerprofil</h2>
        <p className="text-muted-foreground mt-2">
          Geschütztes Entwicklerkonto für Systemverwaltung
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Geschütztes Profil:</strong> Dieses Profil gehört nicht zum Mitgliederpool und wird bei 
          Lösch- und Zurücksetzoperationen automatisch ausgenommen.
        </AlertDescription>
      </Alert>

      {!developerInfo ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Kein Entwicklerprofil gefunden. Bitte stellen Sie sicher, dass ein Benutzer mit der 
            E-Mail "mdickscheit@gmail.com" und den Rollen "entwickler" und "admin" existiert.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Entwickler-Account
            </CardTitle>
            <CardDescription>
              Systemadministrator mit vollen Berechtigungen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">E-Mail</div>
                  <div className="text-sm text-muted-foreground">{developerInfo.email}</div>
                </div>
              </div>

              {(developerInfo.first_name || developerInfo.last_name) && (
                <div className="flex items-center gap-3">
                  <UserCog className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Name</div>
                    <div className="text-sm text-muted-foreground">
                      {[developerInfo.first_name, developerInfo.last_name].filter(Boolean).join(' ')}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-medium mb-2">Rollen</div>
                <div className="flex flex-wrap gap-2">
                  {developerInfo.roles.map((role) => (
                    <Badge key={role} variant="default">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Erstellt am: {new Date(developerInfo.created_at).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-sm">Schutzfunktionen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Wird beim Zurücksetzen von Mitgliederdaten nicht gelöscht</li>
            <li>Wird bei Demo-Reset-Operationen ausgenommen</li>
            <li>Behält alle Rollen und Berechtigungen bei Systemänderungen</li>
            <li>Nicht im regulären Mitgliederpool sichtbar</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
