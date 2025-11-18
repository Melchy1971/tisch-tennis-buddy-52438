import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Cookie, Settings, X } from "lucide-react";

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookie-consent", JSON.stringify(prefs));
    localStorage.setItem("cookie-consent-timestamp", new Date().toISOString());
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const acceptNecessary = () => {
    savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none"
      role="region"
      aria-label="Cookie-Einstellungen"
    >
      <Card className="w-full max-w-2xl pointer-events-auto shadow-lg border-border/50 bg-background/95 backdrop-blur">
        {!showSettings ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Cookie className="w-6 h-6 text-primary flex-shrink-0 mt-1" aria-hidden="true" />
              <div className="flex-1 space-y-2">
                <h2 className="text-lg font-semibold" id="cookie-banner-title">
                  Cookies und Datenschutz
                </h2>
                <p className="text-sm text-muted-foreground">
                  Wir verwenden Cookies, um Ihre Erfahrung zu verbessern und unsere Website zu optimieren. 
                  Einige Cookies sind für die Funktionalität der Website erforderlich, während andere uns helfen, 
                  Ihre Präferenzen zu verstehen und die Leistung zu analysieren.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={acceptAll}
                className="flex-1"
                aria-label="Alle Cookies akzeptieren"
              >
                Alle akzeptieren
              </Button>
              <Button
                onClick={acceptNecessary}
                variant="outline"
                className="flex-1"
                aria-label="Nur notwendige Cookies akzeptieren"
              >
                Nur notwendige
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="ghost"
                className="gap-2"
                aria-label="Cookie-Einstellungen anpassen"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
                Einstellungen
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4" role="dialog" aria-labelledby="cookie-settings-title">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" id="cookie-settings-title">
                Cookie-Einstellungen
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(false)}
                aria-label="Einstellungen schließen"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Checkbox
                    id="necessary"
                    checked={preferences.necessary}
                    disabled
                    aria-describedby="necessary-description"
                  />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="necessary" className="font-medium cursor-pointer">
                      Notwendige Cookies (erforderlich)
                    </Label>
                    <p className="text-xs text-muted-foreground" id="necessary-description">
                      Diese Cookies sind für die grundlegende Funktionalität der Website erforderlich.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <Checkbox
                    id="functional"
                    checked={preferences.functional}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, functional: checked as boolean })
                    }
                    aria-describedby="functional-description"
                  />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="functional" className="font-medium cursor-pointer">
                      Funktionale Cookies
                    </Label>
                    <p className="text-xs text-muted-foreground" id="functional-description">
                      Ermöglichen erweiterte Funktionen und Personalisierung.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <Checkbox
                    id="analytics"
                    checked={preferences.analytics}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, analytics: checked as boolean })
                    }
                    aria-describedby="analytics-description"
                  />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="analytics" className="font-medium cursor-pointer">
                      Analyse-Cookies
                    </Label>
                    <p className="text-xs text-muted-foreground" id="analytics-description">
                      Helfen uns zu verstehen, wie Besucher mit der Website interagieren.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <Checkbox
                    id="marketing"
                    checked={preferences.marketing}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, marketing: checked as boolean })
                    }
                    aria-describedby="marketing-description"
                  />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="marketing" className="font-medium cursor-pointer">
                      Marketing-Cookies
                    </Label>
                    <p className="text-xs text-muted-foreground" id="marketing-description">
                      Werden verwendet, um Besuchern relevante Werbung anzuzeigen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={saveCustom} className="flex-1">
                  Auswahl speichern
                </Button>
                <Button onClick={acceptAll} variant="outline" className="flex-1">
                  Alle akzeptieren
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
