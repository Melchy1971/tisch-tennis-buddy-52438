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
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
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
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
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
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
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
      club_halls: {
        Row: {
          address: string | null
          created_at: string | null
          hall_number: number | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          hall_number?: number | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          hall_number?: number | null
          id?: string
          name?: string | null
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
          email_from_address: string | null
          email_provider_type: string | null
          email_smtp_password: string | null
          email_smtp_port: number | null
          email_smtp_server: string | null
          email_smtp_use_tls: boolean | null
          email_smtp_username: string | null
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          show_feedback_section: boolean | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          club_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          email_from_address?: string | null
          email_provider_type?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_server?: string | null
          email_smtp_use_tls?: boolean | null
          email_smtp_username?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          show_feedback_section?: boolean | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          club_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          email_from_address?: string | null
          email_provider_type?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_server?: string | null
          email_smtp_use_tls?: boolean | null
          email_smtp_username?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          show_feedback_section?: boolean | null
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
      feedback: {
        Row: {
          created_at: string | null
          description: string
          id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      match_availability: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          notes: string | null
          player_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          notes?: string | null
          player_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          notes?: string | null
          player_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_availability_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_pins: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          spielpartie_pin: string | null
          spielpin: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          spielpartie_pin?: string | null
          spielpin?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          spielpartie_pin?: string | null
          spielpin?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_pins_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string | null
          club_team: string | null
          created_at: string
          date: string | null
          home_away: string | null
          home_score: number | null
          home_team: string | null
          id: string
          location: string | null
          match_date: string
          opponent: string
          result: string | null
          status: string | null
          team: string | null
          team_id: string
          time: string | null
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          away_team?: string | null
          club_team?: string | null
          created_at?: string
          date?: string | null
          home_away?: string | null
          home_score?: number | null
          home_team?: string | null
          id?: string
          location?: string | null
          match_date: string
          opponent: string
          result?: string | null
          status?: string | null
          team?: string | null
          team_id: string
          time?: string | null
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          away_team?: string | null
          club_team?: string | null
          created_at?: string
          date?: string | null
          home_away?: string | null
          home_score?: number | null
          home_team?: string | null
          id?: string
          location?: string | null
          match_date?: string
          opponent?: string
          result?: string | null
          status?: string | null
          team?: string | null
          team_id?: string
          time?: string | null
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
      pin_import_logs: {
        Row: {
          created_at: string | null
          errors_count: number | null
          file_name: string | null
          id: string
          import_date: string | null
          imported_by: string
          pins_imported: number | null
        }
        Insert: {
          created_at?: string | null
          errors_count?: number | null
          file_name?: string | null
          id?: string
          import_date?: string | null
          imported_by: string
          pins_imported?: number | null
        }
        Update: {
          created_at?: string | null
          errors_count?: number | null
          file_name?: string | null
          id?: string
          import_date?: string | null
          imported_by?: string
          pins_imported?: number | null
        }
        Relationships: []
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
          requires_password_change: boolean | null
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
          requires_password_change?: boolean | null
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
          requires_password_change?: boolean | null
          status?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          name: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id: string
          is_current?: boolean | null
          name: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          member_id: string | null
          position: number | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          member_id?: string | null
          position?: number | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          member_id?: string | null
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
      team_substitute_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          request_id: string | null
          requested_by: string | null
          status: string | null
          substitute_player_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id?: string | null
          requested_by?: string | null
          status?: string | null
          substitute_player_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id?: string | null
          requested_by?: string | null
          status?: string | null
          substitute_player_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_substitute_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_substitute_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "team_substitute_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_substitute_assignments_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_substitute_assignments_substitute_player_id_fkey"
            columns: ["substitute_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_substitute_requests: {
        Row: {
          archived: boolean | null
          created_at: string | null
          id: string
          marked_by: string | null
          match_id: string | null
          needs_substitute: boolean | null
          notes: string | null
          player_id: string
          team_id: string | null
          team_name: string | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          marked_by?: string | null
          match_id?: string | null
          needs_substitute?: boolean | null
          notes?: string | null
          player_id: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          marked_by?: string | null
          match_id?: string | null
          needs_substitute?: boolean | null
          notes?: string | null
          player_id?: string
          team_id?: string | null
          team_name?: string | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_substitute_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_substitute_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          season_id: string | null
          updated_at: string
        }
        Insert: {
          captain_id?: string | null
          created_at?: string
          id?: string
          league?: string | null
          name: string
          season?: string | null
          season_id?: string | null
          updated_at?: string
        }
        Update: {
          captain_id?: string | null
          created_at?: string
          id?: string
          league?: string | null
          name?: string
          season?: string | null
          season_id?: string | null
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
      permanently_delete_profile: {
        Args: { profile_id: string }
        Returns: undefined
      }
      restore_profile: { Args: { profile_id: string }; Returns: undefined }
      soft_delete_profile: { Args: { profile_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "board_member"
        | "trainer"
        | "member"
        | "vorstand"
        | "mannschaftsfuehrer"
        | "player"
        | "mitglied"
        | "moderator"
        | "damen"
        | "senioren"
        | "jugend"
        | "volleyball"
        | "entwickler"
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
      app_role: [
        "admin",
        "board_member",
        "trainer",
        "member",
        "vorstand",
        "mannschaftsfuehrer",
        "player",
        "mitglied",
        "moderator",
        "damen",
        "senioren",
        "jugend",
        "volleyball",
        "entwickler",
      ],
    },
  },
} as const
