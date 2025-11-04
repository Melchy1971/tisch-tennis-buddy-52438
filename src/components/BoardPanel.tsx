import { useState, useEffect, FormEvent, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Edit2, FileText, ImageIcon, List, Loader2, Mail, Megaphone, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { MembersList } from "./MembersList";
import { BoardEmailManager } from "./BoardEmailManager";
import { QttrDownloadSection } from "./QttrDownloadSection";
import { ActivePlayersList } from "./ActivePlayersList";
import { checkPermission, getUserPermissions, Permissions } from "@/lib/permissions";
import { handleError, withErrorHandling } from "@/lib/error-handling";
import { db } from "@/lib/database-helpers";
import { MemberAnniversaryList } from "./MemberAnniversaryList";
import { VolleyballMembersList } from "./VolleyballMembersList";
import { z } from "zod";
import { commonRules, fileValidationRules, getValidationError } from "@/lib/validation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BoardMessage {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface BoardFlyer {
  id: string;
  title: string;
  image_path: string;
  image_name: string;
  image_type: string | null;
  image_size: number | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
}

interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface BoardDocument {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

// Helper functions for content validation
const containsRepetitiveCharacters = (text: string): boolean => {
  // Prüft auf wiederholende Zeichen und Muster
  if (/(.)\1{4,}/.test(text)) return true; // 5 or more of the same character
  if (/(.{2,})\1{2,}/.test(text)) return true; // Repeated pattern of 2+ chars
  return false;
};

const hasProperSentenceStructure = (text: string): boolean => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  return sentences.every(sentence => {
    const words = sentence.trim().split(/\s+/);
    // Prüft Großschreibung und minimale Satzstruktur
    return words[0] && 
           words[0].charAt(0).toUpperCase() === words[0].charAt(0) &&
           words.length >= 2; // Mindestens Subjekt und Prädikat
  });
};

// Kategorisierung von Tischtennis-Inhalten
interface ContentCategory {
  keywords: string[];
  requiredKeywords?: string[];
  minKeywords: number;
}

const contentCategories: Record<string, ContentCategory> = {
  training: {
    keywords: [
      'training', 'übung', 'technik', 'taktik', 'koordination',
      'aufwärmen', 'fitness', 'kondition', 'gruppe', 'einzeltraining',
      'jugendtraining', 'erwachsenentraining', 'anfänger', 'fortgeschrittene'
    ],
    minKeywords: 1
  },
  wettkampf: {
    keywords: [
      'turnier', 'liga', 'spiel', 'match', 'punktspiel', 'meisterschaft',
      'bezirksliga', 'kreisliga', 'verbandsliga', 'regionalliga', 'bundesliga',
      'pokal', 'rangliste', 'qualifikation', 'aufstieg', 'abstieg'
    ],
    minKeywords: 1
  },
  technik: {
    keywords: [
      'aufschlag', 'rückhand', 'vorhand', 'schuss', 'block', 'spin',
      'topspin', 'unterschnitt', 'sidespinaufschlag', 'konter', 'schupfball',
      'flip', 'loop', 'smash', 'ballonabwehr', 'pushing'
    ],
    minKeywords: 2
  },
  ausruestung: {
    keywords: [
      'schläger', 'belag', 'holz', 'tisch', 'netz', 'ball',
      'plastikball', 'zelluloidball', 'spielbox', 'zählgerät', 'handtuchbox',
      'trainingsroboter', 'ballmaschine', 'spielerbank', 'umrandung'
    ],
    minKeywords: 1
  },
  organisation: {
    keywords: [
      'versammlung', 'sitzung', 'vorstand', 'abteilung', 'mitglied',
      'beitrag', 'anmeldung', 'abmeldung', 'termin', 'planung',
      'mannschaftsführer', 'sportwart', 'jugendwart', 'kassierer'
    ],
    minKeywords: 1
  },
  social: {
    keywords: [
      'feier', 'fest', 'jubiläum', 'ehrung', 'auszeichnung',
      'vereinsabend', 'stammtisch', 'ausflug', 'weihnachtsfeier',
      'sommerfest', 'grillabend', 'teambuilding'
    ],
    minKeywords: 1
  },
  jugend: {
    keywords: [
      'jugend', 'schüler', 'bambini', 'mini', 'nachwuchs',
      'talent', 'förderung', 'jungen', 'mädchen', 'eltern',
      'schulkooperation', 'schnuppertraining', 'ferienprogramm'
    ],
    minKeywords: 1
  },
  wartung: {
    keywords: [
      'reinigung', 'reparatur', 'wartung', 'pflege', 'aufbau',
      'abbau', 'inventur', 'bestellung', 'material', 'ersatz',
      'hallennutzung', 'schlüssel', 'beleuchtung', 'heizung'
    ],
    minKeywords: 1
  }
};

const isTextRelevantToTischTennis = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Prüfe auf allgemeine TT-Begriffe
  const generalTerms = ['tischtennis', 'tt', 'ping.?pong', 'tischtennisclub', 'ttc'];
  if (generalTerms.some(term => new RegExp(term, 'i').test(text))) {
    return true;
  }

  // Zähle Treffer in jeder Kategorie
  let categoryMatches = 0;
  for (const category of Object.values(contentCategories)) {
    const matchingKeywords = category.keywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    // Wenn genügend Keywords gefunden wurden
    if (matchingKeywords.length >= category.minKeywords) {
      categoryMatches++;
      
      // Wenn Pflichtkeywords definiert sind, prüfe diese
      if (category.requiredKeywords && 
          category.requiredKeywords.some(keyword => 
            lowerText.includes(keyword.toLowerCase())
          )) {
        return true;
      }
    }

    // Wenn mehrere Kategorien matchen, ist der Text relevant
    if (categoryMatches >= 2) {
      return true;
    }
  }

  return false;
};

const containsCommonSpamWords = (text: string): boolean => {
  const spamPatterns = [
    // Werbung und Marketing
    /(?:kosten|gratis|kostenlos|geschenk).*(?:angebot|aktion)/i,
    /(?:gewinn|preis|chance).*(?:garantiert|sicher)/i,
    /(?:\d+%.*rabatt|spare.*jetzt)/i,
    // Verdächtige Formulierungen
    /(?:nur.*heute|limitiert|exklusiv).*(?:angebot|deal)/i,
    /(?:klick|klicke).*(?:hier|jetzt|link)/i,
    /(?:verdiene|verdienen).*(?:geld|euro|online)/i,
    // Spam-typische Muster
    /[!?]{3,}/,  // Übermäßige Satzzeichen
    /[A-Z\s]{10,}/,  // Übermäßige Großschreibung
    /(?:€|\$)[0-9]+(?:\.|\s)?[0-9]*/,  // Geldbeträge
    // Externe Links und Werbung
    /(?:casino|wette|lotto|poker|betting)/i,
    /(?:affiliate|partner|sponsor).*(?:link|angebot)/i
  ];
  return spamPatterns.some(pattern => pattern.test(text));
};

const hasBalancedParentheses = (text: string): boolean => {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '„': '"', '«': '»' };
  const openBrackets = Object.keys(pairs);
  const closeBrackets = Object.values(pairs);
  
  for (const char of text) {
    if (openBrackets.includes(char)) {
      stack.push(char);
    } else if (closeBrackets.includes(char)) {
      const last = stack.pop();
      const expected = Object.entries(pairs).find(([_, close]) => close === char)?.[0];
      if (!last || last !== expected) return false;
    }
  }
  
  return stack.length === 0;
};

const hasTooManyUrls = (text: string): boolean => {
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|\[url\]|\[link\]|(?:[\w-]+\.)+(?:com|de|org|net|info)/gi;
  const urlCount = (text.match(urlPattern) || []).length;
  return urlCount > 2;
};

const validateImageDimensions = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      // Prüfe auf sinnvolle Dimensionen für Flyer (mindestens 500px, maximal 4000px)
      const isValidDimensions = img.width >= 500 && img.width <= 4000 && 
                              img.height >= 500 && img.height <= 4000;
      // Prüfe auf sinnvolles Seitenverhältnis (nicht zu extrem)
      const isValidRatio = aspectRatio >= 0.5 && aspectRatio <= 2.0;
      resolve(isValidDimensions && isValidRatio);
    };
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
};

const isValidEventDateTime = (date: string): boolean => {
  const eventDate = new Date(date);
  const hour = eventDate.getHours();
  const minutes = eventDate.getMinutes();
  const dayOfWeek = eventDate.getDay();
  
  // Prüfe ob die Zeit innerhalb der Öffnungszeiten liegt
  const isWithinOpeningHours = hour >= 8 && hour <= 22;
  
  // Prüfe ob die Zeit auf einer sinnvollen Viertelstunde liegt
  const isValidMinutes = minutes % 15 === 0;
  
  // Prüfe ob es ein regulärer Trainingstag ist (Mo-Fr)
  const isRegularDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  
  return isWithinOpeningHours && isValidMinutes && isRegularDay;
};

// Validation schemas
const messageSchema = z.object({
  title: commonRules.title
    .regex(/^[^<>{}[\]\\|]*$/, "Der Titel darf keine Sonderzeichen wie <, >, {, }, [, ], \\ oder | enthalten")
    .refine(
      (title) => !title.includes("script"),
      "Der Titel darf nicht das Wort 'script' enthalten"
    )
    .refine(
      (title) => !containsRepetitiveCharacters(title),
      "Der Titel enthält zu viele wiederholende Zeichen"
    )
    .refine(
      (title) => !containsCommonSpamWords(title),
      "Der Titel enthält nicht erlaubte Werbewörter"
    )
    .refine(
      (title) => {
        const words = title.split(/\s+/);
        return words.length >= 3 && words.length <= 15;
      },
      "Der Titel sollte zwischen 3 und 15 Wörter enthalten"
    )
    .refine(
      (title) => isTextRelevantToTischTennis(title),
      "Der Titel sollte einen Bezug zum Tischtennis oder Vereinsleben haben"
    ),
  content: commonRules.content
    .min(10, "Der Inhalt muss mindestens 10 Zeichen lang sein")
    .refine(
      (content) => content.split(/\s+/).length >= 3,
      "Der Inhalt muss mindestens drei Wörter enthalten"
    )
    .refine(
      (content) => !content.includes("script"),
      "Der Inhalt darf nicht das Wort 'script' enthalten"
    )
    .refine(
      (content) => !containsRepetitiveCharacters(content),
      "Der Inhalt enthält zu viele wiederholende Zeichen"
    )
    .refine(
      (content) => hasProperSentenceStructure(content),
      "Jeder Satz sollte mit einem Großbuchstaben beginnen und mindestens zwei Wörter enthalten"
    )
    .refine(
      (content) => !containsCommonSpamWords(content),
      "Der Inhalt enthält nicht erlaubte Werbewörter oder verdächtige Muster"
    )
    .refine(
      (content) => hasBalancedParentheses(content),
      "Alle Klammern und Anführungszeichen müssen korrekt geschlossen werden"
    )
    .refine(
      (content) => !hasTooManyUrls(content),
      "Der Inhalt darf maximal 2 URLs oder Website-Referenzen enthalten"
    )
    .refine(
      (content) => content.split(/\s+/).length <= 500,
      "Der Inhalt sollte nicht mehr als 500 Wörter enthalten"
    )
    .refine(
      (content) => isTextRelevantToTischTennis(content),
      "Der Inhalt sollte einen Bezug zum Tischtennis oder Vereinsleben haben"
    )
    .refine(
      (content) => {
        const paragraphs = content.split(/\n\s*\n/);
        return paragraphs.length >= 1 && paragraphs.length <= 10;
      },
      "Der Text sollte zwischen 1 und 10 Absätze haben"
    ),
});

const flyerSchema = z.object({
  title: commonRules.title
    .regex(/^[^<>{}[\]\\|]*$/, "Der Titel darf keine Sonderzeichen wie <, >, {, }, [, ], \\ oder | enthalten")
    .refine(
      (title) => title.length >= 5,
      "Der Titel muss mindestens 5 Zeichen lang sein"
    )
    .refine(
      (title) => !containsRepetitiveCharacters(title),
      "Der Titel enthält zu viele wiederholende Zeichen"
    )
    .refine(
      (title) => !containsCommonSpamWords(title),
      "Der Titel enthält nicht erlaubte Werbewörter"
    )
    .refine(
      (title) => {
        const words = title.split(/\s+/);
        return words.length >= 2 && words.length <= 10;
      },
      "Der Titel sollte zwischen 2 und 10 Wörter enthalten"
    )
    .refine(
      (title) => /^[A-ZÄÖÜ]/.test(title),
      "Der Titel muss mit einem Großbuchstaben beginnen"
    )
    .refine(
      (title) => isTextRelevantToTischTennis(title),
      "Der Titel sollte einen Bezug zum Tischtennis oder Vereinsleben haben"
    ),
  file: z.custom<File>((file) => file instanceof File, {
    message: "Eine Bilddatei ist erforderlich",
  })
  .refine((file) => {
    if (!file) return false;
    return file.size <= fileValidationRules.maxSize;
  }, `Datei darf maximal ${fileValidationRules.maxSize / (1024 * 1024)}MB groß sein`)
  .refine((file) => {
    if (!file) return false;
    return ['image/jpeg', 'image/png'].includes(file.type);
  }, "Nur JPEG und PNG Dateien sind erlaubt")
  .refine(async (file) => {
    if (!file) return false;
    return await validateImageDimensions(file);
  }, "Das Bild muss mindestens 500x500 Pixel und maximal 4000x4000 Pixel groß sein, mit einem Seitenverhältnis zwischen 1:2 und 2:1")
  .refine((file) => {
    if (!file) return false;
    return file.size >= 1024; // Mindestens 1KB
  }, "Die Datei ist zu klein. Minimum: 1KB")
  .refine((file) => {
    if (!file) return false;
    return ['image/jpeg', 'image/png'].includes(file.type);
  }, "Nur JPEG und PNG Dateien sind erlaubt")
  .refine((file) => {
    if (!file) return false;
    return file.size >= 1024; // Mindestens 1KB
  }, "Die Datei ist zu klein. Minimum: 1KB")
  .refine((file) => {
    // Validiere Dateinamen
    const filename = file.name.toLowerCase();
    const forbiddenPrefixes = ['screenshot', 'bild', 'img', 'pic', 'foto', 'image', 'whatsapp'];
    return !forbiddenPrefixes.some(prefix => filename.includes(prefix));
  }, "Bitte geben Sie dem Bild einen beschreibenden Namen")
  .refine((file) => {
    // Prüfe auf sinnvolle Dateinamenslänge
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    return nameWithoutExt.length >= 3 && nameWithoutExt.length <= 50;
  }, "Der Dateiname (ohne Endung) sollte zwischen 3 und 50 Zeichen lang sein")
  .refine((file) => {
    // Prüfe auf gültige Dateinamenszeichen
    return /^[a-zA-Z0-9\-_äöüÄÖÜß\s]+\.[a-zA-Z]+$/.test(file.name);
  }, "Der Dateiname darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten"),
});

// Helper for weekday and holiday validation
const isWeekendOrHoliday = (date: Date): boolean => {
  // Wochenende
  if (date.getDay() === 0 || date.getDay() === 6) return true;

  // Feiertage 2025 (beispielhaft)
  const holidays = [
    '2025-01-01', // Neujahr
    '2025-04-18', // Karfreitag
    '2025-04-21', // Ostermontag
    '2025-05-01', // Tag der Arbeit
    '2025-05-29', // Christi Himmelfahrt
    '2025-06-09', // Pfingstmontag
    '2025-10-03', // Tag der Deutschen Einheit
    '2025-12-25', // 1. Weihnachtstag
    '2025-12-26', // 2. Weihnachtstag
  ];

  const dateStr = date.toISOString().split('T')[0];
  return holidays.includes(dateStr);
};

const eventSchema = z.object({
  title: commonRules.title
    .regex(/^[^<>{}[\]\\|]*$/, "Der Titel darf keine Sonderzeichen wie <, >, {, }, [, ], \\ oder | enthalten")
    .refine(
      (title) => title.length >= 5,
      "Der Titel muss mindestens 5 Zeichen lang sein"
    )
    .refine(
      (title) => !containsRepetitiveCharacters(title),
      "Der Titel enthält zu viele wiederholende Zeichen"
    )
    .refine(
      (title) => !containsCommonSpamWords(title),
      "Der Titel enthält nicht erlaubte Werbewörter"
    )
    .refine(
      (title) => /^[A-ZÄÖÜ]/.test(title),
      "Der Titel muss mit einem Großbuchstaben beginnen"
    )
    .refine(
      (title) => {
        const words = title.split(/\s+/);
        const hasEventWord = words.some(word => 
          ['turnier', 'spiel', 'training', 'versammlung', 'sitzung', 'treffen'].some(
            eventWord => word.toLowerCase().includes(eventWord)
          )
        );
        return hasEventWord;
      },
      "Der Titel sollte die Art der Veranstaltung enthalten (z.B. Turnier, Spiel, Training, etc.)"
    ),
  description: commonRules.description
    .refine(
      (desc) => !desc || desc.split(/\s+/).length >= 5,
      "Die Beschreibung muss mindestens fünf Wörter enthalten"
    )
    .refine(
      (desc) => !desc || hasProperSentenceStructure(desc),
      "Jeder Satz sollte mit einem Großbuchstaben beginnen"
    )
    .refine(
      (desc) => !desc || !containsRepetitiveCharacters(desc),
      "Die Beschreibung enthält zu viele wiederholende Zeichen"
    )
    .refine(
      (desc) => !desc || !hasTooManyUrls(desc),
      "Die Beschreibung darf maximal 2 URLs enthalten"
    )
    .refine(
      (desc) => !desc || desc.split(/\s+/).length <= 200,
      "Die Beschreibung sollte nicht mehr als 200 Wörter enthalten"
    ),
  event_date: commonRules.date
    .refine((date) => {
      if (!date) return false;
      const eventDate = new Date(date);
      const today = new Date();
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(today.getFullYear() + 2);
      return eventDate >= today && eventDate <= twoYearsFromNow;
    }, "Das Datum muss in der Zukunft liegen und darf maximal 2 Jahre in der Zukunft sein")
    .refine((date) => {
      if (!date) return false;
      const eventDate = new Date(date);
      return !isWeekendOrHoliday(eventDate);
    }, "Das Event sollte nicht an einem Wochenende oder Feiertag stattfinden")
    .refine((date) => {
      if (!date) return false;
      const eventDate = new Date(date);
      const hour = eventDate.getHours();
      return hour >= 8 && hour <= 22;
    }, "Das Event sollte zwischen 8:00 und 22:00 Uhr stattfinden"),
  location: z.string()
    .max(200, "Der Ort darf maximal 200 Zeichen lang sein")
    .min(3, "Der Ort muss mindestens 3 Zeichen lang sein")
    .regex(/^[a-zA-ZäöüÄÖÜß\s\-\.,0-9]+$/, "Der Ort darf nur Buchstaben, Zahlen, Punkte, Kommas und Bindestriche enthalten")
    .refine(
      (loc) => !loc || /^[A-ZÄÖÜ]/.test(loc),
      "Der Ortsname muss mit einem Großbuchstaben beginnen"
    )
    .refine(
      (loc) => !loc || !containsRepetitiveCharacters(loc),
      "Der Ortsname enthält zu viele wiederholende Zeichen"
    )
    .optional()
    .transform(val => val === "" ? undefined : val),
});

// Helper für Dokumenttyp-Erkennung
const getDocumentCategory = (title: string): string | null => {
  // Gemeinsame Datums- und Zeitformate
  const datePatterns = {
    fullDate: /(?:\d{2}|\d{1})\.(?:\d{2}|\d{1})\.(?:20\d{2}|\d{2})/,      // 01.01.2025 or 1.1.25
    shortDate: /(?:\d{2}|\d{1})\.(?:\d{2}|\d{1})/,                         // 01.01 or 1.1
    yearMonth: /(?:\d{2}|\d{1})\.(?:20\d{2}|\d{2})/,                      // 01.2025 or 1.25
    fullYear: /(?:20\d{2}|\d{2})/,                                         // 2025 or 25
    season: /(?:Saison|Spielzeit)\s*(?:20\d{2}\/(?:\d{2}|20\d{2}))/,      // Saison 2025/26 or 2025/2026
    weekNumber: /(?:KW|Kalenderwoche)\s*(?:\d{1,2})/,                      // KW 1-53
    quarter: /Q[1-4][\s-]?(?:20\d{2}|\d{2})?/,                            // Q1-2025 or Q1
    monthYear: /(?:Jan(?:uar)?|Feb(?:ruar)?|Mär(?:z)?|Apr(?:il)?|Mai|Jun(?:i)?|Jul(?:i)?|Aug(?:ust)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Dez(?:ember)?)\s*(?:20\d{2}|\d{2})?/i
  };

  // Gemeinsame Formatierungsmuster
  const formatPatterns = {
    version: /[vV](?:\d+\.\d+\.\d+|\d+\.\d+|\d+)/,                        // v1.0.0, V2.1, v3
    revision: /[rR]ev(?:ision)?\s*\d+/,                                    // Rev1, Revision 2
    round: /(?:Runde|Spieltag)\s*\d+/i,                                    // Runde 1, Spieltag 2
    level: /(?:Bezirk|Kreis|Verband|Region)(?:s|es)?(?:liga|klasse)?/i,   // Bezirksliga, Kreisklasse
    group: /Gruppe\s*[A-Z\d]/i                                            // Gruppe A, Gruppe 1
  };

  const categories = {
    spielbericht: {
      keywords: ['spielbericht', 'wettkampf', 'ergebnis', 'spieltag'],
      requiredFormat: new RegExp(
        `^(?:Spielbericht|Ergebnis)` +
        `(?:${formatPatterns.level.source})?` +
        `(?:\\s*${formatPatterns.group.source})?` +
        `.*?` +
        `(?:${datePatterns.fullDate.source}|${formatPatterns.round.source})`
      )
    },
    trainingsdoku: {
      keywords: ['trainingsplan', 'übungssammlung', 'techniktraining'],
      requiredFormat: new RegExp(
        `^(?:Trainingsplan|Übungen|Technik)` +
        `(?:${formatPatterns.version.source})?` +
        `.*?` +
        `(?:${datePatterns.weekNumber.source}|${datePatterns.fullDate.source}|${datePatterns.monthYear.source})`
      )
    },
    protokoll: {
      keywords: ['protokoll', 'besprechung', 'sitzung', 'meeting'],
      requiredFormat: new RegExp(
        `^(?:Protokoll|Besprechung)` +
        `(?:\\s*-\\s*[\\w\\s]+)?` +
        `.*?` +
        `(?:${datePatterns.fullDate.source}|${datePatterns.monthYear.source})`
      )
    },
    mannschaftsmeldung: {
      keywords: ['mannschaftsmeldung', 'aufstellung', 'spielerliste'],
      requiredFormat: new RegExp(
        `^(?:Mannschaftsmeldung|Aufstellung)` +
        `(?:\\s*${formatPatterns.level.source})?` +
        `(?:\\s*${formatPatterns.group.source})?` +
        `.*?` +
        `(?:${datePatterns.season.source}|${datePatterns.fullYear.source}|` +
        `(?:Vor|Rück)runde\\s*${datePatterns.fullYear.source})`
      )
    },
    formular: {
      keywords: ['formular', 'antrag', 'anmeldung', 'registrierung'],
      requiredFormat: new RegExp(
        `^[A-ZÄÖÜ][\\wäöüÄÖÜß\\s-]*` +
        `(?:formular|antrag|anmeldung)` +
        `(?:\\s*${formatPatterns.version.source})?$`,
        'i'
      )
    },
    turnierinfo: {
      keywords: ['turnierausschreibung', 'turnier', 'wettbewerb'],
      requiredFormat: new RegExp(
        `^(?:Turnier|Wettbewerb|Ausschreibung)` +
        `(?:\\s*-\\s*[\\w\\s]+)?` +
        `.*?` +
        `(?:${datePatterns.fullDate.source}|` +
        `${datePatterns.monthYear.source}|` +
        `${datePatterns.shortDate.source}\\.${datePatterns.fullYear.source})`
      )
    },
    anleitung: {
      keywords: ['anleitung', 'guide', 'dokumentation', 'handbuch'],
      requiredFormat: new RegExp(
        `^(?:Anleitung|Guide|Handbuch|Doku)` +
        `(?:\\s*-\\s*[\\w\\s]+)?` +
        `(?:\\s*${formatPatterns.version.source})?` +
        `(?:\\s*Stand:?\\s*${datePatterns.fullDate.source})?`
      )
    },
    bericht: {
      keywords: ['bericht', 'report', 'analyse', 'auswertung'],
      requiredFormat: new RegExp(
        `^(?:Bericht|Analyse|Auswertung)` +
        `(?:\\s*-\\s*[\\w\\s]+)?` +
        `.*?` +
        `(?:${datePatterns.fullDate.source}|` +
        `${datePatterns.weekNumber.source}|` +
        `${datePatterns.quarter.source}|` +
        `${datePatterns.monthYear.source})`
      )
    },
    finanzen: {
      keywords: ['rechnung', 'quittung', 'abrechnung', 'budget'],
      requiredFormat: new RegExp(
        `^(?:Rechnung|Abrechnung|Budget|Quittung)` +
        `(?:\\s*-\\s*[\\w\\s]+)?` +
        `.*?` +
        `(?:${datePatterns.yearMonth.source}|` +
        `${datePatterns.fullYear.source}|` +
        `${datePatterns.quarter.source}|` +
        `${datePatterns.monthYear.source})`
      )
    },
    mitglieder: {
      keywords: ['mitgliederliste', 'kontakte', 'adressliste'],
      requiredFormat: new RegExp(
        `^(?:Mitglieder|Kontakte|Adressen)` +
        `(?:liste|verwaltung)?` +
        `(?:\\s*-\\s*[\\w\\s]+)?` +
        `.*?` +
        `(?:${datePatterns.yearMonth.source}|` +
        `${datePatterns.fullYear.source}|` +
        `Stand:?\\s*${datePatterns.fullDate.source})`
      )
    }
  };

  const lowerTitle = title.toLowerCase();
  for (const [category, config] of Object.entries(categories)) {
    if (config.keywords.some(keyword => lowerTitle.includes(keyword.toLowerCase())) &&
        (!config.requiredFormat || config.requiredFormat.test(title))) {
      return category;
    }
  }
  return null;
};

const documentSchema = z.object({
  title: commonRules.title
    .regex(/^[^<>{}[\]\\|]*$/, "Der Titel darf keine Sonderzeichen wie <, >, {, }, [, ], \\ oder | enthalten")
    .refine(
      (title) => title.length >= 5,
      "Der Titel muss mindestens 5 Zeichen lang sein"
    )
    .refine(
      (title) => !/^\d/.test(title),
      "Der Titel darf nicht mit einer Zahl beginnen"
    )
    .refine(
      (title) => !containsRepetitiveCharacters(title),
      "Der Titel enthält zu viele wiederholende Zeichen"
    )
    .refine(
      (title) => !containsCommonSpamWords(title),
      "Der Titel enthält nicht erlaubte Werbewörter"
    )
    .refine(
      (title) => /^[A-ZÄÖÜ]/.test(title),
      "Der Titel muss mit einem Großbuchstaben beginnen"
    )
    .refine(
      (title) => {
        const words = title.split(/\s+/);
        return words.length >= 3 && words.length <= 15;
      },
      "Der Titel sollte zwischen 3 und 15 Wörter enthalten"
    )
    .refine(
      (title) => getDocumentCategory(title) !== null,
      "Der Titel sollte die Art des Dokuments erkennen lassen (z.B. Protokoll, Formular, Bericht, etc.)"
    ),
  file: z.custom<File>((file) => file instanceof File, {
    message: "Eine Datei ist erforderlich",
  }).refine((file) => {
    if (!file) return false;
    return file.size <= fileValidationRules.maxSize;
  }, `Datei darf maximal ${fileValidationRules.maxSize / (1024 * 1024)}MB groß sein`)
  .refine((file) => {
    if (!file) return false;
    return fileValidationRules.allowedTypes.has(file.type);
  }, "Ungültiger Dateityp")
  .refine((file) => {
    if (!file) return false;
    return file.size >= 1024; // Mindestens 1KB
  }, "Die Datei ist zu klein. Minimum: 1KB")
  .refine((file) => {
    // Erweiterte Dateinamenvalidierung
    const filename = file.name.toLowerCase();
    const forbiddenPrefixes = [
      'dok', 'document', 'unbenannt', 'new', 'neu',
      'final', 'fertig', 'version', 'v1', 'v2', 'v3',
      'copy', 'kopie', 'backup'
    ];
    return !forbiddenPrefixes.some(prefix => filename.startsWith(prefix));
  }, "Bitte geben Sie der Datei einen beschreibenden Namen")
  .refine((file) => {
    // Prüfe auf sinnvolle Dateinamenslänge
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    return nameWithoutExt.length >= 3 && nameWithoutExt.length <= 50;
  }, "Der Dateiname (ohne Endung) sollte zwischen 3 und 50 Zeichen lang sein")
  .refine((file) => {
    // Prüfe auf gültige Dateinamenszeichen
    return /^[a-zA-Z0-9\-_äöüÄÖÜß\s]+\.[a-zA-Z]+$/.test(file.name);
  }, "Der Dateiname darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten")
  .refine((file) => {
    // Prüfe Dateinamen auf Konsistenz mit Titel-Kategorie
    const filename = file.name.toLowerCase();
    const categoryPrefixes = {
      protokoll: ['prot', 'meeting'],
      formular: ['form', 'antrag'],
      bericht: ['bericht', 'report'],
      anleitung: ['guide', 'doku'],
      info: ['info', 'mitteilung']
    };
    
    return Object.values(categoryPrefixes).some(prefixes => 
      prefixes.some(prefix => filename.includes(prefix))
    );
  }, "Der Dateiname sollte die Art des Dokuments widerspiegeln"),
});

export const BoardPanel = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [flyers, setFlyers] = useState<BoardFlyer[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [documents, setDocuments] = useState<BoardDocument[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingFlyers, setLoadingFlyers] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [canManageDocuments, setCanManageDocuments] = useState(false);
  const [canManageMessages, setCanManageMessages] = useState(false);
  const [canManageFlyers, setCanManageFlyers] = useState(false);
  const [canManageEvents, setCanManageEvents] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  const [messageForm, setMessageForm] = useState({
    title: "",
    content: "",
  });
  const [flyerForm, setFlyerForm] = useState({
    title: "",
    file: null as File | null,
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    event_date: "",
    description: "",
    location: "",
  });

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingFlyerId, setEditingFlyerId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [documentForm, setDocumentForm] = useState<{
    title: string;
    file: File | null;
  }>({
    title: "",
    file: null,
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const flyerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeListSection, setActiveListSection] = useState("1");
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string | null>(null);
  const [savingFlyer, setSavingFlyer] = useState(false);

  const listSections = [
    { id: "1", label: "1. QTTR/TTR_Liste" },
    { id: "2", label: "2. Mitgliederliste" },
    { id: "3", label: "3. Aktive Spieler" },
    { id: "4", label: "4. Mitglieder Volleyball" },
    { id: "5", label: "5. Jubiläen" },
    { id: "6", label: "6. Bereich" },
    { id: "7", label: "7. Bereich" },
    { id: "8", label: "8. Bereich" },
    { id: "9", label: "9. Bereich" },
    { id: "10", label: "10. Bereich" },
  ];

  const renderActiveListContent = () => {
    switch (activeListSection) {
      case "1":
        return <QttrDownloadSection />;
      case "2":
        return <MembersList />;
      case "3":
        return <ActivePlayersList />;
      case "4":
        return <VolleyballMembersList />;
      case "5":
        return <MemberAnniversaryList />;
      default:
        return (
          <Card className="shadow-sport border-dashed">
            <CardHeader>
              <CardTitle>Bereich {activeListSection}</CardTitle>
              <CardDescription>
                Für diesen Listenbereich sind derzeit noch keine Inhalte hinterlegt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nutzen Sie diesen Platz zukünftig für weitere Auswertungen oder Exporte.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchFlyers();
    fetchEvents();
    fetchDocuments();
    checkUserPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUserPermissions = async () => {
    const { data: userPermissions } = await withErrorHandling(
      async () => {
        return await getUserPermissions(supabase);
      },
      {
        toastTitle: "Berechtigungsfehler",
        customMessage: "Ihre Berechtigungen konnten nicht geprüft werden."
      }
    );

    if (userPermissions) {
      setCanManageDocuments(userPermissions.includes(Permissions.MANAGE_DOCUMENTS));
      setCanManageMessages(userPermissions.includes(Permissions.MANAGE_MESSAGES));
      setCanManageFlyers(userPermissions.includes(Permissions.MANAGE_FLYERS));
      setCanManageEvents(userPermissions.includes(Permissions.MANAGE_EVENTS));
    }
    
    setPermissionsChecked(true);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('board_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchFlyers = async () => {
    try {
      const { data, error } = await supabase
        .from('board_flyers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const flyersWithUrls = (data || []).map((flyer) => {
        const { data: publicData } = supabase.storage
          .from('board-flyers')
          .getPublicUrl(flyer.image_path);
        return {
          ...flyer,
          image_url: publicData.publicUrl,
        };
      });
      setFlyers(flyersWithUrls);
    } catch (error) {
      console.error('Error fetching flyers:', error);
      toast({
        title: "Fehler",
        description: "Flyer konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoadingFlyers(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('club_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Fehler",
        description: "Events konnten nicht geladen werden.",
        variant: "destructive"
      });
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await db.select('board_documents', {
        orderBy: [{ column: 'created_at', ascending: false }]
      });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      handleError(error, {
        toastTitle: "Fehler",
        customMessage: "Die Dokumente konnten nicht geladen werden."
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleSaveMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (editingMessageId) {
        const { error } = await supabase
          .from('board_messages')
          .update({
            title: messageForm.title,
            content: messageForm.content,
          })
          .eq('id', editingMessageId);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Nachricht wurde aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from('board_messages')
          .insert({
            title: messageForm.title,
            content: messageForm.content,
            author_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Nachricht wurde erstellt.",
        });
      }

      setMessageForm({ title: "", content: "" });
      setEditingMessageId(null);
      fetchMessages();
    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleEditMessage = (message: BoardMessage) => {
    setMessageForm({ title: message.title, content: message.content });
    setEditingMessageId(message.id);
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('board_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Nachricht wurde gelöscht.",
      });

      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveFlyer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingFlyerId && !flyerForm.file) {
      toast({
        title: "Fehler",
        description: "Bitte laden Sie eine Grafikdatei hoch.",
        variant: "destructive"
      });
      return;
    }

    let uploadedFileMeta: { path: string; name: string; type: string | null; size: number } | null = null;

    try {
      setSavingFlyer(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (flyerForm.file) {
        const fileExtension = flyerForm.file.name.split('.').pop();
        const uniqueName = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const fileName = `${uniqueName}${fileExtension ? `.${fileExtension}` : ""}`;
        const { data, error } = await supabase.storage
          .from('board-flyers')
          .upload(fileName, flyerForm.file, {
            cacheControl: '3600',
            upsert: false,
            contentType: flyerForm.file.type,
          });

        if (error) throw error;

        uploadedFileMeta = {
          path: data.path,
          name: flyerForm.file.name,
          type: flyerForm.file.type || null,
          size: flyerForm.file.size,
        };
      }

      if (editingFlyerId) {
        const currentFlyer = flyers.find((flyer) => flyer.id === editingFlyerId);
        if (!currentFlyer) throw new Error("Flyer wurde nicht gefunden.");

        const updatePayload: Database['public']['Tables']['board_flyers']['Update'] = {
          title: flyerForm.title,
        };

        if (uploadedFileMeta) {
          updatePayload.image_path = uploadedFileMeta.path;
          updatePayload.image_name = uploadedFileMeta.name;
          updatePayload.image_type = uploadedFileMeta.type;
          updatePayload.image_size = uploadedFileMeta.size;
        }

        const { error } = await supabase
          .from('board_flyers')
          .update(updatePayload)
          .eq('id', editingFlyerId);

        if (error) throw error;

        if (uploadedFileMeta && currentFlyer.image_path) {
          await supabase.storage.from('board-flyers').remove([currentFlyer.image_path]);
        }

        toast({
          title: "Erfolg",
          description: "Flyer wurde aktualisiert.",
        });
      } else {
        if (!uploadedFileMeta) {
          throw new Error("Keine Datei zum Hochladen vorhanden.");
        }

        const { error } = await supabase
          .from('board_flyers')
          .insert({
            title: flyerForm.title,
            image_path: uploadedFileMeta.path,
            image_name: uploadedFileMeta.name,
            image_type: uploadedFileMeta.type,
            image_size: uploadedFileMeta.size,
            author_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Flyer wurde erstellt.",
        });
      }

      setFlyerForm({ title: "", file: null });
      setEditingFlyerId(null);
      if (flyerFileInputRef.current) {
        flyerFileInputRef.current.value = "";
      }
      uploadedFileMeta = null;
      fetchFlyers();
    } catch (error) {
      console.error('Error saving flyer:', error);
      // Nur bei Fehlern die hochgeladene Datei wieder löschen
      if (uploadedFileMeta) {
        await supabase.storage.from('board-flyers').remove([uploadedFileMeta.path]);
      }
      toast({
        title: "Fehler",
        description: "Flyer konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setSavingFlyer(false);
    }
  };

  const handleEditFlyer = (flyer: BoardFlyer) => {
    setFlyerForm({ title: flyer.title, file: null });
    setEditingFlyerId(flyer.id);
    if (flyerFileInputRef.current) {
      flyerFileInputRef.current.value = "";
    }
  };

  const handleDeleteFlyer = async (flyer: BoardFlyer) => {
    try {
      const { error } = await supabase
        .from('board_flyers')
        .delete()
        .eq('id', flyer.id);

      if (error) throw error;

      if (flyer.image_path) {
        await supabase.storage.from('board-flyers').remove([flyer.image_path]);
      }

      toast({
        title: "Erfolg",
        description: "Flyer wurde gelöscht.",
      });

      fetchFlyers();
    } catch (error) {
      console.error('Error deleting flyer:', error);
      toast({
        title: "Fehler",
        description: "Flyer konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (editingEventId) {
        const { error } = await supabase
          .from('club_events')
          .update({
            title: eventForm.title,
            event_date: eventForm.event_date,
            description: eventForm.description || null,
            location: eventForm.location || null,
          })
          .eq('id', editingEventId);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Event wurde aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from('club_events')
          .insert({
            title: eventForm.title,
            event_date: eventForm.event_date,
            description: eventForm.description || null,
            location: eventForm.location || null,
            author_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Event wurde erstellt.",
        });
      }

      setEventForm({ title: "", event_date: "", description: "", location: "" });
      setEditingEventId(null);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Fehler",
        description: "Event konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleEditEvent = (event: ClubEvent) => {
    setEventForm({
      title: event.title,
      event_date: event.event_date.split('T')[0],
      description: event.description || "",
      location: event.location || "",
    });
    setEditingEventId(event.id);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('club_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Event wurde gelöscht.",
      });

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Fehler",
        description: "Event konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const resetDocumentForm = () => {
    setDocumentForm({
      title: "",
      file: null,
    });
    setEditingDocumentId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateFile = (file: File | null): { isValid: boolean; error?: string } => {
    if (!file) return { isValid: true };

    const maxSize = 10 * 1024 * 1024; // 10 MB
    const maxFileNameLength = 100;
    const allowedTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'application/rtf',
      'image/png',
      'image/jpeg'
    ]);

    if (file.size > maxSize) {
      return { isValid: false, error: 'Die Datei darf nicht größer als 10 MB sein.' };
    }

    if (file.name.length > maxFileNameLength) {
      return { isValid: false, error: 'Der Dateiname darf nicht länger als 100 Zeichen sein.' };
    }

    const fileType = file.type.toLowerCase();
    if (!allowedTypes.has(fileType)) {
      return { isValid: false, error: 'Dieser Dateityp wird nicht unterstützt.' };
    }

    return { isValid: true };
  };

  const handleDocumentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Berechtigungsprüfung
    const { data: hasPermission } = await withErrorHandling(
      () => checkPermission(supabase, Permissions.MANAGE_DOCUMENTS),
      { 
        toastTitle: "Keine Berechtigung",
        customMessage: "Sie besitzen keine Berechtigung zum Verwalten von Dokumenten."
      }
    );

    if (!hasPermission) return;

    // Input-Validierung mit zentraler Fehlerbehandlung
    await withErrorHandling(
      async () => {
        try {
          // Only validate file if we're creating a new document
          const schemaToUse = editingDocumentId
            ? z.object({ title: commonRules.title })
            : documentSchema;
          
          const validatedData = schemaToUse.parse(documentForm);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error(getValidationError(error));
          }
          throw error;
        }

        // Datei validieren
        if (!editingDocumentId && !documentForm.file) {
          throw new Error("Bitte wählen Sie eine Datei zum Hochladen aus.");
        }

        if (documentForm.file) {
          const validation = validateFile(documentForm.file);
          if (!validation.isValid && validation.error) {
            throw new Error(validation.error);
          }
        }
      },
      {
        toastTitle: "Validierungsfehler",
        showToast: true
      }
    );

    setUploadingDocument(true);

    const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const resolveMimeType = (file: File) => {
      if (file.type) {
        return file.type;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      const fallbackTypes: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        csv: "text/csv",
        txt: "text/plain",
        rtf: "application/rtf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      };

      if (extension && extension in fallbackTypes) {
        return fallbackTypes[extension];
      }

      return "application/octet-stream";
    };

    let uploadedFileMeta: {
      path: string;
      name: string;
      type: string;
      size: number | null;
    } | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (documentForm.file) {
        const safeName = sanitizeFileName(documentForm.file.name);
        const storagePath = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('board-documents')
          .upload(storagePath, documentForm.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        uploadedFileMeta = {
          path: storagePath,
          name: documentForm.file.name,
          type: resolveMimeType(documentForm.file),
          size: documentForm.file.size ?? null,
        };
      }

      if (editingDocumentId) {
        const currentDocument = documents.find((doc) => doc.id === editingDocumentId);
        if (!currentDocument) throw new Error("Dokument wurde nicht gefunden.");

        const updatePayload: Partial<BoardDocument> = {
          title: documentForm.title,
        };

        if (uploadedFileMeta) {
          updatePayload.file_path = uploadedFileMeta.path;
          updatePayload.file_name = uploadedFileMeta.name;
          updatePayload.file_type = uploadedFileMeta.type;
          updatePayload.file_size = uploadedFileMeta.size;
        }

        const { error } = await supabase
          .from('board_documents')
          .update(updatePayload)
          .eq('id', editingDocumentId);

        if (error) throw error;

        if (uploadedFileMeta && currentDocument.file_path) {
          await supabase.storage.from('board-documents').remove([currentDocument.file_path]);
        }

        toast({
          title: "Erfolg",
          description: "Dokument wurde aktualisiert.",
        });
      } else {
        if (!uploadedFileMeta) {
          throw new Error("Keine Datei zum Hochladen vorhanden.");
        }

        const { error } = await supabase
          .from('board_documents')
          .insert({
            title: documentForm.title,
            file_path: uploadedFileMeta.path,
            file_name: uploadedFileMeta.name,
            file_type: uploadedFileMeta.type,
            file_size: uploadedFileMeta.size,
            author_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Dokument wurde hochgeladen.",
        });
      }

      resetDocumentForm();
      fetchDocuments();
    } catch (error) {
      console.error('Error saving document:', error);

      if (uploadedFileMeta) {
        await supabase.storage.from('board-documents').remove([uploadedFileMeta.path]);
      }

      toast({
        title: "Fehler",
        description: "Dokument konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleEditDocument = async (document: BoardDocument) => {
    const hasPermission = await checkPermission(supabase, Permissions.MANAGE_DOCUMENTS);
    if (!hasPermission) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie besitzen keine Berechtigung zum Bearbeiten von Dokumenten.",
        variant: "destructive"
      });
      return;
    }

    setEditingDocumentId(document.id);
    setDocumentForm({
      title: document.title,
      file: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (document: BoardDocument) => {
    // Berechtigungsprüfung
    const { data: hasPermission } = await withErrorHandling(
      () => checkPermission(supabase, Permissions.MANAGE_DOCUMENTS),
      {
        toastTitle: "Keine Berechtigung",
        customMessage: "Sie besitzen keine Berechtigung zum Löschen von Dokumenten."
      }
    );

    if (!hasPermission) return;

    // Dokument löschen
    const { error } = await withErrorHandling(
      async () => {
        // Datenbankeinträge löschen
        const { error: dbError } = await supabase
          .from('board_documents')
          .delete()
          .eq('id', document.id);

        if (dbError) throw dbError;

        // Datei aus dem Storage löschen
        if (document.file_path) {
          const { error: storageError } = await supabase.storage
            .from('board-documents')
            .remove([document.file_path]);

          if (storageError) throw storageError;
        }

        // Erfolgsmeldung
        toast({
          title: "Erfolg",
          description: "Dokument wurde gelöscht."
        });

        return { error: null };
      },
      {
        toastTitle: "Löschen fehlgeschlagen",
        customMessage: "Das Dokument konnte nicht gelöscht werden."
      }
    );

    if (!error) {
      await fetchDocuments();
    }
  };

  const handleDownloadDocument = async (document: BoardDocument) => {
    const { data, error } = await withErrorHandling(
      async () => {
        const { data, error } = await supabase.storage
          .from('board-documents')
          .createSignedUrl(document.file_path, 60);

        if (error || !data?.signedUrl) {
          throw new Error('Download fehlgeschlagen');
        }

        return data.signedUrl;
      },
      {
        toastTitle: "Download fehlgeschlagen",
        customMessage: "Das Dokument konnte nicht heruntergeladen werden."
      }
    );

    if (data) {
      window.open(data, '_blank', 'noopener,noreferrer');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes || bytes <= 0) return "–";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
  };

  const isLoading = loadingMessages || loadingFlyers || loadingDocuments;

  if (isLoading || !permissionsChecked) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Vorstand-Bereich
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Verwalten Sie Vorstands-Nachrichten, Vereins-Events und die komplette Mitgliederliste.
        </p>
      </div>

      <Tabs defaultValue="communication" className="w-full">
        <TabsList className="grid w-full max-w-5xl grid-cols-4">
          <TabsTrigger value="communication">Kommunikation</TabsTrigger>
          <TabsTrigger value="documents">Dokumente</TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            E-Mail versenden
          </TabsTrigger>
          <TabsTrigger value="lists">
            <List className="w-4 h-4 mr-2" />
            Listen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="communication" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="shadow-sport">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    Vorstands-Nachrichten
                  </CardTitle>
                  <CardDescription>
                    Erstellen und verwalten Sie Nachrichten für alle Mitglieder.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form className="space-y-4" onSubmit={handleSaveMessage}>
                    <div className="space-y-2">
                      <Label htmlFor="message-title">Titel*</Label>
                      <Input
                        id="message-title"
                        value={messageForm.title}
                        onChange={(e) => setMessageForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="z.B. Trainingszeiten aktualisiert"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message-content">Inhalt*</Label>
                      <Textarea
                        id="message-content"
                        value={messageForm.content}
                        onChange={(e) =>
                          setMessageForm((prev) => ({ ...prev, content: e.target.value }))
                        }
                        placeholder="Beschreiben Sie die wichtigsten Punkte..."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      {editingMessageId && (
                        <Button type="button" variant="outline" onClick={() => {
                          setEditingMessageId(null);
                          setMessageForm({ title: "", content: "" });
                        }}>
                          Abbrechen
                        </Button>
                      )}
                      <Button type="submit" className="bg-gradient-primary hover:bg-primary-hover">
                        {editingMessageId ? "Aktualisieren" : "Speichern"}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Noch keine Vorstands-Nachrichten vorhanden.
                      </p>
                    ) : (
                      messages.map((message) => (
                        <Card key={message.id} className="border border-border/60">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <CardTitle className="text-lg">{message.title}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(message.created_at).toLocaleDateString("de-DE")}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground"
                                  onClick={() => handleEditMessage(message)}
                                  aria-label="Nachricht bearbeiten"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteMessage(message.id)}
                                  aria-label="Nachricht löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {message.content}
                            </p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sport">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Flyer
                  </CardTitle>
                  <CardDescription>
                    Laden Sie gestaltete Flyer hoch, die anschließend im Kommunikationsbereich angezeigt werden.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form className="space-y-4" onSubmit={handleSaveFlyer}>
                    <div className="space-y-2">
                      <Label htmlFor="flyer-title">Titel*</Label>
                      <Input
                        id="flyer-title"
                        value={flyerForm.title}
                        onChange={(e) => setFlyerForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="z.B. Vereinsfest Flyer"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flyer-file">Grafikdatei{editingFlyerId ? "" : "*"}</Label>
                      <Input
                        id="flyer-file"
                        type="file"
                        accept="image/*"
                        ref={flyerFileInputRef}
                        onChange={(event) =>
                          setFlyerForm((prev) => ({
                            ...prev,
                            file: event.target.files?.[0] ?? null,
                          }))
                        }
                      />
                      {flyerForm.file && (
                        <p className="text-xs text-muted-foreground">
                          Ausgewählte Datei: {flyerForm.file.name}
                        </p>
                      )}
                      {editingFlyerId && !flyerForm.file && (
                        <p className="text-xs text-muted-foreground">
                          Die bestehende Grafik bleibt erhalten, wenn keine neue Datei ausgewählt wird.
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      {editingFlyerId && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingFlyerId(null);
                            setFlyerForm({ title: "", file: null });
                            if (flyerFileInputRef.current) {
                              flyerFileInputRef.current.value = "";
                            }
                          }}
                        >
                          Abbrechen
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className="bg-gradient-primary hover:bg-primary-hover"
                        disabled={savingFlyer}
                      >
                        {savingFlyer ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {editingFlyerId ? "Aktualisieren" : "Speichern"}
                          </span>
                        ) : (
                          editingFlyerId ? "Aktualisieren" : "Speichern"
                        )}
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {flyers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Noch keine Flyer veröffentlicht.
                      </p>
                    ) : (
                      flyers.map((flyer) => (
                        <Card key={flyer.id} className="border border-border/60 overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <CardTitle className="text-lg">{flyer.title}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(flyer.created_at).toLocaleDateString("de-DE")}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground"
                                  onClick={() => handleEditFlyer(flyer)}
                                  aria-label="Flyer bearbeiten"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteFlyer(flyer)}
                                  aria-label="Flyer löschen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {flyer.image_url ? (
                              <img
                                src={flyer.image_url}
                                alt={flyer.title}
                                className="w-full rounded-md border border-border/60 object-contain"
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Die Grafik konnte nicht geladen werden.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sport">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Vereins-Events
                </CardTitle>
                <CardDescription>
                  Planen Sie Termine und informieren Sie alle Mitglieder.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={handleSaveEvent}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event-title">Titel*</Label>
                  <Input
                    id="event-title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Saisonauftakt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Datum*</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event-location">Ort</Label>
                  <Input
                    id="event-location"
                    value={eventForm.location}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Sporthalle, Vereinsheim..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-description">Beschreibung</Label>
                  <Textarea
                    id="event-description"
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                    placeholder="Was erwartet die Teilnehmenden?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingEventId && (
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingEventId(null);
                    setEventForm({ title: "", event_date: "", description: "", location: "" });
                  }}>
                    Abbrechen
                  </Button>
                )}
                <Button type="submit" className="bg-gradient-secondary hover:bg-primary-hover">
                  {editingEventId ? "Aktualisieren" : "Speichern"}
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              {events.map((event) => (
                <Card key={event.id} className="border border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.event_date).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => handleEditEvent(event)}
                          aria-label="Event bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEvent(event.id)}
                          aria-label="Event löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-6">
          <Card className="shadow-sport">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Dokumente verwalten
              </CardTitle>
              <CardDescription>
                Hinterlegen Sie wichtige Unterlagen wie Mitgliedsantrag oder Datenschutzerklärung für den Vorstand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {canManageDocuments ? (
                <form className="space-y-4" onSubmit={handleDocumentSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="document-title">Titel*</Label>
                    <Input
                      id="document-title"
                      value={documentForm.title}
                      onChange={(e) => setDocumentForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="z.B. Mitgliedsantrag"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document-file">Datei{editingDocumentId ? " (optional)" : "*"}</Label>
                    <Input
                      id="document-file"
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const validation = validateFile(file);
                          if (!validation.isValid) {
                            toast({
                              title: "Ungültige Datei",
                              description: validation.error,
                              variant: "destructive"
                            });
                            e.target.value = '';
                            return;
                          }
                          setDocumentForm((prev) => ({ 
                            ...prev, 
                            file: file
                          }));
                          toast({
                            title: "Datei ausgewählt",
                            description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
                          });
                        }
                      }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt,.rtf"
                      required={!editingDocumentId}
                    />
                    <p className="text-xs text-muted-foreground">
                      {editingDocumentId
                        ? "Lassen Sie das Feld leer, um die bestehende Datei zu behalten."
                        : "Wählen Sie die Datei aus, die Sie hinterlegen möchten."}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {editingDocumentId && (
                    <Button type="button" variant="outline" onClick={resetDocumentForm}>
                      Abbrechen
                    </Button>
                  )}
                  <Button type="submit" className="bg-gradient-secondary hover:bg-primary-hover" disabled={uploadingDocument}>
                    {uploadingDocument && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingDocumentId ? "Aktualisieren" : "Hochladen"}
                  </Button>
                </div>
                </form>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Sie können Dokumente lesen, besitzen jedoch keine Berechtigung zum Hochladen oder Verwalten. Wenden Sie sich an einen Administrator, wenn Sie Zugriff benötigen.
                </div>
              )}

              <div className="space-y-3">
                {documents.map((document) => (
                  <Card key={document.id} className="border border-border/60">
                    <CardContent className="py-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                              <p className="font-medium text-foreground">{document.title}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <p className="font-medium">Datei: {document.file_name}</p>
                            <p>Größe: {formatFileSize(document.file_size)}</p>
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground/70">
                                Hochgeladen am: {new Date(document.created_at).toLocaleDateString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => handleDownloadDocument(document)}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          {canManageDocuments && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => handleEditDocument(document)}
                              >
                                <Edit2 className="w-4 h-4" />
                                Ändern
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleDeleteDocument(document)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Löschen
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Es wurden noch keine Dokumente hinterlegt.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <BoardEmailManager />
        </TabsContent>

        <TabsContent value="lists" className="mt-6">
          <Card className="shadow-sport">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Listen
              </CardTitle>
              <CardDescription>
                Wählen Sie einen Listenbereich aus, um den entsprechenden Inhalt zu öffnen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {listSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeListSection === section.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setActiveListSection(section.id)}
                  >
                    {section.label}
                  </Button>
                ))}
              </div>
              <div>{renderActiveListContent()}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
