/**
 * Hand-rolled Database type for the columns the app currently reads/writes.
 * Replace with `supabase gen types typescript --project-id ... --schema public`
 * once the CLI is set up — that auto-generates a complete and accurate type.
 *
 * Source of truth: docs/database-schema.md, supabase/migrations/0001_init.sql
 * + 0002_seed_orrnnail.sql.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string | null;
          phone: string | null;
          depositor_name: string | null;
          avatar_url: string | null;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      shops: {
        Row: {
          id: string;
          handle: string;
          name: string;
          owner_id: string;
          phone: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          hours_open: string | null;
          hours_close: string | null;
          hours_break_start: string | null;
          hours_break_end: string | null;
          closed_weekdays: number[] | null;
          hours_note: string | null;
          caution_note: string | null;
          parking_info: string | null;
          map_badge: string | null;
          account_bank: string | null;
          account_number: string | null;
          deposit_amount: number | null;
          profile_image_path: string | null;
          background_image_path: string | null;
          kakao_channel_id: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
      };
      service_categories: {
        Row: {
          id: string;
          shop_id: string;
          code: string;
          name: string;
          sort_order: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      arts: {
        Row: {
          id: string;
          shop_id: string;
          service_category_id: string;
          code: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          image_path: string | null;
          is_this_month: boolean;
          sort_order: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      staff: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          bio: string | null;
          avatar_path: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          shop_id: string;
          service_category_id: string;
          art_id: string;
          staff_id: string | null;
          customer_user_id: string | null;
          customer_name: string;
          customer_phone: string;
          depositor_name: string | null;
          reservation_date: string;
          reservation_time: string;
          duration_minutes: number;
          gel_self_removal: boolean;
          gel_other_removal: boolean;
          extension_count: number;
          reference_image_path: string | null;
          notes: string | null;
          art_name: string;
          total_price: number;
          deposit_amount: number;
          deposit_paid_at: string | null;
          status: ReservationStatus;
          status_changed_at: string;
          status_changed_by: string | null;
          cancel_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          shop_id: string;
          service_category_id: string;
          art_id: string;
          staff_id?: string | null;
          customer_user_id?: string | null;
          customer_name: string;
          customer_phone: string;
          depositor_name?: string | null;
          reservation_date: string;
          reservation_time: string;
          duration_minutes: number;
          gel_self_removal?: boolean;
          gel_other_removal?: boolean;
          extension_count?: number;
          reference_image_path?: string | null;
          notes?: string | null;
          art_name: string;
          total_price: number;
          deposit_amount: number;
        };
      };
    };
    Functions: {
      cancel_reservation: {
        Args: { p_token: string };
        Returns: void;
      };
    };
    Enums: {
      reservation_status: ReservationStatus;
    };
  };
}

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "no_show"
  | "completed";
