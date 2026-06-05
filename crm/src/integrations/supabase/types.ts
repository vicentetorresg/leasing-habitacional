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
      app_settings: {
        Row: {
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      call_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          duration_seconds: number | null
          id: string
          lead_id: string
          notes: string | null
          outcome: string
          provider: string | null
          provider_call_sid_agent: string | null
          provider_call_sid_lead: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome: string
          provider?: string | null
          provider_call_sid_agent?: string | null
          provider_call_sid_lead?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string
          provider?: string | null
          provider_call_sid_agent?: string | null
          provider_call_sid_lead?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      daily_performance: {
        Row: {
          calls_goal: number
          calls_made: number
          calls_pct: number
          created_at: string
          date: string
          id: string
          scheduled_goal: number
          scheduled_made: number
          scheduled_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_goal?: number
          calls_made?: number
          calls_pct?: number
          created_at?: string
          date?: string
          id?: string
          scheduled_goal?: number
          scheduled_made?: number
          scheduled_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_goal?: number
          calls_made?: number
          calls_pct?: number
          created_at?: string
          date?: string
          id?: string
          scheduled_goal?: number
          scheduled_made?: number
          scheduled_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempts: number
          cc: string[] | null
          created_at: string
          email_to: string
          error_message: string | null
          html: string
          id: string
          lead_id: string
          processed_at: string | null
          reply_to: string[] | null
          status: string
          subject: string
        }
        Insert: {
          attempts?: number
          cc?: string[] | null
          created_at?: string
          email_to: string
          error_message?: string | null
          html: string
          id?: string
          lead_id: string
          processed_at?: string | null
          reply_to?: string[] | null
          status?: string
          subject: string
        }
        Update: {
          attempts?: number
          cc?: string[] | null
          created_at?: string
          email_to?: string
          error_message?: string | null
          html?: string
          id?: string
          lead_id?: string
          processed_at?: string | null
          reply_to?: string[] | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_calls: {
        Row: {
          created_at: string
          ejecutiva_user_id: string
          id: string
          lead_id: string | null
          lead_name: string
          lead_phone: string
          status: string
          twilio_call_sid: string | null
        }
        Insert: {
          created_at?: string
          ejecutiva_user_id: string
          id?: string
          lead_id?: string | null
          lead_name: string
          lead_phone: string
          status?: string
          twilio_call_sid?: string | null
        }
        Update: {
          created_at?: string
          ejecutiva_user_id?: string
          id?: string
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string
          status?: string
          twilio_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          advisor_id: string | null
          assigned_to: string | null
          created_at: string
          created_time: string | null
          email: string | null
          en_dicom: boolean | null
          external_id: string | null
          fecha_reserva: string | null
          id: string
          is_demo: boolean
          last_attempt_at: string | null
          mes_cierre: string | null
          name: string
          no_califica: boolean
          no_califica_razon: string | null
          phone: string
          previous_status: string | null
          priority: string
          proyecto: string | null
          rut: string | null
          scheduled_at: string | null
          sms_sent: boolean
          sort_order: number
          source: string
          status: string
          status_changed_at: string | null
          sueldo_liquido: number | null
          sueldo_liquido_raw: string | null
          uf_sin_bp: number | null
        }
        Insert: {
          advisor_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_time?: string | null
          email?: string | null
          en_dicom?: boolean | null
          external_id?: string | null
          fecha_reserva?: string | null
          id?: string
          is_demo?: boolean
          last_attempt_at?: string | null
          mes_cierre?: string | null
          name: string
          no_califica?: boolean
          no_califica_razon?: string | null
          phone: string
          previous_status?: string | null
          priority?: string
          proyecto?: string | null
          rut?: string | null
          scheduled_at?: string | null
          sms_sent?: boolean
          sort_order?: number
          source?: string
          status?: string
          status_changed_at?: string | null
          sueldo_liquido?: number | null
          sueldo_liquido_raw?: string | null
          uf_sin_bp?: number | null
        }
        Update: {
          advisor_id?: string | null
          assigned_to?: string | null
          created_at?: string
          created_time?: string | null
          email?: string | null
          en_dicom?: boolean | null
          external_id?: string | null
          fecha_reserva?: string | null
          id?: string
          is_demo?: boolean
          last_attempt_at?: string | null
          mes_cierre?: string | null
          name?: string
          no_califica?: boolean
          no_califica_razon?: string | null
          phone?: string
          previous_status?: string | null
          priority?: string
          proyecto?: string | null
          rut?: string | null
          scheduled_at?: string | null
          sms_sent?: boolean
          sort_order?: number
          source?: string
          status?: string
          status_changed_at?: string | null
          sueldo_liquido?: number | null
          sueldo_liquido_raw?: string | null
          uf_sin_bp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      manual_calls: {
        Row: {
          created_at: string
          id: string
          phone: string
          status: string
          twilio_call_sid: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          status?: string
          twilio_call_sid?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          status?: string
          twilio_call_sid?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          phone_e164: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          phone_e164?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          phone_e164?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string
          id: string
          lead_id: string | null
          reminder_minutes: number | null
          reminder_sent: boolean
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at: string
          id?: string
          lead_id?: string | null
          reminder_minutes?: number | null
          reminder_sent?: boolean
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string
          id?: string
          lead_id?: string | null
          reminder_minutes?: number | null
          reminder_sent?: boolean
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "admin" | "ejecutiva" | "asesor" | "dialer"
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
      app_role: ["admin", "ejecutiva", "asesor", "dialer"],
    },
  },
} as const
