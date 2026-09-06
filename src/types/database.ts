export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actual_minutes: number | null
          address: string | null
          comment: string | null
          completed_at: string | null
          created_at: string
          currency_snapshot: string | null
          date: string
          id: string
          is_earnings_snapshot: boolean
          planned_minutes: number | null
          pomodoros_done: number
          rate_snapshot: number | null
          recurring_rule_id: string | null
          status: string
          subcategory_id: string
          timer_phase: string | null
          timer_started_at: string | null
          title: string
          travel_legs: number
          travel_minutes: number | null
          travel_one_way_minutes: number
          user_id: string | null
        }
        Insert: {
          actual_minutes?: number | null
          address?: string | null
          comment?: string | null
          completed_at?: string | null
          created_at?: string
          currency_snapshot?: string | null
          date: string
          id?: string
          is_earnings_snapshot?: boolean
          planned_minutes?: number | null
          pomodoros_done?: number
          rate_snapshot?: number | null
          recurring_rule_id?: string | null
          status?: string
          subcategory_id: string
          timer_phase?: string | null
          timer_started_at?: string | null
          title: string
          travel_legs?: number
          travel_minutes?: number | null
          travel_one_way_minutes?: number
          user_id?: string | null
        }
        Update: {
          actual_minutes?: number | null
          address?: string | null
          comment?: string | null
          completed_at?: string | null
          created_at?: string
          currency_snapshot?: string | null
          date?: string
          id?: string
          is_earnings_snapshot?: boolean
          planned_minutes?: number | null
          pomodoros_done?: number
          rate_snapshot?: number | null
          recurring_rule_id?: string | null
          status?: string
          subcategory_id?: string
          timer_phase?: string | null
          timer_started_at?: string | null
          title?: string
          travel_legs?: number
          travel_minutes?: number | null
          travel_one_way_minutes?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "v_activity_value"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      market_rates: {
        Row: {
          created_at: string
          currency: string
          hourly_rate: number
          id: string
          is_active: boolean
          is_earnings: boolean
          name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          hourly_rate: number
          id?: string
          is_active?: boolean
          is_earnings?: boolean
          name: string
        }
        Update: {
          created_at?: string
          currency?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          is_earnings?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          color: string
          created_at: string
          display_name: string
          id: string
          role: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_name: string
          id: string
          role?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          default_user_id: string | null
          id: string
          is_active: boolean
          planned_minutes: number
          subcategory_id: string
          title: string
          travel_legs: number
          travel_minutes: number | null
          travel_one_way_minutes: number
          weekday: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          default_user_id?: string | null
          id?: string
          is_active?: boolean
          planned_minutes: number
          subcategory_id: string
          title: string
          travel_legs?: number
          travel_minutes?: number | null
          travel_one_way_minutes?: number
          weekday: number
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          default_user_id?: string | null
          id?: string
          is_active?: boolean
          planned_minutes?: number
          subcategory_id?: string
          title?: string
          travel_legs?: number
          travel_minutes?: number | null
          travel_one_way_minutes?: number
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_default_user_id_fkey"
            columns: ["default_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "v_activity_value"
            referencedColumns: ["subcategory_id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          id: string
          is_active: boolean
          name: string
          rate_id: string | null
          sort_order: number
        }
        Insert: {
          category_id: string
          id?: string
          is_active?: boolean
          name: string
          rate_id?: string | null
          sort_order?: number
        }
        Update: {
          category_id?: string
          id?: string
          is_active?: boolean
          name?: string
          rate_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v_activity_value"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "subcategories_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "market_rates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_activity_value: {
        Row: {
          actual_minutes: number | null
          address: string | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          comment: string | null
          completed_at: string | null
          currency_snapshot: string | null
          date: string | null
          id: string | null
          is_earnings_snapshot: boolean | null
          // Заботу о ребёнке в выходные не оцениваем в деньгах —
          // этот признак объясняет, почему у записи нет стоимости.
          is_unpaid_weekend: boolean | null
          planned_minutes: number | null
          pomodoros_done: number | null
          rate_snapshot: number | null
          recurring_rule_id: string | null
          status: string | null
          subcategory_id: string | null
          subcategory_name: string | null
          timer_phase: string | null
          timer_started_at: string | null
          title: string | null
          travel_legs: number | null
          travel_minutes: number | null
          travel_one_way_minutes: number | null
          user_id: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_adult: { Args: never; Returns: boolean }
      // Досоздаёт пропущенные будние рабочие дни, возвращает их число.
      fill_workdays: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
