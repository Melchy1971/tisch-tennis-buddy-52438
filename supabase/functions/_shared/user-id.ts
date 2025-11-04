import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type ProfileRow = {
  id: string; // This IS the user_id (profiles.id references auth.users.id)
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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
  // Note: profiles.id IS the user_id (it references auth.users.id directly)
  // We're looking for profiles that don't have a corresponding auth.users record
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (authError) {
    throw authError;
  }
  
  const existingAuthIds = new Set((authUsers.users || []).map(u => u.id));
  
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, default_role, status")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (profilesError) {
    throw profilesError;
  }

  // Find profiles without auth users
  const profilesWithoutAuth = (profiles ?? []).filter((profile) => !existingAuthIds.has(profile.id));
  let nextSequence = (profiles?.length ?? 0) - profilesWithoutAuth.length + 1;

  const summary: AssignUserIdsSummary = {
    processed: profiles?.length ?? 0,
    alreadyAssigned: (profiles?.length ?? 0) - profilesWithoutAuth.length,
    created: 0,
    skipped: 0,
    placeholders: 0,
    errors: [],
  };

  if (!profilesWithoutAuth || profilesWithoutAuth.length === 0) {
    return summary;
  }

  for (const profile of profilesWithoutAuth as ProfileRow[]) {

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

    // Update the profile with the new email if it's a placeholder
    // Note: We don't update the id since it should already match the auth user id
    const updatePayload: any = {
      email: useEmail,
      default_role: profile.default_role ?? "mitglied",
      status: profile.status ?? "pending",
    };

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", createdUserId);

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
