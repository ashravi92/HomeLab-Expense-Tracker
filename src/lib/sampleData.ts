import { Transaction } from '../types';

export function generateInitialSampleTransactions(): Transaction[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Helper to get formatted date string for relative days in current or previous month
  const getRelativeDate = (monthOffset: number, day: number): string => {
    const targetDate = new Date(currentYear, currentMonth + monthOffset, day);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const sampleList: Array<Omit<Transaction, 'id' | 'createdAt'>> = [
    // Current Month Income
    {
      date: getRelativeDate(0, 1),
      description: 'EMPLOYER DIRECT DEPOSIT PAYROLL',
      merchant: 'Tech Corp LLC',
      amount: 4500.00,
      type: 'income',
      category: 'Income & Salary',
      paymentMethod: 'Bank Transfer',
      tags: ['salary', 'direct-deposit'],
      notes: 'Monthly net salary deposit',
      isAutoCategorized: true,
      aiConfidence: 0.99,
    },
    // Current Month Rent
    {
      date: getRelativeDate(0, 2),
      description: 'APT RENT AUTOMATIC PAY',
      merchant: 'Skyline Apartments',
      amount: 1650.00,
      type: 'expense',
      category: 'Housing & Rent',
      paymentMethod: 'Bank Transfer',
      tags: ['rent', 'fixed'],
      notes: 'Monthly apartment rent',
      isAutoCategorized: true,
    },
    // Homelab / Tech Gear
    {
      date: getRelativeDate(0, 4),
      description: 'MICRO CENTER 16TB NAS HARD DRIVE',
      merchant: 'Micro Center',
      amount: 289.99,
      type: 'expense',
      category: 'Homelab & Tech Hardware',
      paymentMethod: 'Credit Card',
      tags: ['homelab', 'zfs-nas', 'storage'],
      notes: 'Seagate IronWolf Pro 16TB for Truenas',
      isAutoCategorized: true,
      aiConfidence: 0.95,
    },
    // Subscriptions & Cloud
    {
      date: getRelativeDate(0, 5),
      description: 'HETZNER CLOUD SERVER RENTAL',
      merchant: 'Hetzner Online GmbH',
      amount: 24.50,
      type: 'expense',
      category: 'Subscriptions & Software',
      paymentMethod: 'Credit Card',
      tags: ['vps', 'cloud', 'docker'],
      notes: 'Offsite backup node & DNS resolver',
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(0, 6),
      description: 'NETFLIX PREMIUM 4K',
      merchant: 'Netflix Inc',
      amount: 22.99,
      type: 'expense',
      category: 'Subscriptions & Software',
      paymentMethod: 'Credit Card',
      tags: ['entertainment', 'subscription'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(0, 6),
      description: 'SPOTIFY FAMILY PLAN',
      merchant: 'Spotify USA',
      amount: 16.99,
      type: 'expense',
      category: 'Subscriptions & Software',
      paymentMethod: 'Credit Card',
      tags: ['music'],
      isAutoCategorized: true,
    },
    // Groceries
    {
      date: getRelativeDate(0, 7),
      description: 'TRADER JOES #082 SAN JOSE',
      merchant: 'Trader Joes',
      amount: 142.85,
      type: 'expense',
      category: 'Groceries',
      paymentMethod: 'Debit Card',
      tags: ['weekly-food'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(0, 12),
      description: 'WHOLEFDS MKT 10221',
      merchant: 'Whole Foods Market',
      amount: 89.40,
      type: 'expense',
      category: 'Groceries',
      paymentMethod: 'Credit Card',
      tags: ['groceries'],
      isAutoCategorized: true,
    },
    // Dining
    {
      date: getRelativeDate(0, 8),
      description: 'STARBUCKS STORE 1822',
      merchant: 'Starbucks',
      amount: 6.75,
      type: 'expense',
      category: 'Dining & Drinks',
      paymentMethod: 'Digital Wallet',
      tags: ['coffee'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(0, 10),
      description: 'RAMEN NAGI DOWNTOWN',
      merchant: 'Ramen Nagi',
      amount: 38.50,
      type: 'expense',
      category: 'Dining & Drinks',
      paymentMethod: 'Credit Card',
      tags: ['dinner'],
      isAutoCategorized: true,
    },
    // Utilities
    {
      date: getRelativeDate(0, 11),
      description: 'PG&E ELECTRICITY UTILITIES',
      merchant: 'Pacific Gas & Electric',
      amount: 128.40,
      type: 'expense',
      category: 'Utilities & Internet',
      paymentMethod: 'Bank Transfer',
      tags: ['power', 'utilities'],
      notes: 'Server power draw included',
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(0, 11),
      description: 'COMCAST XFINITY GIGABIT',
      merchant: 'Comcast Xfinity',
      amount: 85.00,
      type: 'expense',
      category: 'Utilities & Internet',
      paymentMethod: 'Credit Card',
      tags: ['fiber-internet'],
      isAutoCategorized: true,
    },
    // Transportation
    {
      date: getRelativeDate(0, 13),
      description: 'CHEVRON GAS STATION 0092',
      merchant: 'Chevron',
      amount: 54.20,
      type: 'expense',
      category: 'Transportation & Fuel',
      paymentMethod: 'Credit Card',
      tags: ['gas'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(0, 15),
      description: 'UBER TRIP 9283-A',
      merchant: 'Uber',
      amount: 28.15,
      type: 'expense',
      category: 'Transportation & Fuel',
      paymentMethod: 'Digital Wallet',
      tags: ['ride'],
      isAutoCategorized: true,
    },
    // Shopping / Tech
    {
      date: getRelativeDate(0, 16),
      description: 'AMAZON.COM*CAT6A CABLES AND SWITCH',
      merchant: 'Amazon',
      amount: 68.90,
      type: 'expense',
      category: 'Homelab & Tech Hardware',
      paymentMethod: 'Credit Card',
      tags: ['networking', 'cables'],
      isAutoCategorized: true,
      aiConfidence: 0.92,
    },
    // Previous Month Data for trends and comparisons
    {
      date: getRelativeDate(-1, 1),
      description: 'EMPLOYER DIRECT DEPOSIT PAYROLL',
      merchant: 'Tech Corp LLC',
      amount: 4500.00,
      type: 'income',
      category: 'Income & Salary',
      paymentMethod: 'Bank Transfer',
      tags: ['salary'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(-1, 2),
      description: 'APT RENT AUTOMATIC PAY',
      merchant: 'Skyline Apartments',
      amount: 1650.00,
      type: 'expense',
      category: 'Housing & Rent',
      paymentMethod: 'Bank Transfer',
      tags: ['rent'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(-1, 10),
      description: 'WALMART SUPERCENTER',
      merchant: 'Walmart',
      amount: 210.50,
      type: 'expense',
      category: 'Groceries',
      paymentMethod: 'Debit Card',
      tags: ['supplies'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(-1, 14),
      description: 'NEWEGG*UNIFI 2.5G SWITCH',
      merchant: 'Newegg',
      amount: 199.00,
      type: 'expense',
      category: 'Homelab & Tech Hardware',
      paymentMethod: 'Credit Card',
      tags: ['unifi', 'switch'],
      isAutoCategorized: true,
    },
    {
      date: getRelativeDate(-1, 18),
      description: 'SHELL OIL 82910',
      merchant: 'Shell',
      amount: 58.00,
      type: 'expense',
      category: 'Transportation & Fuel',
      paymentMethod: 'Credit Card',
      tags: ['gas'],
      isAutoCategorized: true,
    },
  ];

  return sampleList.map((item, index) => ({
    ...item,
    id: `tx-sample-${index + 1}`,
    createdAt: new Date().toISOString(),
  }));
}
