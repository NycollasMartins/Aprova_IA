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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string | null
          concurso_area: string | null
          created_at: string
          degree_area: string | null
          degree_name: string | null
          display_name: string | null
          email: string | null
          exam_date: string | null
          feeling: string | null
          focus_mode: boolean | null
          full_name: string | null
          has_children: boolean | null
          has_degree: boolean | null
          hours_per_day: number | null
          id: string
          level: string | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean
          reminders_enabled: boolean | null
          reviews_enabled: boolean | null
          routine_notes: string | null
          state: string | null
          studied_before: boolean | null
          target_concurso: string | null
          updated_at: string
          works: boolean | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          concurso_area?: string | null
          created_at?: string
          degree_area?: string | null
          degree_name?: string | null
          display_name?: string | null
          email?: string | null
          exam_date?: string | null
          feeling?: string | null
          focus_mode?: boolean | null
          full_name?: string | null
          has_children?: boolean | null
          has_degree?: boolean | null
          hours_per_day?: number | null
          id: string
          level?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean
          reminders_enabled?: boolean | null
          reviews_enabled?: boolean | null
          routine_notes?: string | null
          state?: string | null
          studied_before?: boolean | null
          target_concurso?: string | null
          updated_at?: string
          works?: boolean | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          concurso_area?: string | null
          created_at?: string
          degree_area?: string | null
          degree_name?: string | null
          display_name?: string | null
          email?: string | null
          exam_date?: string | null
          feeling?: string | null
          focus_mode?: boolean | null
          full_name?: string | null
          has_children?: boolean | null
          has_degree?: boolean | null
          hours_per_day?: number | null
          id?: string
          level?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean
          reminders_enabled?: boolean | null
          reviews_enabled?: boolean | null
          routine_notes?: string | null
          state?: string | null
          studied_before?: boolean | null
          target_concurso?: string | null
          updated_at?: string
          works?: boolean | null
        }
        Relationships: []
      }
      question_logs: {
        Row: {
          correct: number
          created_at: string
          id: string
          logged_at: string
          subject: string
          total: number
          user_id: string
          wrong: number
        }
        Insert: {
          correct?: number
          created_at?: string
          id?: string
          logged_at?: string
          subject: string
          total: number
          user_id: string
          wrong?: number
        }
        Update: {
          correct?: number
          created_at?: string
          id?: string
          logged_at?: string
          subject?: string
          total?: number
          user_id?: string
          wrong?: number
        }
        Relationships: []
      }
      revisions: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string
          id: string
          notes: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_min: number
          id: string
          notes: string | null
          scheduled_at: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          scheduled_at: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "user"
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
      app_role: ["owner", "admin", "user"],
    },
  },
} as const
