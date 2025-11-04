import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { Building2, Mail, Phone, MapPin, Globe, User, Facebook } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type ClubSettingsContactRow = {
  id: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  contact_website: string | null;
  contact_facebook: string | null;
  board_chairman: string | null;
  board_deputy: string | null;
  board_treasurer: string | null;
  board_secretary: string | null;
  board_youth_leader: string | null;
  show_feedback_section: boolean;
};

type ClubContactFormState = {
  id: string | null;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  contact_website: string;
  contact_facebook: string;
  board_chairman: string;
  board_deputy: string;
  board_treasurer: string;
  board_secretary: string;
  board_youth_leader: string;
  show_feedback_section: boolean;
};

const CLUB_CONTACT_COLUMNS =
  "id, contact_email, contact_phone, contact_address, contact_website, contact_facebook, " +
  "board_chairman, board_deputy, board_treasurer, board_secretary, board_youth_leader, show_feedback_section";

const boardFieldConfig = [
  { key: "board_chairman", label: "Vorstand" },
  { key: "board_deputy", label: "Stellvertretender Vorstand" },
  { key: "board_treasurer", label: "Kassierer" },
  { key: "board_secretary", label: "Schriftführer" },
  { key: "board_youth_leader", label: "Jugendleiter/-in" },
] as const;

const createEmptyFormState = (): ClubContactFormState => ({
  id: null,
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  contact_website: "",
  contact_facebook: "",
  board_chairman: "",
  board_deputy: "",
  board_treasurer: "",
  board_secretary: "",
  board_youth_leader: "",
  show_feedback_section: true,
});

const mapRowToFormState = (row: ClubSettingsContactRow | null): ClubContactFormState => ({
  id: row?.id ?? null,
  contact_email: row?.contact_email ?? "",
  contact_phone: row?.contact_phone ?? "",
  contact_address: row?.contact_address ?? "",
  contact_website: row?.contact_website ?? "",
  contact_facebook: row?.contact_facebook ?? "",
  board_chairman: row?.board_chairman ?? "",
  board_deputy: row?.board_deputy ?? "",
  board_treasurer: row?.board_treasurer ?? "",
  board_secretary: row?.board_secretary ?? "",
  board_youth_leader: row?.board_youth_leader ?? "",
  show_feedback_section: row?.show_feedback_section ?? true,
});

const normalizeFormState = (state: ClubContactFormState): ClubContactFormState => ({
  ...state,
  contact_email: state.contact_email.trim(),
  contact_phone: state.contact_phone.trim(),
  contact_address: state.contact_address.trim(),
  contact_website: state.contact_website.trim(),
  contact_facebook: state.contact_facebook.trim(),
  board_chairman: state.board_chairman.trim(),
  board_deputy: state.board_deputy.trim(),
  board_treasurer: state.board_treasurer.trim(),
  board_secretary: state.board_secretary.trim(),
  board_youth_leader: state.board_youth_leader.trim(),
});

const toDatabasePayload = (
  state: ClubContactFormState,
): Partial<ClubSettingsContactRow> => ({
  contact_email: state.contact_email || null,
  contact_phone: state.contact_phone || null,
  contact_address: state.contact_address || null,
  contact_website: state.contact_website || null,
  contact_facebook: state.contact_facebook || null,
  board_chairman: state.board_chairman || null,
  board_deputy: state.board_deputy || null,
  board_treasurer: state.board_treasurer || null,
  board_secretary: state.board_secretary || null,
  board_youth_leader: state.board_youth_leader || null,
  show_feedback_section: state.show_feedback_section,
});

export const ClubInfoSettings = () => {
  const [contactSettings, setContactSettings] = useState<ClubContactFormState>(createEmptyFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: settings, error: settingsError } = await supabase
          .from("club_settings")
          .select(CLUB_CONTACT_COLUMNS)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (settingsError) throw settingsError;

        const row = settings?.[0] ? (settings[0] as unknown as ClubSettingsContactRow) : null;
        setContactSettings(mapRowToFormState(row));
      } catch (error) {
        console.error("Error loading club contact settings:", error);
        setContactSettings(createEmptyFormState());
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Vereinsinformationen konnten nicht geladen werden",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [toast]);

  const handleChange = <K extends keyof Omit<ClubContactFormState, "id">>(
    field: K,
    value: ClubContactFormState[K],
  ) => {
    setContactSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleBoardFieldChange = (field: (typeof boardFieldConfig)[number]["key"], value: string) => {
    handleChange(field, value);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedState = normalizeFormState(contactSettings);
      const payload = toDatabasePayload(normalizedState);

      if (normalizedState.id) {
        const { error } = await supabase
          .from("club_settings")
          .update(payload)
          .eq("id", normalizedState.id);

        if (error) throw error;

        setContactSettings(normalizedState);
      } else {
        const { data, error } = await supabase
          .from("club_settings")
          .insert(payload)
          .select(CLUB_CONTACT_COLUMNS)
          .single();

        if (error) throw error;

        setContactSettings(mapRowToFormState(data as unknown as ClubSettingsContactRow));
      }

      toast({
        title: "Gespeichert",
        description: "Vereinsinformationen wurden aktualisiert",
      });
    } catch (error) {
      console.error("Error saving club contact settings:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Vereinsinformationen konnten nicht gespeichert werden",
      });
    } finally {
      setSaving(false);
    }
  };

  const websiteValue = contactSettings.contact_website.trim();
  const websiteLink = websiteValue
    ? websiteValue.startsWith("http")
      ? websiteValue
      : `https://${websiteValue}`
    : null;
  const facebookValue = contactSettings.contact_facebook.trim();
  const facebookLink = facebookValue
    ? facebookValue.startsWith("http")
      ? facebookValue
      : `https://${facebookValue}`
    : null;

  const boardPreviewEntries = boardFieldConfig.map((field) => ({
    label: field.label,
    value: contactSettings[field.key].trim(),
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Vereinsinformationen werden geladen...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Verein
          </CardTitle>
          <CardDescription>
            Pflegen Sie die Kontaktdaten Ihres Vereins. Die Angaben werden im Bereich "Info" für alle Mitglieder angezeigt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="club_contact_address">Vereinsadresse</Label>
                <Textarea
                  id="club_contact_address"
                  placeholder="Vereinsname\nStraße Hausnummer\nPLZ Ort"
                  value={contactSettings.contact_address}
                  onChange={(event) => handleChange("contact_address", event.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="club_contact_email">E-Mail</Label>
                <Input
                  id="club_contact_email"
                  type="email"
                  placeholder="kontakt@verein.de"
                  value={contactSettings.contact_email}
                  onChange={(event) => handleChange("contact_email", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="club_contact_phone">Telefon</Label>
                <Input
                  id="club_contact_phone"
                  type="tel"
                  placeholder="+49 123 456789"
                  value={contactSettings.contact_phone}
                  onChange={(event) => handleChange("contact_phone", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="club_contact_website">Webseite</Label>
                <Input
                  id="club_contact_website"
                  type="url"
                  placeholder="https://www.tt-verein.de"
                  value={contactSettings.contact_website}
                  onChange={(event) => handleChange("contact_website", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="club_contact_facebook">Facebook</Label>
                <Input
                  id="club_contact_facebook"
                  type="url"
                  placeholder="https://www.facebook.com/ttverein"
                  value={contactSettings.contact_facebook}
                  onChange={(event) => handleChange("contact_facebook", event.target.value)}
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Vorstandsrollen</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {boardFieldConfig.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        placeholder={`${field.label} (Name oder Kontakt)`}
                        value={contactSettings[field.key]}
                        onChange={(event) => handleBoardFieldChange(field.key, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold">Funktionen</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_feedback">Verbesserungen & Feedback anzeigen</Label>
                    <p className="text-sm text-muted-foreground">
                      Zeigt den Menüpunkt "Verbesserungen" für alle Mitglieder an
                    </p>
                  </div>
                  <Switch
                    id="show_feedback"
                    checked={contactSettings.show_feedback_section}
                    onCheckedChange={(checked) => handleChange("show_feedback_section", checked)}
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Speichern..." : "Kontaktdaten speichern"}
              </Button>
            </div>

            <div className="space-y-4 rounded-lg border bg-muted/20 p-6">
              <h3 className="font-semibold text-foreground">Vorschau Vereinsinfo</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Adresse</p>
                    <p className="whitespace-pre-line">
                      {contactSettings.contact_address || "Noch keine Adresse hinterlegt"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">E-Mail</p>
                    <p>{contactSettings.contact_email || "Noch keine E-Mail hinterlegt"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Telefon</p>
                    <p>{contactSettings.contact_phone || "Noch keine Telefonnummer hinterlegt"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Webseite</p>
                    <p>{contactSettings.contact_website || "Noch keine Webseite hinterlegt"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Facebook className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Facebook</p>
                    <p>{contactSettings.contact_facebook || "Noch keine Facebook-Seite hinterlegt"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="mt-1 h-4 w-4 text-primary" />
                  <div className="w-full space-y-2">
                    <p className="font-medium text-foreground">Vorstandsrollen</p>
                    <div className="grid gap-2 text-xs md:grid-cols-2">
                      {boardPreviewEntries.map((entry) => (
                        <div key={entry.label} className="rounded-md border border-border/40 bg-background p-2">
                          <p className="font-semibold text-foreground">{entry.label}</p>
                          <p className="text-muted-foreground">
                            {entry.value || "Noch keine Informationen hinterlegt"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {(websiteLink || facebookLink) && (
                  <div className="pt-2 text-xs">
                    <span className="text-muted-foreground">Öffentliche Links:</span>
                    <div className="flex flex-col gap-1">
                      {websiteLink && (
                        <a href={websiteLink} target="_blank" rel="noreferrer" className="text-primary underline">
                          {websiteLink}
                        </a>
                      )}
                      {facebookLink && (
                        <a href={facebookLink} target="_blank" rel="noreferrer" className="text-primary underline">
                          {facebookLink}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
