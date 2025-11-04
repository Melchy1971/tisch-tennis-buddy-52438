import type { Tables } from "@/integrations/supabase/types";

export interface ManualMemberRequest {
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
  roles: string[];
  qttr_value?: number | null;
  member_since?: string;
}

export interface ManualMemberResponse {
  profile: Tables<"profiles">;
  user_roles: { role: string }[];
  temporary_password?: string;
}
