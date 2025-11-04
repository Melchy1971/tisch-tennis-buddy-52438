import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  ListPlus,
  Mail,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";

interface DistributionList {
  id: string;
  name: string;
  groups: string[];
  manualEmails: string[];
}

const availableGroups = [
  {
    id: "board",
    label: "Vorstand",
    description: "Alle Mitglieder mit Vorstandsrollen.",
  },
  {
    id: "admins",
    label: "Administratoren",
    description: "Vereinsweite Administratoren für Verwaltung & Technik.",
  },
  {
    id: "coaches",
    label: "Trainer",
    description: "Trainer*innen und Mannschaftsführer.",
  },
  {
    id: "players",
    label: "Aktive Spieler",
    description: "Alle gemeldeten Spielerinnen und Spieler.",
  },
  {
    id: "youth",
    label: "Jugend",
    description: "Nachwuchsspieler inklusive Elternverteiler.",
  },
  {
    id: "sponsors",
    label: "Sponsoren",
    description: "Kontaktadressen von Partnern und Sponsoren.",
  },
];

export const BoardEmailManager = () => {
  const { toast } = useToast();
  const [distributionName, setDistributionName] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualEmailInput, setManualEmailInput] = useState("");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [distributions, setDistributions] = useState<DistributionList[]>([]);
  const [selectedDistribution, setSelectedDistribution] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendCopy, setSendCopy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistributions();
  }, []);

  const fetchDistributions = async () => {
    try {
      const { data, error } = await supabase
        .from('email_distribution_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: DistributionList[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        groups: item.groups || [],
        manualEmails: item.manual_emails || []
      }));

      setDistributions(formattedData);
    } catch (error) {
      console.error('Error fetching distributions:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Die Verteiler konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const distributionPreview = useMemo(() => {
    if (!selectedDistribution) return null;
    return distributions.find((distribution) => distribution.id === selectedDistribution) ?? null;
  }, [selectedDistribution, distributions]);

  const handleToggleGroup = (groupId: string, checked: boolean | string) => {
    if (checked) {
      setSelectedGroups((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));
    } else {
      setSelectedGroups((prev) => prev.filter((group) => group !== groupId));
    }
  };

  const handleAddManualEmail = () => {
    const trimmed = manualEmailInput.trim();
    if (!trimmed) return;

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(trimmed)) {
      toast({
        title: "Ungültige E-Mail-Adresse",
        description: "Bitte geben Sie eine gültige Adresse im Format name@example.de ein.",
        variant: "destructive",
      });
      return;
    }

    setManualEmails((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setManualEmailInput("");
  };

  const handleRemoveManualEmail = (email: string) => {
    setManualEmails((prev) => prev.filter((item) => item !== email));
  };

  const resetDistributionForm = () => {
    setDistributionName("");
    setSelectedGroups([]);
    setManualEmails([]);
  };

  const handleCreateDistribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!distributionName.trim()) {
      toast({
        title: "Name erforderlich",
        description: "Bitte vergeben Sie einen Namen für den Verteiler.",
        variant: "destructive",
      });
      return;
    }

    if (selectedGroups.length === 0 && manualEmails.length === 0) {
      toast({
        title: "Keine Empfänger ausgewählt",
        description: "Wählen Sie mindestens eine Gruppe oder fügen Sie E-Mail-Adressen hinzu.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Nicht angemeldet",
          description: "Sie müssen angemeldet sein, um Verteiler zu erstellen.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('email_distribution_lists')
        .insert({
          name: distributionName.trim(),
          groups: selectedGroups,
          manual_emails: manualEmails,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Verteiler gespeichert",
        description: `Der Verteiler "${distributionName.trim()}" wurde erfolgreich gesichert.`,
      });

      resetDistributionForm();
      fetchDistributions();
    } catch (error) {
      console.error('Error creating distribution:', error);
      toast({
        title: "Fehler beim Speichern",
        description: "Der Verteiler konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDistribution = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_distribution_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedDistribution === id) {
        setSelectedDistribution("");
      }

      toast({
        title: "Verteiler gelöscht",
        description: "Der ausgewählte Verteiler wurde entfernt.",
      });

      fetchDistributions();
    } catch (error) {
      console.error('Error deleting distribution:', error);
      toast({
        title: "Fehler beim Löschen",
        description: "Der Verteiler konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedDistribution) {
      toast({
        title: "Verteiler auswählen",
        description: "Bitte wählen Sie einen Verteiler aus, bevor Sie die Nachricht versenden.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Pflichtfelder ausfüllen",
        description: "Betreff und Nachricht dürfen nicht leer sein.",
        variant: "destructive",
      });
      return;
    }

    const copyNote = sendCopy
      ? " Eine Kopie wird zusätzlich an die eigene Vereinsadresse gesendet."
      : "";

    toast({
      title: "Nachricht vorbereitet",
      description: `Ihre Nachricht an den Verteiler "${distributionPreview?.name ?? selectedDistribution}" ist fertig zur Übergabe an den Versanddienst.${copyNote}`,
    });

    setSubject("");
    setMessage("");
    setSendCopy(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          E-Mail Versand organisieren
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Legen Sie individuelle Verteiler für unterschiedliche Zielgruppen an und verfassen Sie anschließend
          zielgerichtete Nachrichten. Der Versand erfolgt über die in den Einstellungen hinterlegte E-Mail-Infrastruktur.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-sport">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListPlus className="w-5 h-5" />
              Verteiler anlegen
            </CardTitle>
            <CardDescription>
              Bündeln Sie Rollen, Mannschaften oder externe Kontakte zu wiederverwendbaren Verteilerlisten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={handleCreateDistribution}>
              <div className="space-y-2">
                <Label htmlFor="distribution-name">Name des Verteilers*</Label>
                <Input
                  id="distribution-name"
                  value={distributionName}
                  onChange={(event) => setDistributionName(event.target.value)}
                  placeholder="z.B. Jugendtrainer, Sponsoren, Mannschaft 1"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Rollen & Gruppen</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableGroups.map((group) => {
                    const checked = selectedGroups.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        className={`flex gap-3 rounded-md border p-3 transition hover:border-primary/60 hover:bg-primary/5 ${
                          checked ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => handleToggleGroup(group.id, value)}
                          aria-label={`${group.label} auswählen`}
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{group.label}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{group.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-email">Weitere E-Mail-Adressen</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="manual-email"
                    type="email"
                    value={manualEmailInput}
                    onChange={(event) => setManualEmailInput(event.target.value)}
                    placeholder="kontakt@example.de"
                  />
                  <Button type="button" variant="secondary" className="sm:w-auto" onClick={handleAddManualEmail}>
                    <Plus className="w-4 h-4 mr-2" />
                    Hinzufügen
                  </Button>
                </div>
                {manualEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {manualEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1 pr-1">
                        <span>{email}</span>
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-muted"
                          onClick={() => handleRemoveManualEmail(email)}
                          aria-label={`${email} entfernen`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-gradient-primary hover:bg-primary-hover">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verteiler speichern
                </Button>
              </div>
            </form>

            {distributions.length > 0 ? (
              <div className="space-y-3">
                <Separator />
                <p className="text-sm font-medium text-foreground">Vorhandene Verteiler</p>
                <div className="space-y-2">
                  {distributions.map((distribution) => (
                    <div
                      key={distribution.id}
                      className="rounded-md border border-border/60 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{distribution.name}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {distribution.groups.map((group) => {
                            const groupInfo = availableGroups.find((item) => item.id === group);
                            return (
                              <Badge key={group} variant="outline">
                                {groupInfo?.label ?? group}
                              </Badge>
                            );
                          })}
                          {distribution.manualEmails.map((email) => (
                            <Badge key={email} variant="outline">
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDistribution(distribution.id)}
                      >
                        Entfernen
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch keine Verteiler gespeichert. Legen Sie den ersten Verteiler über das Formular oben an.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sport">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Nachricht verfassen
            </CardTitle>
            <CardDescription>
              Schreiben Sie eine neue Nachricht und wählen Sie den passenden Verteiler für den Versand.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleSendMessage}>
              <div className="space-y-2">
                <Label htmlFor="distribution-select">Verteiler auswählen*</Label>
                <Select
                  value={selectedDistribution}
                  onValueChange={(value) => setSelectedDistribution(value)}
                >
                  <SelectTrigger id="distribution-select">
                    <SelectValue placeholder="Bitte Verteiler wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributions.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        Noch keine Verteiler vorhanden
                      </SelectItem>
                    ) : (
                      distributions.map((distribution) => (
                        <SelectItem key={distribution.id} value={distribution.id}>
                          {distribution.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {distributionPreview && (
                <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Users className="w-3 h-3" />
                    {distributionPreview.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {distributionPreview.groups.map((group) => {
                      const groupInfo = availableGroups.find((item) => item.id === group);
                      return (
                        <Badge key={group} variant="outline">
                          {groupInfo?.label ?? group}
                        </Badge>
                      );
                    })}
                    {distributionPreview.manualEmails.length > 0 && (
                      <Badge variant="outline">
                        +{distributionPreview.manualEmails.length} weitere Empfänger
                      </Badge>
                    )}
                  </div>
                  <p>
                    Die Nachricht wird an alle Mitglieder der ausgewählten Gruppen sowie zusätzliche Adressen versendet.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email-subject">Betreff*</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Betreff eingeben"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-message">Nachricht*</Label>
                <Textarea
                  id="email-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Nachricht erfassen"
                  rows={10}
                  required
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={sendCopy}
                  onCheckedChange={(value) => setSendCopy(Boolean(value))}
                />
                <span>Kopie der Nachricht an die eigene Vereinsadresse senden</span>
              </label>

              <div className="flex justify-end">
                <Button type="submit" disabled={distributions.length === 0} className="bg-gradient-primary hover:bg-primary-hover">
                  <Send className="w-4 h-4 mr-2" />
                  Nachricht vorbereiten
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
};
