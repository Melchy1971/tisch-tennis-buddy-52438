import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Info as InfoIcon,
  Code,
  Heart,
  Github,
  BookOpen,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Facebook,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/tischtennis-buddy-logo.png";
import userManualContent from "../../BENUTZERHANDBUCH.md?raw";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ExtraView = "tool" | "docs" | null;

type ClubInfoRow = {
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
};

const CLUB_INFO_COLUMNS =
  "contact_email, contact_phone, contact_address, contact_website, contact_facebook, " +
  "board_chairman, board_deputy, board_treasurer, board_secretary, board_youth_leader";

export const Info = () => {
  const [activeView, setActiveView] = useState<ExtraView>(null);
  const [clubInfo, setClubInfo] = useState<ClubInfoRow | null>(null);
  const [loadingClubInfo, setLoadingClubInfo] = useState(true);
  const [clubInfoError, setClubInfoError] = useState(false);

  const manualElements = useMemo(() => {
    const lines = userManualContent.split(/\r?\n/);
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];

    const flushList = (keyPrefix: string) => {
      if (listItems.length === 0) return;

      elements.push(
        <ul key={`${keyPrefix}-list`} className="list-disc pl-6 space-y-1">
          {listItems.map((item, index) => (
            <li key={`${keyPrefix}-item-${index}`} className="text-sm leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    };

    lines.forEach((line, index) => {
      const key = `manual-${index}`;
      if (!line.trim()) {
        flushList(key);
        return;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushList(key);
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeadingTag key={key} className="font-semibold text-foreground mt-4 first:mt-0">
            {content}
          </HeadingTag>
        );
        return;
      }

      const bulletMatch = line.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        listItems.push(bulletMatch[1]);
        return;
      }

      flushList(key);
      elements.push(
        <p key={key} className="text-sm leading-relaxed text-muted-foreground">
          {line}
        </p>
      );
    });

    flushList("manual-end");

    return elements;
  }, []);

  useEffect(() => {
    const loadClubInfo = async () => {
      setLoadingClubInfo(true);
      setClubInfoError(false);

      try {
        const { data, error } = await supabase
          .from("club_settings")
          .select(CLUB_INFO_COLUMNS)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        const row = data?.[0] as unknown as ClubInfoRow | undefined;
        setClubInfo(row ?? null);
      } catch (error) {
        console.error("Error loading club info:", error);
        setClubInfo(null);
        setClubInfoError(true);
      } finally {
        setLoadingClubInfo(false);
      }
    };

    void loadClubInfo();
  }, []);

  const boardEntries = useMemo(
    () => [
      { label: "Vorstand", value: clubInfo?.board_chairman?.trim() ?? "" },
      {
        label: "Stellvertretender Vorstand",
        value: clubInfo?.board_deputy?.trim() ?? "",
      },
      { label: "Kassierer", value: clubInfo?.board_treasurer?.trim() ?? "" },
      { label: "Schriftführer", value: clubInfo?.board_secretary?.trim() ?? "" },
      { label: "Jugendleiter/-in", value: clubInfo?.board_youth_leader?.trim() ?? "" },
    ],
    [clubInfo],
  );

  const websiteValue = clubInfo?.contact_website?.trim() ?? "";
  const websiteLink = websiteValue
    ? websiteValue.startsWith("http")
      ? websiteValue
      : `https://${websiteValue}`
    : "";

  const facebookValue = clubInfo?.contact_facebook?.trim() ?? "";
  const facebookLink = facebookValue
    ? facebookValue.startsWith("http")
      ? facebookValue
      : `https://${facebookValue}`
    : "";

  const handleToggle = (view: Exclude<ExtraView, null>) => {
    setActiveView((current) => (current === view ? null : view));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Vereinsinformationen
          </CardTitle>
          <CardDescription>
            Offizielle Kontaktdaten und Vorstandsrollen Ihres Vereins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingClubInfo ? (
            <p className="text-sm text-muted-foreground">Vereinsinformationen werden geladen...</p>
          ) : clubInfoError ? (
            <p className="text-sm text-red-500">
              Die Vereinsinformationen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
            </p>
          ) : clubInfo ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                  <MapPin className="mt-1 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Adresse</p>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {clubInfo.contact_address?.trim() || "Noch keine Adresse hinterlegt"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                  <Mail className="mt-1 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">E-Mail</p>
                    <p className="text-sm text-muted-foreground">
                      {clubInfo.contact_email?.trim() || "Noch keine E-Mail hinterlegt"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                  <Phone className="mt-1 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Telefon</p>
                    <p className="text-sm text-muted-foreground">
                      {clubInfo.contact_phone?.trim() || "Noch keine Telefonnummer hinterlegt"}
                    </p>
                  </div>
                </div>
                <div className="sm:col-span-2 rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="font-medium text-foreground">Online-Präsenz</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      {websiteLink ? (
                        <a
                          href={websiteLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline"
                        >
                          Webseite
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Noch keine Webseite hinterlegt
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-primary" />
                      {facebookLink ? (
                        <a
                          href={facebookLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary underline"
                        >
                          Facebook
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Noch keine Facebook-Seite hinterlegt
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <p className="font-medium text-foreground">Vorstandsrollen</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {boardEntries.map((entry) => (
                    <div key={entry.label} className="rounded-md border border-border/40 bg-background/80 p-3">
                      <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.value || "Noch keine Informationen hinterlegt"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Es sind noch keine Vereinsinformationen hinterlegt. Wenden Sie sich an den Vorstand, um die Daten zu
              ergänzen.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Über dieses Tool</h1>
          <p className="text-muted-foreground">Informationen zum TT Vereinsverwaltungs-Tool</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeView === "tool" ? "default" : "outline"}
              onClick={() => handleToggle("tool")}
            >
              Toolinfo
            </Button>
            <Button
              variant={activeView === "docs" ? "default" : "outline"}
              onClick={() => handleToggle("docs")}
            >
              Dokumentation
            </Button>
          </div>
          <img
            src={logo}
            alt="Tischtennis-Buddy Logo"
            className="w-32 h-32 object-contain opacity-90"
          />
        </div>
      </div>

      {activeView === "tool" && (
        <>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <InfoIcon className="w-5 h-5 text-primary" />
                Was ist dieses Tool?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Das TT Vereinsverwaltungs-Tool ist eine umfassende Web-Anwendung zur Verwaltung von Tischtennis-Vereinen.
                Es wurde entwickelt, um Vereinsmanagern, Vorständen und Mannschaftsführern die tägliche Arbeit zu erleichtern.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2 text-foreground">Funktionen</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Mannschaftsverwaltung und Spielerübersicht</li>
                    <li>• Spielplan-Management mit ICS-Import</li>
                    <li>• Kommunikationstools für Verein und Teams</li>
                    <li>• Vorstandsbereich für wichtige Mitteilungen</li>
                    <li>• Benutzerverwaltung mit Rollensystem</li>
                    <li>• QttrOS-Integration für Spielerstatistiken</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2 text-foreground">Zielgruppe</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Vereinsvorstände</li>
                    <li>• Mannschaftsführer</li>
                    <li>• Vereinsmitglieder</li>
                    <li>• Trainer und Betreuer</li>
                    <li>• Aktive Spieler</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Autor & Entwicklung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Dieses Tool wurde mit Leidenschaft für die Tischtennis-Community entwickelt.
                Die kontinuierliche Weiterentwicklung erfolgt auf Basis von Feedback aus der Praxis
                und den Bedürfnissen echter Tischtennis-Vereine.
              </p>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Entwickler:</strong> Markus Dickscheit<br />
                  <strong className="text-foreground">Version:</strong> 1.0.0<br />
                  <strong className="text-foreground">Letzte Aktualisierung:</strong> 2025
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-green-500" />
                Open Source Projekt
              </CardTitle>
              <CardDescription>
                Freie Software für die Tischtennis-Community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/90 leading-relaxed">
                Dieses Tool ist ein <strong>Open Source Projekt</strong> und steht unter einer freien Lizenz.
                Das bedeutet, dass jeder den Quellcode einsehen, verwenden, modifizieren und verbreiten kann.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Github className="w-5 h-5 text-foreground mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Transparenz</h4>
                    <p className="text-sm text-muted-foreground">
                      Der komplette Quellcode ist öffentlich einsehbar und kann von jedem überprüft werden.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Heart className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Community-Driven</h4>
                    <p className="text-sm text-muted-foreground">
                      Jeder kann zur Verbesserung beitragen - durch Code, Feedback oder Ideen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Code className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Kostenlos</h4>
                    <p className="text-sm text-muted-foreground">
                      Die Nutzung ist komplett kostenfrei - keine versteckten Gebühren oder Premium-Features.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button className="w-full sm:w-auto" variant="outline" asChild>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    Zum GitHub Repository
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Gebaut mit modernen Web-Technologien</p>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>React</span>
                  <span>•</span>
                  <span>TypeScript</span>
                  <span>•</span>
                  <span>Supabase</span>
                  <span>•</span>
                  <span>Tailwind CSS</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeView === "docs" && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Dokumentation
            </CardTitle>
            <CardDescription>Auszug aus dem Benutzerhandbuch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-foreground">{manualElements}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
