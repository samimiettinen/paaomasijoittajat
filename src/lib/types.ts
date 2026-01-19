// Database types for the member management system

export type MembershipStatus = 'active' | 'pending' | 'inactive' | 'removed';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type ParticipantStatus = 'invited' | 'confirmed' | 'declined' | 'attended' | 'no_show';
export type AdminLevel = 'super' | 'regular';

export interface Member {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  email: string | null;
  secondary_email: string | null;
  organization: string | null;
  organization_role: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  membership_status: MembershipStatus;
  is_admin: boolean;
  notes: string | null;
}

export interface Event {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  status: EventStatus;
  created_by: string | null;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  member_id: string;
  status: ParticipantStatus;
  invited_at: string;
  calendar_invite_sent: boolean;
  member?: Member;
}

export interface Admin {
  id: string;
  member_id: string;
  admin_level: AdminLevel;
  created_at: string;
  member?: Member;
}

// Form types
export interface MemberFormData {
  first_name: string;
  last_name: string;
  mobile_phone: string;
  email?: string;
  secondary_email?: string;
  organization?: string;
  organization_role?: string;
  linkedin_url?: string;
  github_url?: string;
  membership_status: MembershipStatus;
  is_admin: boolean;
  notes?: string;
}

export interface EventFormData {
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location_name?: string;
  location_address?: string;
  location_city?: string;
  status: EventStatus;
}
