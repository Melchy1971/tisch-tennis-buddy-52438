export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      board_communications: {
        Row: {
          author_id: string
          created_at: string
          id: string
          is_urgent: boolean | null
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          is_urgent?: boolean | null
          message: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          is_urgent?: boolean | null
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_communications_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      board_documents: {
        Row: {
          author_id: string
          category: string | null
          content: string | null
          created_at: string
          id: string
          is_published: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      board_flyers: {
        Row: {
          author_id: string
          content: string | null
          created_at: string | null
          id: string
          image_name: string | null
          image_path: string | null
          image_size: number | null
          image_type: string | null
          image_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_path?: string | null
          image_size?: number | null
          image_type?: string | null
          image_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_path?: string | null
          image_size?: number | null
          image_type?: string | null
          image_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      board_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_urgent: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      club_events: {
        Row: {
          author_id: string
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          location: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      club_settings: {
        Row: {
          address: string | null
          club_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          club_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          club_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      email_distribution_lists: {
        Row: {
          created_at: string | null
          groups: Json | null
          id: string
          manual_emails: string[] | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          groups?: Json | null
          id?: string
          manual_emails?: string[] | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          groups?: Json | null
          id?: string
          manual_emails?: string[] | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          home_away: string | null
          id: string
          location: string | null
          match_date: string
          opponent: string
          result: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_away?: string | null
          id?: string
          location?: string | null
          match_date: string
          opponent: string
          result?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_away?: string | null
          id?: string
          location?: string | null
          match_date?: string
          opponent?: string
          result?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          city: string | null
          created_at: string
          default_role: string | null
          deleted_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          member_number: string | null
          member_since: string | null
          mobile: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          qttr_value: number | null
          status: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          default_role?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          member_number?: string | null
          member_since?: string | null
          mobile?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          qttr_value?: number | null
          status?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          default_role?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          member_number?: string | null
          member_since?: string | null
          mobile?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          qttr_value?: number | null
          status?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          position: number | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          position?: number | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          position?: number | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          created_at: string
          id: string
          league: string | null
          name: string
          season: string | null
          updated_at: string
        }
        Insert: {
          captain_id?: string | null
          created_at?: string
          id?: string
          league?: string | null
          name: string
          season?: string | null
          updated_at?: string
        }
        Update: {
          captain_id?: string | null
          created_at?: string
          id?: string
          league?: string | null
          name?: string
          season?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_board: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "board_member" | "trainer" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "board_member", "trainer", "member"],
    },
  },
} as const
