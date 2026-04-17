// In-memory mock database for development when MongoDB is unavailable
import mongoose from 'mongoose';

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders?: number;
  totalSpent?: number;
}

interface OrderData {
  orderNumber: string;
  branchId: string;
  branchPrefix: string;
  customer: string;
  customerPhone?: string;
  items: string[];
  total: number;
  status: string;
}

interface BranchData {
  name: string;
  prefix: string;
  address: string;
  phone: string;
  active: boolean;
  counter?: number;
}

interface CompanyData {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  taxId?: string;
  logo?: string;
}

interface ExchangeRateData {
  rate: number;
  effectiveDate: Date;
  source?: string;
  isActive: boolean;
  notes?: string;
  createdBy?: string;
}

interface UserData {
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
  phone?: string;
  branch?: string;
  lastLogin?: Date;
}

interface MockDatabase {
  customers: (CustomerData & { _id: string; createdAt: Date; updatedAt: Date })[];
  orders: (OrderData & { _id: string; createdAt: Date; updatedAt: Date })[];
  branches: (BranchData & { _id: string; createdAt: Date; updatedAt: Date })[];
  company: (CompanyData & { _id: string; createdAt: Date; updatedAt: Date }) | null;
  exchangeRates: (ExchangeRateData & { _id: string; createdAt: Date; updatedAt: Date })[];
  users: (UserData & { _id: string; createdAt: Date; updatedAt: Date })[];
}

const mockDb: MockDatabase = {
  customers: [
    {
      _id: '1',
      name: 'Sarah Moyo',
      phone: '+263 77 123 4567',
      email: 'sarah@email.com',
      address: 'Harare',
      totalOrders: 12,
      totalSpent: 5000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: '2',
      name: 'James Kuda',
      phone: '+263 71 234 5678',
      email: 'james@email.com',
      totalOrders: 8,
      totalSpent: 3200,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  orders: [],
  branches: [
    {
      _id: '1',
      name: 'Main Branch',
      prefix: 'MB',
      address: 'Harare CBD',
      phone: '+263 4 XXX XXXX',
      active: true,
      counter: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: '2',
      name: 'Eastside Branch',
      prefix: 'EB',
      address: 'Eastside',
      phone: '+263 4 XXX XXXX',
      active: true,
      counter: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  company: {
    _id: '1',
    name: 'RelClean Dry Cleaners',
    address: '123 Main Street, Harare',
    phone: '+263 77 000 0000',
    email: 'info@relclean.co.zw',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  exchangeRates: [
    {
      _id: '1',
      rate: 32.5,
      effectiveDate: new Date(),
      source: 'Manual Entry',
      isActive: true,
      notes: 'Initial exchange rate',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  users: [
    {
      _id: 'u1',
      username: 'Tatenda Moyo',
      email: 'tatenda@relclean.com',
      role: 'admin',
      status: 'active',
      phone: '+263 77 123 4567',
      branch: 'Harare CBD',
      lastLogin: new Date('2026-02-28T14:32:00.000Z'),
      createdAt: new Date('2025-06-15T00:00:00.000Z'),
      updatedAt: new Date(),
    },
    {
      _id: 'u2',
      username: 'Rudo Chikwanha',
      email: 'rudo@relclean.com',
      role: 'user',
      status: 'active',
      phone: '+263 71 987 6543',
      branch: 'Avondale',
      lastLogin: new Date('2026-03-01T08:10:00.000Z'),
      createdAt: new Date('2025-09-01T00:00:00.000Z'),
      updatedAt: new Date(),
    },
  ],
};

export const getMockDb = () => mockDb;

export const addCustomer = (customer: CustomerData) => {
  const id = Date.now().toString();
  const newCustomer = {
    _id: id,
    ...customer,
    totalOrders: customer.totalOrders || 0,
    totalSpent: customer.totalSpent || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockDb.customers.push(newCustomer);
  return newCustomer;
};

export const getCustomerByPhone = (phone: string) => {
  return mockDb.customers.find((c) => c.phone === phone);
};

export const getAllCustomers = () => mockDb.customers;

export const getCustomerById = (id: string) => {
  return mockDb.customers.find((c) => c._id === id);
};

export const getAllBranches = () => mockDb.branches;

export const getBranchById = (id: string) => {
  return mockDb.branches.find((b) => b._id === id);
};

export const addBranch = (branch: BranchData) => {
  const id = Date.now().toString();
  const newBranch = {
    _id: id,
    ...branch,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockDb.branches.push(newBranch);
  return newBranch;
};

export const addOrder = (order: OrderData) => {
  const id = Date.now().toString();
  const newOrder = {
    _id: id,
    ...order,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockDb.orders.push(newOrder);
  return newOrder;
};

export const getAllOrders = () => mockDb.orders;

export const getOrderById = (id: string) => {
  return mockDb.orders.find((o) => o._id === id);
};

export const getCompany = () => {
  return mockDb.company || {
    _id: '1',
    name: 'RelClean Dry Cleaners',
    address: '123 Main Street, Harare',
    phone: '+263 77 000 0000',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const updateCompany = (companyData: Partial<CompanyData>) => {
  if (mockDb.company) {
    mockDb.company = {
      ...mockDb.company,
      ...companyData,
      updatedAt: new Date(),
    };
  } else {
    mockDb.company = {
      _id: '1',
      name: companyData.name || 'RelClean Dry Cleaners',
      address: companyData.address || '',
      phone: companyData.phone || '',
      email: companyData.email,
      website: companyData.website,
      taxId: companyData.taxId,
      logo: companyData.logo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return mockDb.company;
};

export const getAllExchangeRates = () => mockDb.exchangeRates;

export const getCurrentExchangeRate = () => {
  const now = new Date();
  return mockDb.exchangeRates
    .filter((rate: any) => rate.isActive && new Date(rate.effectiveDate) <= now)
    .sort((a: any, b: any) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];
};

export const getExchangeRateById = (id: string) => {
  return mockDb.exchangeRates.find((r: any) => r._id === id);
};

export const addExchangeRate = (rateData: ExchangeRateData) => {
  const id = Date.now().toString();
  const newRate = {
    _id: id,
    ...rateData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockDb.exchangeRates.push(newRate);
  return newRate;
};

export const updateExchangeRate = (id: string, updates: Partial<ExchangeRateData>) => {
  const rateIndex = mockDb.exchangeRates.findIndex((r: any) => r._id === id);
  if (rateIndex !== -1) {
    mockDb.exchangeRates[rateIndex] = {
      ...mockDb.exchangeRates[rateIndex],
      ...updates,
      updatedAt: new Date(),
    };
    return mockDb.exchangeRates[rateIndex];
  }
  return null;
};

export const getAllUsers = () => mockDb.users;

export const getUserById = (id: string) => {
  return mockDb.users.find((u) => u._id === id);
};

export const addUser = (user: UserData) => {
  const id = Date.now().toString();
  const newUser = {
    _id: id,
    ...user,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockDb.users.push(newUser);
  return newUser;
};

export const updateUser = (id: string, updates: Partial<UserData>) => {
  const userIndex = mockDb.users.findIndex((u) => u._id === id);
  if (userIndex !== -1) {
    mockDb.users[userIndex] = {
      ...mockDb.users[userIndex],
      ...updates,
      updatedAt: new Date(),
    };
    return mockDb.users[userIndex];
  }
  return null;
};

export const deleteUser = (id: string) => {
  const userIndex = mockDb.users.findIndex((u) => u._id === id);
  if (userIndex === -1) {
    return null;
  }

  const [deletedUser] = mockDb.users.splice(userIndex, 1);
  return deletedUser;
};
