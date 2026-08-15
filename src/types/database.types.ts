// Hand-written to match supabase/migrations/0001-0007 exactly. If you ever
// link this project to the Supabase CLI, prefer regenerating with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts
// and reconcile any drift against this file (the convenience Row interfaces
// below - Profile, FileResource, Course, etc. - are hand-added and not part
// of the CLI output, so keep them if you regenerate).

// ----------------------------------------------------------------------------
// ENUMS  (supabase/migrations/0001_initial_schema.sql)
// ----------------------------------------------------------------------------
export type UserRole = "guest" | "student" | "verified_student" | "seller" | "admin" | "super_admin";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type FileVisibility = "draft" | "published" | "archived" | "rejected";
export type FilePricingType = "free" | "paid";
export type FileKind = "pdf" | "ppt" | "docx" | "zip" | "image" | "other";
export type ResourceCategory =
  | "notes" | "quiz_questions" | "mid_questions" | "final_questions"
  | "assignment" | "lab_report" | "project" | "presentation_slide" | "research_report";
export type PurchaseStatus = "pending" | "completed" | "refunded" | "failed";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type TransactionType = "purchase" | "commission" | "payout" | "refund" | "wallet_topup";
export type ReportReason = "wrong_course" | "fake_file" | "duplicate" | "blank_pdf" | "copyright" | "spam" | "other";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";
export type NotificationType =
  | "upload_approved"
  | "upload_rejected"
  | "purchase_completed"
  | "payout_completed"
  | "review_received"
  | "new_follower"
  | "trending_file"
  | "report_update"
  | "seller_approved"
  | "seller_rejected"
  | "purchase_pending"
  | "purchase_approved"
  | "purchase_rejected" | "payout_requested" | "payment_submitted";

// ----------------------------------------------------------------------------
// ROW TYPES - one per table, in schema order
// ----------------------------------------------------------------------------
export interface University {
  id: string;
  name: string;
  short_name: string;
  domain: string[];
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  university_id: string;
  name: string;
  short_name: string;
  created_at: string;
}

export interface Course {
  id: string;
  department_id: string;
  course_code: string;
  course_name: string;
  credit: number | null; // added in 0007_full_course_catalog.sql
  created_at: string;
}

export interface Teacher {
  id: string;
  university_id: string;
  full_name: string;
  short_code: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  university_id: string | null;
  department_id: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  semester: string | null;
  batch: string | null;
  student_id: string | null;
  university_email: string | null;
  university_email_verified: boolean;
  student_id_verification_status: VerificationStatus;
  student_id_document_url: string | null;
  is_seller: boolean;
  seller_bio: string | null;
  seller_bkash_number: string | null;
  phone_number: string | null; // normalized Bangladesh number: +8801XXXXXXXXX
  wallet_balance_cents: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface Follower {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface FileResource {
  id: string;
  seller_id: string;
  university_id: string;
  department_id: string | null;
  course_id: string | null;
  teacher_id: string | null;
  title: string;
  description: string | null;
  category: ResourceCategory;
  file_kind: FileKind;
  language: string;
  year: number | null;
  semester: string | null; // added in 0006_semester_and_seller_index.sql
  pricing_type: FilePricingType;
  price_cents: number;
  storage_path: string;
  preview_storage_path: string | null;
  thumbnail_url: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  file_hash: string | null;
  ai_summary: string | null;
  ai_keywords: string[] | null;
  ai_difficulty: string | null;
  ai_reading_time_minutes: number | null;
  visibility: FileVisibility;
  rejection_reason: string | null;
  views_count: number;
  downloads_count: number;
  average_rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface FileTag {
  file_id: string;
  tag_id: string;
}

export interface FileImage {
  id: string;
  file_id: string;
  storage_path: string;
  sort_order: number;
}

export interface Bundle {
  id: string;
  seller_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  price_cents: number;
  discount_percent: number;
  visibility: FileVisibility;
  created_at: string;
}

export interface BundleFile {
  bundle_id: string;
  file_id: string;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  file_id: string | null;
  bundle_id: string | null;
  amount_cents: number;
  commission_cents: number;
  seller_earning_cents: number;
  status: PurchaseStatus;
  payment_method: string | null;
  payment_reference: string | null;
  buyer_bkash_number: string | null;
  payment_submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  invoice_number: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  profile_id: string;
  type: TransactionType;
  amount_cents: number;
  related_purchase_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  seller_id: string;
  amount_cents: number;
  status: PayoutStatus;
  payment_method: string | null;
  payment_account_number: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface ResourceCommissionSettings {
  file_id: string;
  commission_percent: number;
  updated_at: string;
}

export interface SellerPaymentSettings {
  seller_id: string;
  bkash_number: string;
  updated_at: string;
}

export interface PublicPaymentSettings {
  id: boolean;
  bkash_number: string;
  updated_at: string;
}

export interface PlatformPaymentSettings {
  id: boolean;
  bkash_number: string;
  default_commission_percent: number;
  updated_at: string;
}

export interface DownloadWatermark {
  id: string;
  purchase_id: string;
  file_id: string;
  buyer_id: string;
  watermark_text: string;
  invisible_token: string | null;
  downloaded_at: string;
}

export interface Review {
  id: string;
  file_id: string;
  reviewer_id: string;
  purchase_id: string | null;
  rating: number; // 1-5
  comment: string | null;
  helpful_votes: number;
  created_at: string;
}

export interface ReviewVote {
  review_id: string;
  voter_id: string;
}

export interface Report {
  id: string;
  file_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
}

export interface ProfileBadge {
  profile_id: string;
  badge_id: string;
  awarded_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Wishlist {
  profile_id: string;
  file_id: string;
  created_at: string;
}

export interface RecentlyViewed {
  profile_id: string;
  file_id: string;
  viewed_at: string;
}

export type SupportTicketCategory = "suggestion" | "complaint" | "general" | "payment" | "resource" | "seller" | "account" | "purchase";
export type SupportTicketStatus = "new" | "in_review" | "resolved";

export interface SupportTicket {
  id: string;
  user_id: string;
  category: SupportTicketCategory;
  subject: string | null;
  message: string;
  page_path: string | null;
  status: SupportTicketStatus;
  admin_reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface FileDailyStat {
  file_id: string;
  date: string;
  views: number;
  downloads: number;
  sales: number;
  revenue_cents: number;
}

export interface PlatformDailyStat {
  date: string;
  new_users: number;
  active_users: number;
  total_sales: number;
  total_revenue_cents: number;
  total_commission_cents: number;
}

// ----------------------------------------------------------------------------
// Helper: builds a Supabase Table entry (Row/Insert/Update/Relationships)
// from a Row type. Insert/Update are modeled as Partial<Row>, matching how
// this project's server actions already build payloads (see
// src/lib/validations.ts) - looser than per-table required-field precision,
// but avoids 26 bespoke Insert/Update types while still giving every table
// real column names and types instead of `any`.
//
// `Relationships: []` is required to structurally satisfy postgrest-js's
// GenericTable type (node_modules/@supabase/postgrest-js/src/types/common/
// common.ts). Omitting it doesn't cause a visible type error on this file -
// it silently fails to match GenericSchema at the createClient<Database>()
// call site instead, which makes TypeScript drop the whole generic and
// fall back to untyped queries (every .select() resolving to `never`).
// This bit everyone here once already - if a future Supabase client
// upgrade adds more required fields to GenericTable, the symptom will look
// identical: every table/property except the top-level Database shape
// itself reporting "does not exist on type 'never'".
// ----------------------------------------------------------------------------
type Table<Row> = {
  Row: Row & Record<string, unknown>;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row> & Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      universities: Table<University>;
      departments: Table<Department>;
      courses: Table<Course>;
      teachers: Table<Teacher>;
      profiles: Table<Profile>;
      followers: Table<Follower>;
      tags: Table<Tag>;
      files: Table<FileResource>;
      file_tags: Table<FileTag>;
      file_images: Table<FileImage>;
      bundles: Table<Bundle>;
      bundle_files: Table<BundleFile>;
      purchases: Table<Purchase>;
      wallet_transactions: Table<WalletTransaction>;
      payouts: Table<Payout>;
      resource_commission_settings: Table<ResourceCommissionSettings>;
      seller_payment_settings: Table<SellerPaymentSettings>;
      platform_payment_settings: Table<PlatformPaymentSettings>;
      public_payment_settings: Table<PublicPaymentSettings>;
      download_watermarks: Table<DownloadWatermark>;
      reviews: Table<Review>;
      review_votes: Table<ReviewVote>;
      reports: Table<Report>;
      badges: Table<Badge>;
      profile_badges: Table<ProfileBadge>;
      audit_logs: Table<AuditLog>;
      wishlists: Table<Wishlist>;
      recently_viewed: Table<RecentlyViewed>;
      notifications: Table<Notification>;
      support_tickets: Table<SupportTicket>;
      file_daily_stats: Table<FileDailyStat>;
      platform_daily_stats: Table<PlatformDailyStat>;
    };
    Views: Record<string, never>;
    Functions: {
      // supabase/migrations/0005_rpc_functions.sql
      increment_download_count: {
        Args: { p_file_id: string } & Record<string, unknown>;
        Returns: void;
      };
      increment_view_count: {
        Args: { p_file_id: string } & Record<string, unknown>;
        Returns: void;
      };
      recompute_file_rating: {
        Args: { p_file_id: string } & Record<string, unknown>;
        Returns: void;
      };
      approve_manual_bkash_purchase: {
        Args: { p_purchase_id: string } & Record<string, unknown>;
        Returns: void;
      };
      reject_manual_bkash_purchase: {
        Args: { p_purchase_id: string; p_reason: string } & Record<string, unknown>;
        Returns: void;
      };
      complete_seller_payout: {
        Args: { p_payout_id: string } & Record<string, unknown>;
        Returns: void;
      };
      reject_seller_payout: {
        Args: { p_payout_id: string; p_reason: string } & Record<string, unknown>;
        Returns: void;
      };
      request_seller_payout: {
        Args: { p_amount_cents: number } & Record<string, unknown>;
        Returns: string;
      };
      set_resource_commission: {
        Args: { p_file_id: string; p_commission_percent: number | null } & Record<string, unknown>;
        Returns: void;
      };
      update_platform_payment_settings: {
        Args: { p_bkash_number: string; p_default_commission_percent: number } & Record<string, unknown>;
        Returns: void;
      };
      save_seller_bkash_number: {
        Args: { p_bkash_number: string } & Record<string, unknown>;
        Returns: void;
      };
      request_seller_verification: {
        Args: { p_university_email: string; p_bkash_number: string; p_student_id_document_path: string } & Record<string, unknown>;
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      verification_status: VerificationStatus;
      file_visibility: FileVisibility;
      file_pricing_type: FilePricingType;
      file_kind: FileKind;
      resource_category: ResourceCategory;
      purchase_status: PurchaseStatus;
      payout_status: PayoutStatus;
      transaction_type: TransactionType;
      report_reason: ReportReason;
      report_status: ReportStatus;
      notification_type: NotificationType;
    };
  };
}
