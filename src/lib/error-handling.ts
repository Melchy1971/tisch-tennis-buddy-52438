import { PostgrestError } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

// Standardisierte Fehlermeldungen
export const ErrorMessages = {
  AUTH: {
    NOT_AUTHENTICATED: 'Sie sind nicht angemeldet.',
    SESSION_EXPIRED: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    INSUFFICIENT_PERMISSIONS: 'Sie besitzen nicht die erforderlichen Berechtigungen.'
  },
  DATA: {
    LOAD_ERROR: 'Die Daten konnten nicht geladen werden.',
    SAVE_ERROR: 'Die Daten konnten nicht gespeichert werden.',
    DELETE_ERROR: 'Die Daten konnten nicht gelöscht werden.',
    UPDATE_ERROR: 'Die Daten konnten nicht aktualisiert werden.',
    VALIDATION_ERROR: 'Die eingegebenen Daten sind ungültig.'
  },
  FILE: {
    UPLOAD_ERROR: 'Die Datei konnte nicht hochgeladen werden.',
    DELETE_ERROR: 'Die Datei konnte nicht gelöscht werden.',
    INVALID_TYPE: 'Dieser Dateityp wird nicht unterstützt.',
    SIZE_ERROR: 'Die Datei ist zu groß.',
    NAME_ERROR: 'Der Dateiname ist ungültig.'
  },
  GENERIC: {
    UNKNOWN_ERROR: 'Ein unerwarteter Fehler ist aufgetreten.',
    NETWORK_ERROR: 'Es besteht ein Problem mit der Internetverbindung.',
    TIMEOUT_ERROR: 'Die Anfrage hat zu lange gedauert.',
    SERVER_ERROR: 'Der Server ist derzeit nicht erreichbar.'
  }
} as const;

// Typen für die verschiedenen Fehlerarten
export type ErrorCategory = keyof typeof ErrorMessages;
export type ErrorType<T extends ErrorCategory> = keyof typeof ErrorMessages[T];

// Interface für die Fehlerbehandlungs-Optionen
interface ErrorHandlingOptions {
  logError?: boolean;
  showToast?: boolean;
  toastTitle?: string;
  customMessage?: string;
}

// Funktion zum Ermitteln der Fehlerquelle
function determineErrorSource(error: unknown): { category: ErrorCategory; type: string } {
  if (error instanceof Error) {
    // Authentifizierungsfehler
    if (error.message.includes('not authenticated') || error.message.includes('session expired')) {
      return { category: 'AUTH', type: 'NOT_AUTHENTICATED' };
    }
    // Berechtigungsfehler
    if (error.message.includes('permission') || error.message.includes('forbidden')) {
      return { category: 'AUTH', type: 'INSUFFICIENT_PERMISSIONS' };
    }
    // Validierungsfehler
    if (error.message.includes('validation')) {
      return { category: 'DATA', type: 'VALIDATION_ERROR' };
    }
    // Netzwerkfehler
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return { category: 'GENERIC', type: 'NETWORK_ERROR' };
    }
  }

  // PostgreSQL Fehler
  if ((error as PostgrestError)?.code) {
    const pgError = error as PostgrestError;
    if (pgError.code.startsWith('23')) { // Integritätsverletzungen
      return { category: 'DATA', type: 'VALIDATION_ERROR' };
    }
    if (pgError.code.startsWith('28')) { // Berechtigungsfehler
      return { category: 'AUTH', type: 'INSUFFICIENT_PERMISSIONS' };
    }
  }

  // Standardfall
  return { category: 'GENERIC', type: 'UNKNOWN_ERROR' };
}

// Hauptfunktion für die Fehlerbehandlung
export function handleError(
  error: unknown,
  options: ErrorHandlingOptions = {}
): { message: string; category: ErrorCategory; type: string } {
  const {
    logError = true,
    showToast = true,
    toastTitle = 'Fehler',
    customMessage
  } = options;

  // Fehlerquelle ermitteln
  const { category, type } = determineErrorSource(error);

  // Fehlermeldung zusammenstellen
  const message = customMessage || ErrorMessages[category][type as keyof typeof ErrorMessages[typeof category]];

  // Fehler in der Konsole loggen
  if (logError) {
    console.error(`[${category}] ${type}:`, error);
  }

  // Toast-Benachrichtigung anzeigen
  if (showToast) {
    toast({
      title: toastTitle,
      description: message,
      variant: "destructive"
    });
  }

  return { message, category, type };
}

// Hilfsfunktion für das Wrappen von asynchronen Funktionen mit Fehlerbehandlung
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: ErrorHandlingOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    handleError(error, options);
    return { data: null, error: error as Error };
  }
}