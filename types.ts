export enum RoomType {
  SINGLE = 'Single',
  DOUBLE = 'Double',
  TRIPLE = 'Triple'
}

export enum RoomStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  MAINTENANCE = 'Maintenance'
}

export interface Tenant {
  id?: string | number;
  owner_id?: string; // Add this
  name: string;
  email: string;
  phone: string;
  roomNumber: string;
  rentAmount: number;
  rentStatus: 'Paid' | 'Pending' | 'Overdue';
  moveInDate?: string;
  joinDate?: string; // Add this - your DB uses this field name
  status: 'Active' | 'Notice Period' | 'Left';
  address?: string;
  auth_user_id?: string;
  created_at?: string; // Add this
}


export interface Room {
  id?: string | number;
  number: string;
  type: RoomType;
  status: RoomStatus;
  price: number;
  floor: number;
  capacity: number;
  currentOccupancy?: number; // Made optional
  current_occupancy?: number; // Alternative naming
}

export interface Payment {
  id?: string | number;
  tenantId: string | number;
  tenantName: string;
  amount: number;
  date: string;
  type: 'Rent' | 'Security Deposit' | 'Bill' | 'Other';
  method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Card';
  notes?: string;
}

export interface Expense {
  id?: string | number;
  title: string;
  amount: number;
  category: 'Maintenance' | 'Utilities' | 'Staff' | 'Supplies' | 'Other';
  date: string;
  description?: string;
  receipt?: string;
}

export interface Complaint {
  id?: number;
  tenantId: number;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  created_at?: string;
  tenantName?: string; // Add this optional property
}


export interface SettingsData {
  id?: string | number;
  pgName: string;
  address: string;
  defaultRentDay: number;
  managerName: string;
  managerPhone: string;
  managerEmail?: string;
  totalRooms?: number;
  defaultRent?: number;
}

// Alias for Settings
export interface Settings extends SettingsData {}

export interface MonthlyStat {
  name: string;
  revenue: number;
  expenses: number;
}

export interface DashboardStats {
  totalTenants: number;
  occupancyRate: number;
  totalRevenue: number;
  pendingDues: number;
}

export interface Invitation {
  id?: number;
  tenant_id: number;
  tenant_email: string;
  tenant_name: string;
  token: string;
  is_accepted: boolean;
  created_at?: string;
  expires_at?: string;
  accepted_at?: string;
}

// User Role Type
export type UserRole = 'owner' | 'tenant';
