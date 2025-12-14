import { RoomType, RoomStatus, Tenant, MonthlyStat, Room } from './types';

export const DASHBOARD_STATS = {
  totalTenants: 42,
  occupancyRate: 85,
  totalRevenue: 325000,
  pendingDues: 12500,
};

export const REVENUE_DATA: MonthlyStat[] = [
  { name: 'Jan', revenue: 280000, expenses: 150000 },
  { name: 'Feb', revenue: 290000, expenses: 160000 },
  { name: 'Mar', revenue: 310000, expenses: 155000 },
  { name: 'Apr', revenue: 305000, expenses: 140000 },
  { name: 'May', revenue: 320000, expenses: 165000 },
  { name: 'Jun', revenue: 325000, expenses: 170000 },
];

export const MOCK_TENANTS: Tenant[] = [
  { id: 1, name: 'Arjun Sharma', roomNumber: '101', joinDate: '2023-01-15', status: 'Active', rentStatus: 'Paid', phone: '+91 98765 43210', email: 'arjun@example.com', rentAmount: 15000 },
  { id: 2, name: 'Vihaan Patel', roomNumber: '102', joinDate: '2023-02-20', status: 'Active', rentStatus: 'Pending', phone: '+91 98765 43211', email: 'vihaan@example.com', rentAmount: 10000 },
  { id: 3, name: 'Aditya Verma', roomNumber: '201', joinDate: '2023-03-10', status: 'Notice Period', rentStatus: 'Paid', phone: '+91 98765 43212', email: 'aditya@example.com', rentAmount: 15000 },
  { id: 4, name: 'Rohan Gupta', roomNumber: '202', joinDate: '2023-04-05', status: 'Active', rentStatus: 'Overdue', phone: '+91 98765 43213', email: 'rohan@example.com', rentAmount: 8000 },
  { id: 5, name: 'Karthik Iyer', roomNumber: '301', joinDate: '2023-05-12', status: 'Active', rentStatus: 'Paid', phone: '+91 98765 43214', email: 'karthik@example.com', rentAmount: 16000 },
];

export const MOCK_ROOMS: Room[] = [
  { id: 101, number: '101', type: RoomType.SINGLE, status: RoomStatus.OCCUPIED, price: 15000, floor: 1 },
  { id: 102, number: '102', type: RoomType.DOUBLE, status: RoomStatus.OCCUPIED, price: 10000, floor: 1 },
  { id: 103, number: '103', type: RoomType.DOUBLE, status: RoomStatus.AVAILABLE, price: 10000, floor: 1 },
  { id: 201, number: '201', type: RoomType.SINGLE, status: RoomStatus.MAINTENANCE, price: 15000, floor: 2 },
  { id: 202, number: '202', type: RoomType.TRIPLE, status: RoomStatus.OCCUPIED, price: 8000, floor: 2 },
  { id: 301, number: '301', type: RoomType.SINGLE, status: RoomStatus.AVAILABLE, price: 16000, floor: 3 },
];