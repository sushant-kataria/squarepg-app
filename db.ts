import Dexie, { Table } from 'dexie';
import { Tenant, Room, Payment, Complaint, SettingsData } from './types';
import { MOCK_TENANTS, MOCK_ROOMS } from './constants';

export class AshirwadPGDatabase extends Dexie {
  tenants!: Table<Tenant>;
  rooms!: Table<Room>;
  payments!: Table<Payment>;
  complaints!: Table<Complaint>;
  settings!: Table<SettingsData>;

  constructor() {
    super('SAshirwadPGDB');
    // Bumped version to 4 to fix missing index on tenantName
    this.version(4).stores({
      tenants: '++id, name, roomNumber, status, rentStatus, email', // Added email index
      rooms: '++id, number, type, status, floor',
      payments: '++id, tenantId, date, type',
      complaints: '++id, tenantId, tenantName, status, date', // Added tenantName index
      settings: '++id'
    });
  }
}

export const db = new AshirwadPGDatabase();

// Seed data if empty
db.on('populate', () => {
  const seedTenants = MOCK_TENANTS.map(({ id, ...rest }) => ({
    ...rest,
    rentAmount: 12000 // Default rent amount for seed data
  }));
  
  const seedRooms = MOCK_ROOMS.map(({ id, ...rest }) => rest);

  db.tenants.bulkAdd(seedTenants as unknown as Tenant[]);
  db.rooms.bulkAdd(seedRooms as unknown as Room[]);
  
  // Seed default settings
  db.settings.add({
    pgName: 'Square PG',
    address: '123, Tech Street, Bangalore',
    defaultRentDay: 5,
    managerName: 'Admin',
    managerPhone: '9876543210'
  });
});