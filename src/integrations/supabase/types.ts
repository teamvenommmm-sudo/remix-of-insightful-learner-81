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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cognitive_profiles: {
        Row: {
          cognitive_type: string
          confidence_score: number | null
          created_at: string
          feature_vector: Json | null
          id: string
          last_evaluated: string
          previous_types: Json | null
          reasoning: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cognitive_type?: string
          confidence_score?: number | null
          created_at?: string
          feature_vector?: Json | null
          id?: string
          last_evaluated?: string
          previous_types?: Json | null
          reasoning?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cognitive_type?: string
          confidence_score?: number | null
          created_at?: string
          feature_vector?: Json | null
          id?: string
          last_evaluated?: string
          previous_types?: Json | null
          reasoning?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_reports: {
        Row: {
          accuracy_trend: Json | null
          cognitive_type_at_time: string | null
          created_at: string
          id: string
          improvement_percentage: number | null
          period_end: string
          period_start: string
          report_data: Json | null
          report_type: string
          response_time_trend: Json | null
          retention_risk_score: number | null
          user_id: string
        }
        Insert: {
          accuracy_trend?: Json | null
          cognitive_type_at_time?: string | null
          created_at?: string
          id?: string
          improvement_percentage?: number | null
          period_end: string
          period_start: string
          report_data?: Json | null
          report_type?: string
          response_time_trend?: Json | null
          retention_risk_score?: number | null
          user_id: string
        }
        Update: {
          accuracy_trend?: Json | null
          cognitive_type_at_time?: string | null
          created_at?: string
          id?: string
          improvement_percentage?: number | null
          period_end?: string
          period_start?: string
          report_data?: Json | null
          report_type?: string
          response_time_trend?: Json | null
          retention_risk_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          abandonment_flag: boolean
          attempted_at: string
          difficulty_level: number | null
          hint_used: boolean
          id: string
          is_correct: boolean
          number_of_retries: number
          question_id: string
          response_time_ms: number | null
          selected_answer: string | null
          session_id: string
          time_between_attempts_ms: number | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          abandonment_flag?: boolean
          attempted_at?: string
          difficulty_level?: number | null
          hint_used?: boolean
          id?: string
          is_correct?: boolean
          number_of_retries?: number
          question_id: string
          response_time_ms?: number | null
          selected_answer?: string | null
          session_id: string
          time_between_attempts_ms?: number | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          abandonment_flag?: boolean
          attempted_at?: string
          difficulty_level?: number | null
          hint_used?: boolean
          id?: string
          is_correct?: boolean
          number_of_retries?: number
          question_id?: string
          response_time_ms?: number | null
          selected_answer?: string | null
          session_id?: string
          time_between_attempts_ms?: number | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty_level: number
          hint: string | null
          id: string
          options: Json
          question_text: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: number
          hint?: string | null
          id?: string
          options?: Json
          question_text: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: number
          hint?: string | null
          id?: string
          options?: Json
          question_text?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          cognitive_type: string | null
          created_at: string
          focus_topics: Json | null
          id: string
          is_active: boolean
          learning_strategy_summary: string | null
          practice_type: string | null
          recommended_difficulty: number | null
          review_schedule: Json | null
          time_limit_mode: string | null
          user_id: string
        }
        Insert: {
          cognitive_type?: string | null
          created_at?: string
          focus_topics?: Json | null
          id?: string
          is_active?: boolean
          learning_strategy_summary?: string | null
          practice_type?: string | null
          recommended_difficulty?: number | null
          review_schedule?: Json | null
          time_limit_mode?: string | null
          user_id: string
        }
        Update: {
          cognitive_type?: string | null
          created_at?: string
          focus_topics?: Json | null
          id?: string
          is_active?: boolean
          learning_strategy_summary?: string | null
          practice_type?: string | null
          recommended_difficulty?: number | null
          review_schedule?: Json | null
          time_limit_mode?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          ended_at: string | null
          id: string
          session_duration_seconds: number | null
          started_at: string
          topic_id: string | null
          total_correct: number
          total_questions_attempted: number
          total_retries: number
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          session_duration_seconds?: number | null
          started_at?: string
          topic_id?: string | null
          total_correct?: number
          total_questions_attempted?: number
          total_retries?: number
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          session_duration_seconds?: number | null
          started_at?: string
          topic_id?: string | null
          total_correct?: number
          total_questions_attempted?: number
          total_retries?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_gamification: {
        Row: {
          badges: Json
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          quizzes_completed: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: Json
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          quizzes_completed?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: Json
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          quizzes_completed?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_performance: {
        Row: {
          accuracy_rate: number | null
          avg_response_time_ms: number | null
          avg_retries: number | null
          id: string
          last_updated: string
          topic_id: string
          total_attempts: number
          total_correct: number
          user_id: string
        }
        Insert: {
          accuracy_rate?: number | null
          avg_response_time_ms?: number | null
          avg_retries?: number | null
          id?: string
          last_updated?: string
          topic_id: string
          total_attempts?: number
          total_correct?: number
          user_id: string
        }
        Update: {
          accuracy_rate?: number | null
          avg_response_time_ms?: number | null
          avg_retries?: number | null
          id?: string
          last_updated?: string
          topic_id?: string
          total_attempts?: number
          total_correct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_performance_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
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
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
