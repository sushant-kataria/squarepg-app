
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
  name: string;
  roomNumber: string;
  joinDate: string;
  status: 'Active' | 'Notice Period' | 'Left';
  rentStatus: 'Paid' | 'Pending' | 'Overdue';
  phone: string;
  email: string;
  rentAmount: number;
}

export interface Room {
  id?: string | number; 
  number: string;
  type: RoomType;
  status: RoomStatus;
  price: number;
  floor: number;
}

export interface Payment {
  id?: string | number;
  tenantId: string | number;
  tenantName: string;
  amount: number;
  date: string;
  type: 'Rent' | 'Security Deposit' | 'Bill' | 'Other';
  method: 'Cash' | 'UPI' | 'Bank Transfer';
}

export interface Expense {
  id?: string | number;
  title: string;
  amount: number;
  category: 'Maintenance' | 'Utilities' | 'Staff' | 'Supplies' | 'Other';
  date: string;
  description?: string;
}

export interface Complaint {
  id?: string | number;
  tenantId?: string | number;
  tenantName: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  date: string;
}

export interface SettingsData {
  id?: string | number;
  pgName: string;
  address: string;
  defaultRentDay: number;
  managerName: string;
  managerPhone: string;
}

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
