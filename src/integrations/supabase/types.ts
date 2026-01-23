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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          admin_level: Database["public"]["Enums"]["admin_level"]
          created_at: string
          id: string
          member_id: string
        }
        Insert: {
          admin_level?: Database["public"]["Enums"]["admin_level"]
          created_at?: string
          id?: string
          member_id: string
        }
        Update: {
          admin_level?: Database["public"]["Enums"]["admin_level"]
          created_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          email_address: string
          event_id: string
          id: string
          member_id: string
          sent_at: string
          sent_by_member_id: string | null
        }
        Insert: {
          email_address: string
          event_id: string
          id?: string
          member_id: string
          sent_at?: string
          sent_by_member_id?: string | null
        }
        Update: {
          email_address?: string
          event_id?: string
          id?: string
          member_id?: string
          sent_at?: string
          sent_by_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_sent_by_member_id_fkey"
            columns: ["sent_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          created_by: string | null
          greeting: string | null
          id: string
          intro_text: string | null
          invitation_text: string | null
          name: string
          signature: string | null
          subject: string | null
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          greeting?: string | null
          id?: string
          intro_text?: string | null
          invitation_text?: string | null
          name: string
          signature?: string | null
          subject?: string | null
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          greeting?: string | null
          id?: string
          intro_text?: string | null
          invitation_text?: string | null
          name?: string
          signature?: string | null
          subject?: string | null
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          calendar_invite_sent: boolean
          early_arrival: boolean | null
          event_id: string
          id: string
          invitation_token: string | null
          invited_at: string
          member_id: string
          status: Database["public"]["Enums"]["participant_status"]
        }
        Insert: {
          calendar_invite_sent?: boolean
          early_arrival?: boolean | null
          event_id: string
          id?: string
          invitation_token?: string | null
          invited_at?: string
          member_id: string
          status?: Database["public"]["Enums"]["participant_status"]
        }
        Update: {
          calendar_invite_sent?: boolean
          early_arrival?: boolean | null
          event_id?: string
          id?: string
          invitation_token?: string | null
          invited_at?: string
          member_id?: string
          status?: Database["public"]["Enums"]["participant_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_resources: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          event_id: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          resource_type: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          resource_type: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          resource_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_resources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          email_signature: string | null
          end_time: string
          event_date: string
          id: string
          invitation_text: string | null
          location_address: string | null
          location_city: string | null
          location_name: string | null
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          email_signature?: string | null
          end_time: string
          event_date: string
          id?: string
          invitation_text?: string | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          email_signature?: string | null
          end_time?: string
          event_date?: string
          id?: string
          invitation_text?: string | null
          location_address?: string | null
          location_city?: string | null
          location_name?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_visits: {
        Row: {
          id: string
          ip_address: string | null
          member_id: string
          user_agent: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          member_id: string
          user_agent?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          member_id?: string
          user_agent?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_visits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string
          github_url: string | null
          id: string
          is_admin: boolean
          last_name: string
          linkedin_url: string | null
          membership_status: Database["public"]["Enums"]["membership_status"]
          mobile_phone: string
          notes: string | null
          organization: string | null
          organization_role: string | null
          secondary_email: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          github_url?: string | null
          id?: string
          is_admin?: boolean
          last_name: string
          linkedin_url?: string | null
          membership_status?: Database["public"]["Enums"]["membership_status"]
          mobile_phone: string
          notes?: string | null
          organization?: string | null
          organization_role?: string | null
          secondary_email?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          github_url?: string | null
          id?: string
          is_admin?: boolean
          last_name?: string
          linkedin_url?: string | null
          membership_status?: Database["public"]["Enums"]["membership_status"]
          mobile_phone?: string
          notes?: string | null
          organization?: string | null
          organization_role?: string | null
          secondary_email?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_member_id: { Args: never; Returns: string }
      get_member_id_by_token: { Args: { token_value: string }; Returns: string }
      get_rsvp_by_token: {
        Args: { token_value: string }
        Returns: {
          early_arrival: boolean
          event_date: string
          event_description: string
          event_end_time: string
          event_id: string
          event_location_address: string
          event_location_city: string
          event_location_name: string
          event_start_time: string
          event_title: string
          member_first_name: string
          member_last_name: string
          participant_id: string
          participant_status: string
        }[]
      }
      is_admin: { Args: { member_phone: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      update_rsvp_by_token: {
        Args: {
          new_early_arrival?: boolean
          new_status: string
          token_value: string
        }
        Returns: boolean
      }
    }
    Enums: {
      admin_level: "super" | "regular" | "vibe_coder"
      event_status: "draft" | "published" | "cancelled" | "completed"
      membership_status: "active" | "pending" | "inactive" | "removed"
      participant_status:
        | "invited"
        | "confirmed"
        | "declined"
        | "attended"
        | "no_show"
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
      admin_level: ["super", "regular", "vibe_coder"],
      event_status: ["draft", "published", "cancelled", "completed"],
      membership_status: ["active", "pending", "inactive", "removed"],
      participant_status: [
        "invited",
        "confirmed",
        "declined",
        "attended",
        "no_show",
      ],
    },
  },
} as const
