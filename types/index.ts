// TypeScript definitions for Hinov Team Report (HTR)

export type AppRole = 'collaborateur' | 'directeur_admin' | 'super_admin';

export type ActivityStatus = 'en_attente' | 'en_cours' | 'terminee';

export type ReportStatus = 'brouillon' | 'soumis' | 'archive';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  job_title?: string;
  department?: string;
  role: AppRole;
  is_active: boolean;
  must_change_password: boolean;
  avatar_url?: string | null;
  custom_gemini_api_key?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  day_of_week: number; // 1 = Lundi, ..., 5 = Vendredi
  title: string;
  description?: string;
  category?: string;
  status: ActivityStatus;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReportItem {
  title: string;
  description?: string;
  status: ActivityStatus;
  category?: string;
}

export interface ReportSnapshot {
  activitiesByDay: Record<number, Activity[]>;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  status: ReportStatus;
  content_snapshot: Activity[];
  difficulties: string[];
  perspectives: string[];
  pdf_url?: string | null;
  submitted_at?: string | null;
  emailed_at?: string | null;
  email_recipient?: string | null;
  created_at?: string;
  updated_at?: string;
  // Join properties
  author?: UserProfile;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url?: string | null;
  director_email: string;
  superadmin_report_recipient?: string | null;
  reminder_cron?: string;
  smtp_from?: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  action: string;
  target_user_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
  actor?: UserProfile;
}

export interface WeekProgression {
  dayOfWeek: number; // 1 to 5
  dayName: string;
  dateStr: string;
  activityCount: number;
  hasCompletedActivities: boolean;
}

