import { z } from 'zod';

// File-Validierung
export const fileValidationRules = {
  maxSize: 10 * 1024 * 1024, // 10 MB
  allowedTypes: new Set([
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
  ]),
  maxNameLength: 100
};

// Allgemeine Validierungsregeln
export const commonRules = {
  // Text und Titel
  title: z.string()
    .min(1, 'Der Titel darf nicht leer sein.')
    .max(100, 'Der Titel darf maximal 100 Zeichen lang sein.'),
  description: z.string()
    .max(1000, 'Die Beschreibung darf maximal 1000 Zeichen lang sein.')
    .optional(),
  notes: z.string()
    .max(1000, 'Die Notizen dürfen maximal 1000 Zeichen lang sein.')
    .optional(),
  content: z.string()
    .min(1, 'Der Inhalt darf nicht leer sein.')
    .max(5000, 'Der Inhalt darf maximal 5000 Zeichen lang sein.'),

  // Kontaktdaten
  email: z.string()
    .trim()
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
    .max(255, 'Die E-Mail-Adresse darf maximal 255 Zeichen lang sein.'),
  phone: z.string()
    .regex(/^[+\d\s-()]{0,20}$/, 'Bitte geben Sie eine gültige Telefonnummer ein.')
    .optional(),
  mobile: z.string()
    .regex(/^[+\d\s-()]{0,20}$/, 'Bitte geben Sie eine gültige Mobilnummer ein.')
    .optional(),

  // Persönliche Daten
  firstName: z.string()
    .min(1, 'Der Vorname darf nicht leer sein.')
    .max(50, 'Der Vorname darf maximal 50 Zeichen lang sein.'),
  lastName: z.string()
    .min(1, 'Der Nachname darf nicht leer sein.')
    .max(50, 'Der Nachname darf maximal 50 Zeichen lang sein.'),
  memberNumber: z.string()
    .max(20, 'Die Mitgliedsnummer darf maximal 20 Zeichen lang sein.')
    .optional(),

  // Adressdaten
  street: z.string()
    .max(100, 'Die Straße darf maximal 100 Zeichen lang sein.')
    .optional(),
  postalCode: z.string()
    .regex(/^\d{5}$/, 'Bitte geben Sie eine gültige Postleitzahl ein.')
    .optional(),
  city: z.string()
    .max(100, 'Der Ort darf maximal 100 Zeichen lang sein.')
    .optional(),

  // Datum und Zeit
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte geben Sie ein gültiges Datum im Format YYYY-MM-DD ein.'),
  time: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Bitte geben Sie eine gültige Uhrzeit im Format HH:MM ein.'),

  // Status und Rollen
  status: z.enum(['active', 'inactive', 'deleted'], {
    errorMap: () => ({ message: 'Bitte wählen Sie einen gültigen Status.' })
  }),
};

// Password validation with security requirements
export const passwordSchema = z
  .string()
  .min(8, { message: "Passwort muss mindestens 8 Zeichen haben" })
  .max(100, { message: "Passwort darf maximal 100 Zeichen haben" })
  .regex(/[A-Z]/, { message: "Passwort muss mindestens einen Großbuchstaben enthalten" })
  .regex(/[a-z]/, { message: "Passwort muss mindestens einen Kleinbuchstaben enthalten" })
  .regex(/[0-9]/, { message: "Passwort muss mindestens eine Zahl enthalten" });

// Name validation (first name, last name)
export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Dieses Feld ist erforderlich" })
  .max(100, { message: "Darf maximal 100 Zeichen haben" })
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, { message: "Nur Buchstaben, Leerzeichen, Bindestriche und Apostrophe erlaubt" });

// Very relaxed name validation for imports (allows almost any character)
export const importNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Dieses Feld ist erforderlich" })
  .max(200, { message: "Darf maximal 200 Zeichen haben" });

// Phone number validation (German format)
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d\s\-+()/]*$/, { message: "Ungültige Telefonnummer" })
  .max(20, { message: "Telefonnummer darf maximal 20 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// German postal code validation
export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, { message: "PLZ muss genau 5 Ziffern haben" })
  .optional()
  .or(z.literal(""));

// Street address validation
export const streetSchema = z
  .string()
  .trim()
  .max(200, { message: "Straße darf maximal 200 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// City validation
export const citySchema = z
  .string()
  .trim()
  .max(100, { message: "Ort darf maximal 100 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// URL validation
export const urlSchema = z
  .string()
  .trim()
  .url({ message: "Ungültige URL" })
  .max(500, { message: "URL darf maximal 500 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// Member number validation
export const memberNumberSchema = z
  .string()
  .trim()
  .max(50, { message: "Mitgliedsnummer darf maximal 50 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// PIN validation (for match pins)
export const pinSchema = z
  .string()
  .trim()
  .min(1, { message: "PIN ist erforderlich" })
  .max(50, { message: "PIN darf maximal 50 Zeichen haben" })
  .regex(/^[A-Za-z0-9\-_]+$/, { message: "PIN darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten" });

// Date validation - accepts multiple formats
export const dateSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""));

// Email schema (reusing commonRules.email for consistency)
export const emailSchema = commonRules.email;

// Authentication schemas
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Passwort ist erforderlich" }),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

// Profile schema
export const profileSchema = z.object({
  first_name: nameSchema.optional().or(z.literal("")),
  last_name: nameSchema.optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  mobile: phoneSchema,
  member_number: memberNumberSchema,
  street: streetSchema,
  postal_code: postalCodeSchema,
  city: citySchema,
  birthday: dateSchema,
  member_since: dateSchema,
  photo_url: urlSchema,
});

// Member import schema with very relaxed validation
export const memberImportSchema = z.object({
  first_name: importNameSchema,
  last_name: importNameSchema,
  email: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  mobile: z.string().trim().max(50).optional().or(z.literal("")),
  member_number: z.string().trim().max(100).optional().or(z.literal("")),
  street: z.string().trim().max(300).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(200).optional().or(z.literal("")),
  birthday: z.string().trim().optional().or(z.literal("")),
  temporary_password: z.string().trim().optional().or(z.literal("")),
  role: z.enum(["mitglied", "player", "admin", "moderator", "vorstand", "mannschaftsfuehrer"]).optional(),
});

// Pin management schemas
export const matchPinSchema = z.object({
  spielpin: pinSchema,
  spielpartie_pin: z.string().trim().max(50, { message: "Spielcode darf maximal 50 Zeichen haben" }).optional().or(z.literal("")),
});

export const newPinSchema = z.object({
  match_id: z.string().uuid({ message: "Ungültige Spiel-ID" }),
  spielpin: pinSchema,
  spielpartie_pin: z.string().trim().max(50, { message: "Spielcode darf maximal 50 Zeichen haben" }).optional().or(z.literal("")),
});

// Helper function to get validation error message
export const getValidationError = (error: z.ZodError): string => {
  return error.errors.map(err => err.message).join(", ");
};
