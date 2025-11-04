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
      board_documents: {
        Row: {
          author_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      board_flyers: {
        Row: {
          author_id: string
          created_at: string
          id: string
          image_name: string
          image_path: string
          image_size: number | null
          image_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          image_name: string
          image_path: string
          image_size?: number | null
          image_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          image_name?: string
          image_path?: string
          image_size?: number | null
          image_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      board_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_events: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          event_date: string
          id: string
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_halls: {
        Row: {
          address: string | null
          created_at: string
          hall_number: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          hall_number: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          hall_number?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      club_settings: {
        Row: {
          board_chairman: string | null
          board_deputy: string | null
          board_secretary: string | null
          board_treasurer: string | null
          board_youth_leader: string | null
          club_name: string | null
          contact_address: string | null
          contact_email: string | null
          contact_facebook: string | null
          contact_phone: string | null
          contact_website: string | null
          created_at: string
          email_from_address: string | null
          email_provider_type: string | null
          email_smtp_password: string | null
          email_smtp_port: number | null
          email_smtp_server: string | null
          email_smtp_username: string | null
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          show_feedback_section: boolean
          updated_at: string
        }
        Insert: {
          board_chairman?: string | null
          board_deputy?: string | null
          board_secretary?: string | null
          board_treasurer?: string | null
          board_youth_leader?: string | null
          club_name?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_facebook?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string
          email_from_address?: string | null
          email_provider_type?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_server?: string | null
          email_smtp_username?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          show_feedback_section?: boolean
          updated_at?: string
        }
        Update: {
          board_chairman?: string | null
          board_deputy?: string | null
          board_secretary?: string | null
          board_treasurer?: string | null
          board_youth_leader?: string | null
          club_name?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_facebook?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string
          email_from_address?: string | null
          email_provider_type?: string | null
          email_smtp_password?: string | null
          email_smtp_port?: number | null
          email_smtp_server?: string | null
          email_smtp_username?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          show_feedback_section?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_distribution_lists: {
        Row: {
          created_at: string
          created_by: string
          groups: string[]
          id: string
          manual_emails: string[]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          groups?: string[]
          id?: string
          manual_emails?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          groups?: string[]
          id?: string
          manual_emails?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_availability: {
        Row: {
          created_at: string
          id: string
          match_id: string
          notes: string | null
          player_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          notes?: string | null
          player_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          notes?: string | null
          player_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_availability_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_pins: {
        Row: {
          created_at: string
          id: string
          match_id: string
          spielpartie_pin: string | null
          spielpin: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          spielpartie_pin?: string | null
          spielpin: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          spielpartie_pin?: string | null
          spielpin?: string
          updated_at?: string
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
          category: string
          club_team: string | null
          created_at: string
          date: string
          home_score: number | null
          home_team: string | null
          id: string
          location: string
          opponent: string
          status: string
          team: string
          time: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          away_team?: string | null
          category?: string
          club_team?: string | null
          created_at?: string
          date: string
          home_score?: number | null
          home_team?: string | null
          id?: string
          location: string
          opponent: string
          status?: string
          team: string
          time: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          away_team?: string | null
          category?: string
          club_team?: string | null
          created_at?: string
          date?: string
          home_score?: number | null
          home_team?: string | null
          id?: string
          location?: string
          opponent?: string
          status?: string
          team?: string
          time?: string
          updated_at?: string
        }
        Relationships: []
      }
      pin_import_logs: {
        Row: {
          created_at: string
          failed_count: number
          id: string
          import_date: string
          log_data: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          failed_count: number
          id?: string
          import_date?: string
          log_data: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          failed_count?: number
          id?: string
          import_date?: string
          log_data?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birthday: string | null
          city: string | null
          created_at: string
          default_role: string | null
          deleted_at: string | null
          email: string | null
          first_name: string | null
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
          user_id: string | null
        }
        Insert: {
          birthday?: string | null
          city?: string | null
          created_at?: string
          default_role?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
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
          user_id?: string | null
        }
        Update: {
          birthday?: string | null
          city?: string | null
          created_at?: string
          default_role?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          category: string
          created_at: string
          end_year: number
          id: string
          is_archived: boolean
          is_current: boolean
          label: string
          start_year: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          end_year: number
          id: string
          is_archived?: boolean
          is_current?: boolean
          label: string
          start_year: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          end_year?: number
          id?: string
          is_archived?: boolean
          is_current?: boolean
          label?: string
          start_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          is_captain: boolean
          member_id: string
          position: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_captain?: boolean
          member_id: string
          position?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_captain?: boolean
          member_id?: string
          position?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_substitute_assignments: {
        Row: {
          approved_by: string | null
          archived: boolean
          created_at: string
          id: string
          notes: string | null
          requested_by: string
          status: string
          substitute_player_id: string
          substitute_team_name: string
          team_name: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          requested_by: string
          status?: string
          substitute_player_id: string
          substitute_team_name: string
          team_name: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          requested_by?: string
          status?: string
          substitute_player_id?: string
          substitute_team_name?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_substitute_requests: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          marked_by: string
          match_id: string | null
          needs_substitute: boolean
          notes: string | null
          player_id: string
          team_name: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          marked_by: string
          match_id?: string | null
          needs_substitute?: boolean
          notes?: string | null
          player_id: string
          team_name: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          marked_by?: string
          match_id?: string | null
          needs_substitute?: boolean
          notes?: string | null
          player_id?: string
          team_name?: string
          updated_at?: string
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
        ]
      }
      teams: {
        Row: {
          category: string
          created_at: string
          division: string | null
          home_match: Json | null
          id: string
          league: string
          name: string
          season_id: string
          training_slots: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          division?: string | null
          home_match?: Json | null
          id?: string
          league: string
          name: string
          season_id: string
          training_slots?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          division?: string | null
          home_match?: Json | null
          id?: string
          league?: string
          name?: string
          season_id?: string
          training_slots?: Json
          updated_at?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          member1_id: string
          member2_id: string
          notes: string | null
          participants: string[]
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          id?: string
          member1_id?: string
          member2_id?: string
          notes?: string | null
          participants?: string[]
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          member1_id?: string
          member2_id?: string
          notes?: string | null
          participants?: string[]
          time?: string
          updated_at?: string
        }
        Relationships: []
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
      get_first_user_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
        | "moderator"
        | "player"
        | "substitute"
        | "vorstand"
        | "mannschaftsfuehrer"
        | "senioren"
        | "mitglieder"
        | "mitglied"
        | "damen"
        | "jugend"
        | "entwickler"
        | "volleyball"
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
        "moderator",
        "player",
        "substitute",
        "vorstand",
        "mannschaftsfuehrer",
        "senioren",
        "mitglieder",
        "mitglied",
        "damen",
        "jugend",
        "entwickler",
        "volleyball",
      ],
    },
  },
} as const
