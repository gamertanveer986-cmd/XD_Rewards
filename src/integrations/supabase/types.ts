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
      ad_views: {
        Row: {
          ad_duration: number
          completed: boolean
          earnings: number
          id: string
          user_id: string
          watched_at: string | null
        }
        Insert: {
          ad_duration: number
          completed?: boolean
          earnings: number
          id?: string
          user_id: string
          watched_at?: string | null
        }
        Update: {
          ad_duration?: number
          completed?: boolean
          earnings?: number
          id?: string
          user_id?: string
          watched_at?: string | null
        }
        Relationships: []
      }
      admob_config: {
        Row: {
          app_id: string
          banner_ad_unit_id: string | null
          id: string
          interstitial_ad_unit_id: string | null
          is_testing: boolean | null
          rewarded_ad_unit_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          app_id: string
          banner_ad_unit_id?: string | null
          id?: string
          interstitial_ad_unit_id?: string | null
          is_testing?: boolean | null
          rewarded_ad_unit_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          app_id?: string
          banner_ad_unit_id?: string | null
          id?: string
          interstitial_ad_unit_id?: string | null
          is_testing?: boolean | null
          rewarded_ad_unit_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          created_at: string | null
          current_streak: number
          id: string
          last_claim_date: string | null
          total_claimed: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_claim_date?: string | null
          total_claimed?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_claim_date?: string | null
          total_claimed?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gift_card_products: {
        Row: {
          brand: string
          created_at: string
          denomination: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          denomination: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          denomination?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      gift_card_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          processed_at: string | null
          product_id: string
          redemption_code: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          processed_at?: string | null
          product_id: string
          redemption_code?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          product_id?: string
          redemption_code?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "gift_card_products"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
          value?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          sent_by: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          sent_by?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          sent_by?: string | null
          title?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          notification_id: string
          read: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_id: string
          read?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_id?: string
          read?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          ads_watched: number
          avatar_url: string | null
          birthday: string | null
          created_at: string | null
          display_name: string | null
          id: string
          non_withdrawable_balance: number
          payment_status: string | null
          profile_completed: boolean | null
          referral_code: string | null
          referrals_count: number
          referred_by: string | null
          total_earnings: number
          updated_at: string | null
          upi_id: string | null
          user_id: string
          username: string | null
          withdrawable_balance: number
        }
        Insert: {
          ads_watched?: number
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          non_withdrawable_balance?: number
          payment_status?: string | null
          profile_completed?: boolean | null
          referral_code?: string | null
          referrals_count?: number
          referred_by?: string | null
          total_earnings?: number
          updated_at?: string | null
          upi_id?: string | null
          user_id: string
          username?: string | null
          withdrawable_balance?: number
        }
        Update: {
          ads_watched?: number
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          non_withdrawable_balance?: number
          payment_status?: string | null
          profile_completed?: boolean | null
          referral_code?: string | null
          referrals_count?: number
          referred_by?: string | null
          total_earnings?: number
          updated_at?: string | null
          upi_id?: string | null
          user_id?: string
          username?: string | null
          withdrawable_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_public: {
        Row: {
          ads_watched: number | null
          avatar_url: string | null
          display_name: string | null
          referrals_count: number | null
          total_earnings: number | null
        }
        Insert: {
          ads_watched?: number | null
          avatar_url?: string | null
          display_name?: string | null
          referrals_count?: number | null
          total_earnings?: number | null
        }
        Update: {
          ads_watched?: number | null
          avatar_url?: string | null
          display_name?: string | null
          referrals_count?: number | null
          total_earnings?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_referral_code: {
        Args: { p_referral_code: string; p_user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests: number
          p_user_id: string
          p_window_minutes: number
        }
        Returns: boolean
      }
      claim_daily_reward: { Args: { p_user_id: string }; Returns: Json }
      get_public_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          ads_watched: number
          avatar_url: string
          display_name: string
          is_current_user: boolean
          rank_position: number
          referrals_count: number
          total_earnings: number
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_gift_card: {
        Args: { p_product_id: string; p_user_id: string }
        Returns: Json
      }
      record_ad_completion: {
        Args: { p_ad_duration: number; p_user_id: string }
        Returns: Json
      }
      redeem_gift_card: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      verify_admin_access: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
