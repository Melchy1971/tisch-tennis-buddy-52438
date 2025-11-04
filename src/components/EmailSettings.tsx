import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMAIL_SETTINGS_COLUMNS =
  "id, email_provider_type, email_from_address, email_smtp_server, email_smtp_username, email_smtp_port, email_smtp_password, updated_at";

type EmailSettingsRow = {
  id: string;
  email_provider_type: string | null;
  email_from_address: string | null;
  email_smtp_server: string | null;
  email_smtp_username: string | null;
  email_smtp_port: number | null;
  email_smtp_password: string | null;
};

type EmailSettingsFormState = {
  id: string | null;
  email_provider_type: string;
  email_from_address: string;
  email_smtp_server: string;
  email_smtp_username: string;
  email_smtp_port: string;
  email_smtp_password: string;
};

const createEmptyFormState = (): EmailSettingsFormState => ({
  id: null,
  email_provider_type: "resend",
  email_from_address: "",
  email_smtp_server: "",
  email_smtp_username: "",
  email_smtp_port: "587",
  email_smtp_password: "",
});

const mapRowToFormState = (row: EmailSettingsRow | null): EmailSettingsFormState => ({
  id: row?.id ?? null,
  email_provider_type: row?.email_provider_type ?? "resend",
  email_from_address: row?.email_from_address ?? "",
  email_smtp_server: row?.email_smtp_server ?? "",
  email_smtp_username: row?.email_smtp_username ?? "",
  email_smtp_port: row?.email_smtp_port?.toString() ?? "587",
  email_smtp_password: row?.email_smtp_password ?? "",
});

const normalizeFormState = (state: EmailSettingsFormState): EmailSettingsFormState => ({
  ...state,
  email_from_address: state.email_from_address.trim(),
  email_smtp_server: state.email_smtp_server.trim(),
  email_smtp_username: state.email_smtp_username.trim(),
  email_smtp_password: state.email_smtp_password,
});

const toDatabasePayload = (
  state: EmailSettingsFormState,
): Partial<EmailSettingsRow> => ({
  email_provider_type: state.email_provider_type || null,
  email_from_address: state.email_from_address || null,
  email_smtp_server: state.email_smtp_server || null,
  email_smtp_username: state.email_smtp_username || null,
  email_smtp_port: state.email_smtp_port ? parseInt(state.email_smtp_port) : null,
  email_smtp_password: state.email_smtp_password || null,
});

export const EmailSettings = () => {
  const [formState, setFormState] = useState<EmailSettingsFormState>(createEmptyFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const { toast } = useToast();

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) throw error;

        if (!user) {
          setPermission("denied");
          setLoading(false);
          return;
        }

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (rolesError) throw rolesError;

        const isAdmin = roles?.some((role) => role.role === "admin") ?? false;
        setPermission(isAdmin ? "granted" : "denied");

        if (!isAdmin) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
        setPermission("denied");
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Ihre Berechtigung konnte nicht überprüft werden.",
        });
      }
    };

    void checkPermission();
  }, [toast]);

  useEffect(() => {
    if (permission !== "granted") return;

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("club_settings")
          .select(EMAIL_SETTINGS_COLUMNS)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        const row = data?.[0] ? (data[0] as EmailSettingsRow) : null;
        setFormState(mapRowToFormState(row));
      } catch (error) {
        console.error("Error loading email settings:", error);
        setFormState(createEmptyFormState());
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "E-Mail Einstellungen konnten nicht geladen werden.",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, [permission, toast]);

  const handleChange = <K extends keyof Omit<EmailSettingsFormState, "id">>(
    field: K,
    value: EmailSettingsFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedState = normalizeFormState(formState);
      const payload = toDatabasePayload(normalizedState);

      if (normalizedState.id) {
        const { error } = await supabase
          .from("club_settings")
          .update(payload)
          .eq("id", normalizedState.id);

        if (error) throw error;

        setFormState(normalizedState);
      } else {
        const { data, error } = await supabase
          .from("club_settings")
          .insert(payload)
          .select(EMAIL_SETTINGS_COLUMNS)
          .single();

        if (error) throw error;

        setFormState(mapRowToFormState(data as EmailSettingsRow));
      }

      toast({
        title: "Gespeichert",
        description: "E-Mail Einstellungen wurden aktualisiert.",
      });
    } catch (error) {
      console.error("Error saving email settings:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "E-Mail Einstellungen konnten nicht gespeichert werden.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (formState.id) {
        const { error } = await supabase
          .from("club_settings")
          .update({
            email_provider_type: null,
            email_from_address: null,
            email_smtp_server: null,
            email_smtp_username: null,
            email_smtp_port: null,
            email_smtp_password: null,
          })
          .eq("id", formState.id);

        if (error) throw error;
      }

      setFormState((prev) => ({
        ...prev,
        email_provider_type: "resend",
        email_from_address: "",
        email_smtp_server: "",
        email_smtp_username: "",
        email_smtp_port: "587",
        email_smtp_password: "",
      }));

      toast({
        title: "Gelöscht",
        description: "E-Mail Zugangsdaten wurden entfernt.",
      });
    } catch (error) {
      console.error("Error deleting email settings:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "E-Mail Einstellungen konnten nicht gelöscht werden.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const canSave = useMemo(() => {
    if (formState.email_provider_type === "resend") {
      return (
        formState.email_from_address.trim().length > 0 &&
        formState.email_smtp_server.trim().length > 0 &&
        formState.email_smtp_password.length > 0
      );
    } else {
      return (
        formState.email_from_address.trim().length > 0 &&
        formState.email_smtp_server.trim().length > 0 &&
        formState.email_smtp_username.trim().length > 0 &&
        formState.email_smtp_port.trim().length > 0 &&
        formState.email_smtp_password.length > 0
      );
    }
  }, [formState]);

  if (permission === "unknown" || loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          E-Mail Einstellungen werden geladen...
        </CardContent>
      </Card>
    );
  }

  if (permission === "denied") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            E-Mail Versand konfigurieren
          </CardTitle>
          <CardDescription>
            Sie benötigen die Rolle Admin, um diese Einstellungen zu bearbeiten.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            E-Mail Versand konfigurieren
          </CardTitle>
          <CardDescription>
            Wählen Sie einen E-Mail-Provider und hinterlegen Sie die Zugangsdaten für den Versand von Nachrichten und Newslettern.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email_provider_type">E-Mail-Provider</Label>
            <Select
              value={formState.email_provider_type}
              onValueChange={(value) => handleChange("email_provider_type", value)}
            >
              <SelectTrigger id="email_provider_type">
                <SelectValue placeholder="Provider auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend (API)</SelectItem>
                <SelectItem value="smtp">SMTP (IONOS, Google, etc.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formState.email_provider_type === "resend" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Resend SMTP nutzen</AlertTitle>
              <AlertDescription>
                Resend stellt einen dedizierten SMTP-Server und ein Passwort (API-Key) zur Verfügung. Die Zugangsdaten werden in
                Supabase hinterlegt und für automatisierte E-Mail Prozesse genutzt. Bewahren Sie die Informationen vertraulich auf.
              </AlertDescription>
            </Alert>
          )}

          {formState.email_provider_type === "smtp" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>SMTP-Konfiguration</AlertTitle>
              <AlertDescription>
                Nutzen Sie die SMTP-Zugangsdaten Ihres E-Mail-Providers (z.B. IONOS, Google/Gmail). Für Gmail benötigen Sie ein 
                App-spezifisches Passwort. Port 587 ist Standard für TLS-verschlüsselte Verbindungen.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email_from_address">Absendeadresse</Label>
              <Input
                id="email_from_address"
                type="email"
                placeholder="newsletter@verein.de"
                value={formState.email_from_address}
                onChange={(event) => handleChange("email_from_address", event.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_smtp_server">SMTP Server</Label>
              <Input
                id="email_smtp_server"
                placeholder={formState.email_provider_type === "resend" ? "smtp.resend.com" : "smtp.ionos.de / smtp.gmail.com"}
                value={formState.email_smtp_server}
                onChange={(event) => handleChange("email_smtp_server", event.target.value)}
                autoComplete="off"
              />
            </div>

            {formState.email_provider_type === "smtp" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email_smtp_username">SMTP Benutzername</Label>
                  <Input
                    id="email_smtp_username"
                    type="email"
                    placeholder="ihre-email@domain.de"
                    value={formState.email_smtp_username}
                    onChange={(event) => handleChange("email_smtp_username", event.target.value)}
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_smtp_port">SMTP Port</Label>
                  <Input
                    id="email_smtp_port"
                    type="number"
                    placeholder="587"
                    value={formState.email_smtp_port}
                    onChange={(event) => handleChange("email_smtp_port", event.target.value)}
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            <div className={`space-y-2 ${formState.email_provider_type === "resend" ? "md:col-span-2" : "md:col-span-2"}`}>
              <Label htmlFor="email_smtp_password">
                {formState.email_provider_type === "resend" ? "SMTP Passwort / API-Key" : "SMTP Passwort"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="email_smtp_password"
                  type={showPassword ? "text" : "password"}
                  placeholder={formState.email_provider_type === "resend" ? "resend_..." : "Ihr SMTP-Passwort"}
                  value={formState.email_smtp_password}
                  onChange={(event) => handleChange("email_smtp_password", event.target.value)}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Verbergen" : "Anzeigen"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? "Löschen..." : "Einstellungen löschen"}
          </Button>
          <Button onClick={handleSave} disabled={saving || deleting || !canSave}>
            {saving ? "Speichern..." : "Einstellungen speichern"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zusammenfassung</CardTitle>
          <CardDescription>
            Überblick über die gespeicherten Zugangsdaten für den geplanten E-Mail Versand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-muted-foreground">E-Mail-Provider</dt>
              <dd>{formState.email_provider_type === "resend" ? "Resend (API)" : "SMTP (IONOS, Google, etc.)"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Absendeadresse</dt>
              <dd>{formState.email_from_address || "-"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">SMTP Server</dt>
              <dd>{formState.email_smtp_server || "-"}</dd>
            </div>
            {formState.email_provider_type === "smtp" && (
              <>
                <div>
                  <dt className="font-semibold text-muted-foreground">SMTP Benutzername</dt>
                  <dd>{formState.email_smtp_username || "-"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted-foreground">SMTP Port</dt>
                  <dd>{formState.email_smtp_port || "-"}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="font-semibold text-muted-foreground">Passwort gespeichert</dt>
              <dd>{formState.email_smtp_password ? "Ja" : "Nein"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};
