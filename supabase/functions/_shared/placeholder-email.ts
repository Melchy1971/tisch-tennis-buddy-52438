/**
 * Shared utilities for generating placeholder email addresses
 * for members without a valid email address.
 */

const PLACEHOLDER_PREFIX = "mitglied";
const PLACEHOLDER_DOMAIN = "placeholder.ttbuddy.app";

/**
 * Generates a placeholder email address based on a sequence number.
 * Format: mitglied.{sequence}@ttb.local or mitglied.{sequence}.{attempt}@ttb.local
 */
export const buildPlaceholderEmail = (sequence: number, attempt = 0): string => {
  const suffix = attempt === 0 ? "" : `.${attempt + 1}`;
  return `${PLACEHOLDER_PREFIX}.${sequence}${suffix}@${PLACEHOLDER_DOMAIN}`;
};

/**
 * Generates a placeholder email from first and last name.
 * Format: firstname.lastname@ttb.local
 * Falls back to UUID-based placeholder if names are empty.
 */
/**
 * Normalizes a string for use in email addresses by:
 * - Converting to lowercase
 * - Removing/replacing special characters
 * - Handling German umlauts
 */
const normalizeForEmail = (str: string): string => {
  return str
    .trim()
    .toLowerCase()
    // Replace German umlauts
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Remove all non-alphanumeric characters except dots and hyphens
    .replace(/[^a-z0-9.-]/g, '')
    // Remove leading/trailing dots or hyphens
    .replace(/^[.-]+|[.-]+$/g, '')
    // Replace multiple dots or hyphens with a single one
    .replace(/[.-]{2,}/g, '-');
};

export const buildNameBasedPlaceholderEmail = (
  firstName: string,
  lastName: string
): string => {
  const cleanFirst = normalizeForEmail(firstName || "");
  const cleanLast = normalizeForEmail(lastName || "");
  
  if (cleanFirst && cleanLast) {
    return `${cleanFirst}.${cleanLast}@${PLACEHOLDER_DOMAIN}`;
  } else if (cleanFirst) {
    return `${cleanFirst}.${crypto.randomUUID().slice(0, 8)}@${PLACEHOLDER_DOMAIN}`;
  } else if (cleanLast) {
    return `${cleanLast}.${crypto.randomUUID().slice(0, 8)}@${PLACEHOLDER_DOMAIN}`;
  } else {
    return `${PLACEHOLDER_PREFIX}.${crypto.randomUUID().slice(0, 8)}@${PLACEHOLDER_DOMAIN}`;
  }
};

/**
 * Checks if an email is a placeholder email.
 */
export const isPlaceholderEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return email.endsWith(`@${PLACEHOLDER_DOMAIN}`);
};
