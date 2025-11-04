import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assignMissingUserIds } from "../_shared/user-id.ts";
import { buildNameBasedPlaceholderEmail } from "../_shared/placeholder-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemberData {
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
  temporary_password?: string;
  role?: string;
}

// Helper function to parse various date formats
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Try parsing DD.MM.YYYY format
    const germanFormat = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const germanMatch = dateStr.match(germanFormat);
    if (germanMatch) {
      const [, day, month, year] = germanMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try parsing M/D/YY or MM/DD/YYYY format
    const usFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
    const usMatch = dateStr.match(usFormat);
    if (usMatch) {
      const [, month, day, yearMatch] = usMatch;
      const year =
        yearMatch.length === 2
          ? parseInt(yearMatch, 10) > 50
            ? `19${yearMatch}`
            : `20${yearMatch}`
          : yearMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try parsing YYYY-MM-DD format (already correct)
    const isoFormat = /^(\d{4})-(\d{2})-(\d{2})$/;
    if (isoFormat.test(dateStr)) {
      return dateStr;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { members }: { members: MemberData[] } = await req.json();

    const results = {
      successful: [] as string[],
      failed: [] as { name: string; error: string }[],
      updated: [] as string[],
    };

    for (const member of members) {
      try {
        const memberName = `${member.first_name} ${member.last_name}`;
        
        // Check if member already exists by first_name and last_name
        const { data: existingProfiles, error: searchError } = await supabaseAdmin
          .from("profiles")
          .select("id, user_id")
          .eq("first_name", member.first_name)
          .eq("last_name", member.last_name);

        if (searchError) throw searchError;

        if (existingProfiles && existingProfiles.length > 0) {
          // Update existing profile
          const existingProfile = existingProfiles[0];
          
          const updateData: any = {
            phone: member.phone || null,
            mobile: member.mobile || null,
            member_number: member.member_number || null,
            street: member.street || null,
            postal_code: member.postal_code || null,
            city: member.city || null,
            birthday: parseDate(member.birthday),
          };
          
          if (member.email) {
            updateData.email = member.email;
          }

          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", existingProfile.id);

          if (updateError) throw updateError;

          results.updated.push(memberName);
        } else {
          // Create new member - ALWAYS create auth user to ensure user_id exists for roles
          // Generate placeholder email if not provided
          const userEmail = member.email || buildNameBasedPlaceholderEmail(member.first_name, member.last_name);
          // Generate random password if not provided
          const userPassword = member.temporary_password || crypto.randomUUID();
          
          // Create auth user
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userEmail,
            password: userPassword,
            email_confirm: true,
            user_metadata: {
              first_name: member.first_name,
              last_name: member.last_name,
              requires_password_change: !member.temporary_password, // Only if no password was provided
            },
          });

          if (authError) throw authError;

          // Update profile with additional data
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
              email: member.email || null, // Keep original email or null
              phone: member.phone || null,
              mobile: member.mobile || null,
              member_number: member.member_number || null,
              street: member.street || null,
              postal_code: member.postal_code || null,
              city: member.city || null,
              birthday: parseDate(member.birthday),
              requires_password_change: !member.temporary_password,
            })
            .eq("user_id", authData.user.id);

          if (profileError) throw profileError;

          // Assign additional roles if specified (mitglied role is added by trigger)
          if (member.role && member.role !== 'mitglied') {
            const { error: roleError } = await supabaseAdmin
              .from("user_roles")
              .insert({
                user_id: authData.user.id,
                role: member.role,
              });

            if (roleError) throw roleError;
          }

          results.successful.push(memberName);
        }
      } catch (error: any) {
        results.failed.push({
          name: `${member.first_name} ${member.last_name}`,
          error: error.message,
        });
      }
    }

    const userIdSummary = await assignMissingUserIds(supabaseAdmin);

    return new Response(JSON.stringify({ ...results, userIdSummary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in import-members:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
