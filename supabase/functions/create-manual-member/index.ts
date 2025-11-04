import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildNameBasedPlaceholderEmail, isPlaceholderEmail } from "../_shared/placeholder-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ManualMemberRequest = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  member_number?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  birthday?: string;
  status?: string;
  roles?: string[];
  qttr_value?: number | null;
  member_since?: string;
};

const allowedStatuses = new Set(["pending", "active", "inactive"]);
const roleMap = new Map<string, string>([
  ["mitglied", "mitglied"],
  ["player", "player"],
  ["captain", "moderator"],
  ["vorstand", "vorstand"],
  ["admin", "admin"],
  ["senioren", "senioren"],
  ["damen", "damen"],
  ["jugend", "jugend"],
]);

const sanitizeString = (value?: string | null): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveStatus = (status?: string): string => {
  if (!status) return "pending";
  const normalized = status.trim().toLowerCase();
  return allowedStatuses.has(normalized) ? normalized : "pending";
};

const parseQttrValue = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: getUserError,
    } = await supabaseAdmin.auth.getUser(token);

    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      throw roleError;
    }

    const hasPermission = roleData?.some((entry) => 
      entry.role === "admin" || entry.role === "vorstand" || entry.role === "mitglied"
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: ManualMemberRequest = await req.json();

    const firstName = sanitizeString(body.first_name);
    const lastName = sanitizeString(body.last_name);
    let email = sanitizeString(body.email)?.toLowerCase();

    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate placeholder email if not provided
    if (!email) {
      email = buildNameBasedPlaceholderEmail(firstName, lastName);
    } else if (isPlaceholderEmail(email)) {
      // If it's already a placeholder, regenerate based on names
      email = buildNameBasedPlaceholderEmail(firstName, lastName);
    }

    // Check if user with this email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email);

    let createdUserId: string;
    let temporaryPassword: string | undefined;

    if (existingUser) {
      // Use existing user
      createdUserId = existingUser.id;
      temporaryPassword = undefined;
    } else {
      // Create new user
      temporaryPassword = crypto.randomUUID();
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          requires_password_change: true,
        },
      });

      if (authError) throw authError;

      const createdUser = authData.user;
      if (!createdUser) {
        throw new Error("User creation failed");
      }
      createdUserId = createdUser.id;
    }

    const memberSinceValue = sanitizeString(body.member_since);

    const profileUpdate: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: sanitizeString(body.phone),
      mobile: sanitizeString(body.mobile),
      member_number: sanitizeString(body.member_number),
      street: sanitizeString(body.street),
      postal_code: sanitizeString(body.postal_code),
      city: sanitizeString(body.city),
      birthday: sanitizeString(body.birthday),
      status: resolveStatus(body.status),
      requires_password_change: temporaryPassword !== undefined,
      qttr_value: parseQttrValue(body.qttr_value),
      updated_at: new Date().toISOString(),
    };

    if (memberSinceValue !== null) {
      profileUpdate.member_since = memberSinceValue;
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", createdUserId)
      .select("*")
      .single();

    if (profileError) throw profileError;

    const requestedRoles = Array.isArray(body.roles) ? body.roles : [];
    const normalizedRoles = Array.from(
      new Set(
        requestedRoles
          .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
          .filter((role) => roleMap.has(role)),
      ),
    );

    // Get existing roles for this user
    const { data: existingRolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", createdUserId);

    const existingRoleSet = new Set(existingRolesData?.map(r => r.role) || []);

    // Only insert roles that don't exist yet
    const rolesToInsert = normalizedRoles
      .filter((role) => !existingRoleSet.has(roleMap.get(role)!))
      .map((role) => ({
        user_id: createdUserId,
        role: roleMap.get(role)!,
      }));

    if (rolesToInsert.length > 0) {
      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .insert(rolesToInsert);

      if (rolesError) throw rolesError;
    }

    const { data: persistedRoles, error: persistedRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", createdUserId);

    if (persistedRolesError) throw persistedRolesError;

    return new Response(
      JSON.stringify({
        profile: profileData,
        user_roles: persistedRoles ?? [],
        temporary_password: temporaryPassword,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in create-manual-member:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
