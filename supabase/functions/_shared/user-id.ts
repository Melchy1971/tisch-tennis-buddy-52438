import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  user_id: string | null;
  default_role: string | null;
  status: string | null;
};

export type AssignUserIdsSummary = {
  processed: number;
  alreadyAssigned: number;
  created: number;
  skipped: number;
  placeholders: number;
  errors: string[];
};

import { buildPlaceholderEmail, isPlaceholderEmail } from "./placeholder-email.ts";

export const assignMissingUserIds = async (
  supabaseAdmin: SupabaseClient<any, "public", any>
): Promise<AssignUserIdsSummary> => {
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, user_id, default_role, status")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (profilesError) {
    throw profilesError;
  }

  const existingWithIds = (profiles ?? []).filter((profile) => Boolean(profile.user_id));
  let nextSequence = existingWithIds.length + 1;

  const summary: AssignUserIdsSummary = {
    processed: profiles?.length ?? 0,
    alreadyAssigned: existingWithIds.length,
    created: 0,
    skipped: 0,
    placeholders: 0,
    errors: [],
  };

  if (!profiles || profiles.length === 0) {
    return summary;
  }

  for (const profile of profiles as ProfileRow[]) {
    if (profile.user_id) {
      summary.skipped++;
      continue;
    }

    const sequence = nextSequence++;
    const password = crypto.randomUUID();

    const baseEmail = profile.email?.trim();
    let useEmail = baseEmail && baseEmail.length > 0 ? baseEmail : buildPlaceholderEmail(sequence);
    let emailIsPlaceholder = !baseEmail || baseEmail.length === 0;

    let createdUserId: string | null = null;
    let attempt = 0;
    let lastError: Error | null = null;

    while (!createdUserId && attempt < 5) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: useEmail,
        password,
        email_confirm: !emailIsPlaceholder,
        user_metadata: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          legacy_sequence: sequence,
          requires_password_change: true,
        },
      });

      if (authError) {
        lastError = authError;
        const message = authError.message?.toLowerCase() ?? "";
        const duplicate = message.includes("already registered") || message.includes("user already exists");
        if (duplicate) {
          useEmail = buildPlaceholderEmail(sequence, attempt);
          emailIsPlaceholder = true;
          attempt++;
          continue;
        }
        break;
      }

      if (!authData?.user?.id) {
        lastError = new Error("Missing user information from Supabase response");
        break;
      }

      createdUserId = authData.user.id;
    }

    if (!createdUserId) {
      summary.errors.push(`Profil ${profile.id}: ${lastError?.message ?? "Unbekannter Fehler bei der Benutzererstellung"}`);
      continue;
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        user_id: createdUserId,
        email: useEmail,
        requires_password_change: true,
        default_role: profile.default_role ?? "mitglied",
        status: profile.status ?? "pending",
      })
      .eq("id", profile.id);

    if (profileUpdateError) {
      summary.errors.push(`Profil ${profile.id}: ${profileUpdateError.message}`);
      continue;
    }

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: createdUserId, role: "mitglied" },
        { onConflict: "user_id,role" }
      );

    if (roleInsertError) {
      summary.errors.push(`Profil ${profile.id}: ${roleInsertError.message}`);
      continue;
    }

    if (emailIsPlaceholder) {
      summary.placeholders++;
    }

    summary.created++;
  }

  return summary;
};
