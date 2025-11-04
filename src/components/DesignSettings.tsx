import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Palette } from "lucide-react";

interface ClubSettings {
  id: string;
  club_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
}

export const DesignSettings = () => {
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Einstellungen konnten nicht geladen werden",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (field: "primary_color" | "secondary_color", value: string) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const handleClubNameChange = (value: string) => {
    if (settings) {
      setSettings({ ...settings, club_name: value });
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("club_settings")
        .update({
          club_name: settings.club_name,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Gespeichert",
        description: "Design-Einstellungen wurden aktualisiert",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !settings) return;

    // Max size: 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Datei zu groß",
        description: "Das Logo darf maximal 2MB groß sein",
      });
      return;
    }

    setUploading(true);
    try {
      // Delete old logo if exists
      if (settings.logo_url) {
        const oldPath = settings.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("club-logos").remove([oldPath]);
        }
      }

      // Upload new logo
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("club-logos")
        .getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from("club_settings")
        .update({ logo_url: publicUrl })
        .eq("id", settings.id);

      if (updateError) throw updateError;

      setSettings({ ...settings, logo_url: publicUrl });
      toast({
        title: "Logo hochgeladen",
        description: "Das Vereinslogo wurde erfolgreich aktualisiert",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Logo konnte nicht hochgeladen werden",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!settings?.logo_url) return;

    try {
      const filePath = settings.logo_url.split("/").pop();
      if (filePath) {
        await supabase.storage.from("club-logos").remove([filePath]);
      }

      const { error } = await supabase
        .from("club_settings")
        .update({ logo_url: null })
        .eq("id", settings.id);

      if (error) throw error;

      setSettings({ ...settings, logo_url: null });
      toast({
        title: "Logo gelöscht",
        description: "Das Vereinslogo wurde entfernt",
      });
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Logo konnte nicht gelöscht werden",
      });
    }
  };

  if (loading) {
    return <div>Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Vereinseinstellungen
          </CardTitle>
          <CardDescription>
            Verwalten Sie den Vereinsnamen und die Farben Ihres Vereins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="club_name">Vereinsname</Label>
            <Input
              id="club_name"
              type="text"
              value={settings?.club_name || "Tischtennis Verein"}
              onChange={(e) => handleClubNameChange(e.target.value)}
              placeholder="Ihr Vereinsname"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primärfarbe</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={settings?.primary_color || "#DC2626"}
                  onChange={(e) => handleColorChange("primary_color", e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings?.primary_color || "#DC2626"}
                  onChange={(e) => handleColorChange("primary_color", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Sekundärfarbe</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={settings?.secondary_color || "#991B1B"}
                  onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings?.secondary_color || "#991B1B"}
                  onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Wird gespeichert..." : "Einstellungen speichern"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Vereinslogo
          </CardTitle>
          <CardDescription>
            Laden Sie Ihr Vereinslogo hoch (max. 2MB, empfohlen: 200x200px)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.logo_url && (
            <div className="flex items-center gap-4">
              <img
                src={settings.logo_url}
                alt="Vereinslogo"
                className="w-32 h-32 object-contain border rounded"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteLogo}
              >
                <X className="w-4 h-4 mr-2" />
                Logo löschen
              </Button>
            </div>
          )}

          <div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-muted-foreground mt-2">Wird hochgeladen...</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
