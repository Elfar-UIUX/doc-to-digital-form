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
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          reference: string | null
          student_id: string
          type: Database["public"]["Enums"]["ledger_entry_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          reference?: string | null
          student_id: string
          type: Database["public"]["Enums"]["ledger_entry_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reference?: string | null
          student_id?: string
          type?: Database["public"]["Enums"]["ledger_entry_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminder_jobs: {
        Row: {
          channel: string
          created_at: string
          id: string
          last_error: string | null
          scheduled_for: string
          session_id: string
          status: Database["public"]["Enums"]["reminder_status"]
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          scheduled_for: string
          session_id: string
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          scheduled_for?: string
          session_id?: string
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_end_at: string | null
          actual_start_at: string | null
          created_at: string
          id: string
          notes: string | null
          scheduled_end_at: string
          scheduled_start_at: string
          status: Database["public"]["Enums"]["session_status"]
          student_id: string
          updated_at: string
          whatsapp_invite_message_id: string | null
          zoom_join_url: string | null
          zoom_meeting_id: string | null
          zoom_start_url: string | null
        }
        Insert: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_end_at: string
          scheduled_start_at: string
          status?: Database["public"]["Enums"]["session_status"]
          student_id: string
          updated_at?: string
          whatsapp_invite_message_id?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_end_at?: string
          scheduled_start_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          student_id?: string
          updated_at?: string
          whatsapp_invite_message_id?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone_e164: string | null
          price_per_hour: number
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          phone_e164?: string | null
          price_per_hour?: number
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone_e164?: string | null
          price_per_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_student_balance: { Args: { student_uuid: string }; Returns: number }
    }
    Enums: {
      ledger_entry_type:
        | "SESSION_CHARGE"
        | "PAYMENT_CONFIRMATION"
        | "ADJUSTMENT"
      reminder_status: "PENDING" | "SENT" | "FAILED"
      session_status: "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW"
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
      ledger_entry_type: [
        "SESSION_CHARGE",
        "PAYMENT_CONFIRMATION",
        "ADJUSTMENT",
      ],
      reminder_status: ["PENDING", "SENT", "FAILED"],
      session_status: ["SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"],
    },
  },
} as const
