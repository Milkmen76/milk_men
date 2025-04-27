/**
 * Mock Vendor Service
 * Provides mock data for vendor dashboards, orders, and products
 */

// Mock dashboard data
export const fetchDashboardData = async (period = 'week') => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Different data based on period
  const periodMap = {
    day: {
      salesTrend: [
        { label: '9am', value: 120 },
        { label: '12pm', value: 300 },
        { label: '3pm', value: 200 },
        { label: '6pm', value: 450 },
        { label: '9pm', value: 180 }
      ],
      totalSales: 1250,
      totalOrders: 15,
      totalProducts: 12
    },
    week: {
      salesTrend: [
        { label: 'Mon', value: 1200 },
        { label: 'Tue', value: 1800 },
        { label: 'Wed', value: 1600 },
        { label: 'Thu', value: 2100 },
        { label: 'Fri', value: 2400 },
        { label: 'Sat', value: 1800 },
        { label: 'Sun', value: 1200 }
      ],
      totalSales: 12100,
      totalOrders: 118,
      totalProducts: 12
    },
    month: {
      salesTrend: [
        { label: 'Week 1', value: 7200 },
        { label: 'Week 2', value: 8500 },
        { label: 'Week 3', value: 9800 },
        { label: 'Week 4', value: 10500 }
      ],
      totalSales: 36000,
      totalOrders: 320,
      totalProducts: 12
    },
    year: {
      salesTrend: [
        { label: 'Jan', value: 30000 },
        { label: 'Feb', value: 28000 },
        { label: 'Mar', value: 32000 },
        { label: 'Apr', value: 35000 },
        { label: 'May', value: 34000 },
        { label: 'Jun', value: 38000 }
      ],
      totalSales: 197000,
      totalOrders: 1850,
      totalProducts: 12
    }
  };
  
  const data = periodMap[period] || periodMap.week;
  
  // Add recent orders
  const recentOrders = [
    {
      id: '12345',
      customerName: 'Rahul Sharma',
      items: 3,
      amount: 350,
      status: 'delivered',
      date: new Date().toISOString()
    },
    {
      id: '12344',
      customerName: 'Priya Patel',
      items: 2,
      amount: 180,
      status: 'processing',
      date: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: '12343',
      customerName: 'Amit Singh',
      items: 5,
      amount: 520,
      status: 'pending',
      date: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
  ];
  
  return {
    ...data,
    vendorName: 'Amul Dairy',
    unreadNotifications: 3,
    recentOrders: recentOrders
  };
};

// Mock orders data
export const fetchOrders = async (status = 'all', page = 1) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const orders = [];
  const statuses = ['pending', 'processing', 'delivered', 'cancelled'];
  
  // Generate mock orders
  for (let i = 1; i <= 20; i++) {
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Filter by status if required
    if (status !== 'all' && randomStatus !== status) continue;
    
    orders.push({
      id: `ORD${10000 + i}`,
      customerName: `Customer ${i}`,
      customerPhone: `+91 9876${543210 - i}`,
      items: Math.floor(Math.random() * 5) + 1,
      amount: Math.floor(Math.random() * 1000) + 100,
      status: randomStatus,
      date: new Date(Date.now() - (i * 3600000)).toISOString(),
      products: [
        { name: 'Full Cream Milk', quantity: 2, price: 60, total: 120 },
        { name: 'Toned Milk', quantity: 1, price: 50, total: 50 }
      ],
      address: `${i} Main Street, Apartment ${i}00, City`,
      paymentMethod: i % 2 === 0 ? 'Cash on Delivery' : 'Online Payment',
      deliverySlot: '6:00 AM - 8:00 AM'
    });
  }
  
  return {
    orders: orders,
    totalCount: 45, // Mock total count for pagination
    currentPage: page
  };
};

// Mock products data
export const fetchProducts = async (category = 'all', page = 1) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const categories = ['Milk', 'Curd', 'Butter', 'Ghee', 'Paneer'];
  const products = [];
  
  // Generate mock products
  for (let i = 1; i <= 20; i++) {
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Filter by category if required
    if (category !== 'all' && randomCategory !== category) continue;
    
    products.push({
      id: `PRD${1000 + i}`,
      name: `${randomCategory} ${i}`,
      category: randomCategory,
      price: Math.floor(Math.random() * 100) + 20,
      stock: Math.floor(Math.random() * 100),
      description: `High quality ${randomCategory.toLowerCase()} product.`,
      image: 'milk-icon.png',
      isActive: Math.random() > 0.2 // 80% chance of being active
    });
  }
  
  return {
    products: products,
    totalCount: 35, // Mock total count for pagination
    currentPage: page
  };
};

// Mock product categories
export const fetchCategories = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    { id: 1, name: 'Milk', count: 8 },
    { id: 2, name: 'Curd', count: 5 },
    { id: 3, name: 'Butter', count: 3 },
    { id: 4, name: 'Ghee', count: 4 },
    { id: 5, name: 'Paneer', count: 2 }
  ];
};

// Mock vendor statistics
export const fetchVendorStats = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    totalRevenue: 125000,
    totalOrders: 1250,
    totalProducts: 15,
    activeCustomers: 320,
    pendingOrders: 8,
    processingOrders: 12,
    completedOrders: 1230
  };
}; 