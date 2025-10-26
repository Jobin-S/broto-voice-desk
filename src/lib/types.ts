export type AppRole = "student" | "admin";
export type ComplaintCategory = "mentor" | "admin" | "academic_counsellor" | "working_hub" | "peer" | "other";
export type ComplaintStatus = "open" | "in_progress" | "resolved";

export interface Profile {
  id: string;
  role: AppRole;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  student_id: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  attachment_id: string | null;
  status: ComplaintStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  student?: Profile;
}

export interface Attachment {
  id: string;
  owner_user_id: string;
  complaint_id: string | null;
  original_filename: string;
  stored_path: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
}

export interface ComplaintStatusHistory {
  id: string;
  complaint_id: string;
  changed_by_user_id: string;
  from_status: ComplaintStatus | null;
  to_status: ComplaintStatus;
  note_snapshot: string | null;
  changed_at: string;
}