export type UserRole = 'owner' | 'admin' | 'employee';

export type RestaurantType =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'coffee_shop'
  | 'fast_food'
  | 'pizzeria'
  | 'sushi'
  | 'hookah'
  | 'other';

export type EmployeeStatus =
  | 'active'
  | 'on_leave'
  | 'terminated'
  | 'temporarily_unavailable';

export type ShiftStatus =
  | 'open'
  | 'partially_filled'
  | 'fully_filled'
  | 'urgent'
  | 'completed'
  | 'cancelled';

export type ReplacementStatus =
  | 'pending'
  | 'has_candidates'
  | 'approved'
  | 'cancelled';

export type NotificationStatus = 'unread' | 'read' | 'sent' | 'failed';

export type NotificationType =
  | 'shift_tomorrow'
  | 'shift_in_one_hour'
  | 'new_shift_available'
  | 'urgent_replacement'
  | 'booking_confirmed'
  | 'unfilled_shift'
  | 'replacement_request'
  | 'shift_cancelled'
  | 'staff_shortage'
  | 'weekly_statistics'
  | 'schedule_issue'
  | 'general';

export interface User {
  id: string;
  telegram_id: string;
  username?: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  photo_url?: string;
  role: UserRole;
  is_profile_completed: boolean;
  has_password?: boolean;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  employees_limit?: number;
  working_hours?: Record<string, string>;
  type: RestaurantType;
  staff_count: number;
  photo_url?: string;
  created_at: string;
  positions?: Position[];
  employees?: Employee[];
}

export interface InvitationToken {
  id: string;
  restaurant_id: string;
  token: string;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface InvitePreview {
  token: string;
  restaurant: Pick<
    Restaurant,
    'id' | 'name' | 'address' | 'city' | 'type' | 'phone'
  >;
}

export interface Position {
  id: string;
  restaurant_id: string;
  name: string;
  min_employees: number;
  max_employees: number;
  hourly_rate: number;
  shift_rate?: number;
}

export interface Employee {
  id: string;
  restaurant_id: string;
  user_id: string;
  position_id?: string;
  phone?: string;
  salary_rate?: number;
  hourly_rate?: number;
  desired_shifts_per_month: number;
  status: EmployeeStatus;
  created_at: string;
  user?: User;
  position?: Position;
  restaurant?: Restaurant;
}

export interface ShiftEmployee {
  id: string;
  shift_id: string;
  employee_id: string;
  assigned_at: string;
  employee?: Employee;
}

export interface Shift {
  id: string;
  restaurant_id: string;
  position_id: string;
  start_time: string;
  end_time: string;
  required_employees: number;
  status: ShiftStatus;
  is_urgent: boolean;
  created_at: string;
  position?: Position;
  restaurant?: Restaurant;
  assignments?: ShiftEmployee[];
  replacementRequests?: ReplacementRequest[];
}

export interface ReplacementRequest {
  id: string;
  shift_id: string;
  employee_id: string;
  candidate_employee_id?: string;
  status: ReplacementStatus;
  reason?: string;
  created_at: string;
  shift?: Shift;
  employee?: Employee;
  candidateEmployee?: Employee;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  status: NotificationStatus;
  related_shift_id?: string;
  created_at: string;
}

export interface Statistics {
  id: string;
  employee_id: string;
  month: string;
  worked_hours: number;
  worked_shifts: number;
  night_shifts: number;
  absences: number;
  replacements: number;
  expected_salary: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error' | 'urgent';
  title: string;
  body?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          setText: (text: string) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
      };
    };
  }
}
