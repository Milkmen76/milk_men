import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Path constants
const DATA_DIR = FileSystem.documentDirectory + 'data/';
const USERS_FILE = DATA_DIR + 'users.json';
const PRODUCTS_FILE = DATA_DIR + 'products.json';
const ORDERS_FILE = DATA_DIR + 'orders.json';
const SUBSCRIPTIONS_FILE = DATA_DIR + 'subscriptions.json';
const TRANSACTIONS_FILE = DATA_DIR + 'transactions.json';

// Initial data
const initialUsers = [
  {"id": "1", "email": "user1@example.com", "password": "pass123", "name": "Alice", "role": "user", "profile_info": {"avatar": "milk-icon.png"}},
  {"id": "2", "email": "vendor1@example.com", "password": "pass123", "name": "Bob", "role": "vendor", "approval_status": "approved", "profile_info": {"business_name": "Bob's Milk", "address": "456 Dairy Rd", "avatar": "milk-icon.png"}},
  {"id": "3", "email": "admin@example.com", "password": "admin123", "name": "Admin", "role": "admin", "profile_info": {"avatar": "milk-icon.png"}}
];

const initialProducts = [
  {"product_id": "p1", "vendor_id": "2", "name": "Full Cream Milk", "price": 2.99, "image": "milk1.jpg"},
  {"product_id": "p2", "vendor_id": "2", "name": "Skimmed Milk", "price": 2.49, "image": "milk2.jpg"}
];

const initialOrders = [
  {"order_id": "o1", "user_id": "1", "vendor_id": "2", "products": ["p1"], "status": "pending"}
];

const initialSubscriptions = [
  {"subscription_id": "s1", "user_id": "1", "vendor_id": "2", "type": "monthly", "start_date": "2023-10-01T00:00:00Z", "end_date": "2023-10-31T00:00:00Z"}
];

const initialTransactions = [
  {"transaction_id": "t1", "user_id": "1", "vendor_id": "2", "amount": 2.99, "date": "2023-10-01T12:00:00Z"}
];

// Ensure data directory exists
const ensureDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(DATA_DIR);
  if (!dirInfo.exists) {
    console.log('Creating data directory...');
    await FileSystem.makeDirectoryAsync(DATA_DIR, { intermediates: true });
  }
};

// Initialize data files if they don't exist
export const initializeData = async () => {
  try {
    console.log('Initializing local data...');
    await ensureDirectoryExists();
    
    // Check if data files exist, if not create them with initial data
    const files = [
      { path: USERS_FILE, data: initialUsers, name: 'users' },
      { path: PRODUCTS_FILE, data: initialProducts, name: 'products' },
      { path: ORDERS_FILE, data: initialOrders, name: 'orders' },
      { path: SUBSCRIPTIONS_FILE, data: initialSubscriptions, name: 'subscriptions' },
      { path: TRANSACTIONS_FILE, data: initialTransactions, name: 'transactions' }
    ];
    
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(file.path);
      console.log(`Checking ${file.name} file: ${fileInfo.exists ? 'exists' : 'does not exist'}`);
      if (!fileInfo.exists) {
        console.log(`Creating ${file.path}...`);
        await FileSystem.writeAsStringAsync(file.path, JSON.stringify(file.data, null, 2));
      }
    }
    
    console.log('All data files are initialized.');
    return true;
  } catch (error) {
    console.error('Error initializing data:', error);
    return false;
  }
};

// Read JSON file
export const readJsonFile = async (fileName) => {
  try {
    const filePath = DATA_DIR + fileName;
    console.log(`Reading file from: ${filePath}`);
    
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    console.log(`File ${fileName} exists: ${fileInfo.exists}`);
    
    if (!fileInfo.exists) {
      console.log(`File ${fileName} does not exist, checking if initialization is needed`);
      // If the file doesn't exist, we need to initialize the data
      // This is a fallback in case the initialization wasn't done properly
      await initializeDataFiles();
      
      // Check again after initialization
      const newFileInfo = await FileSystem.getInfoAsync(filePath);
      if (!newFileInfo.exists) {
        console.log(`Failed to create ${fileName} even after initialization attempt`);
        return [];
      }
    }
    
    const content = await FileSystem.readAsStringAsync(filePath);
    console.log(`File ${fileName} content length: ${content.length} characters`);
    
    if (!content || content.trim() === '') {
      console.log(`File ${fileName} is empty, returning empty array`);
      return [];
    }
    
    try {
      const parsedData = JSON.parse(content);
      console.log(`Successfully parsed ${fileName}, found ${Array.isArray(parsedData) ? parsedData.length : 'non-array'} items`);
      return parsedData;
    } catch (parseError) {
      console.error(`Error parsing ${fileName} JSON:`, parseError);
      return [];
    }
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return [];
  }
};

// Helper function to initialize specific data files if needed
const initializeDataFiles = async () => {
  try {
    console.log('Emergency initialization of data files...');
    await ensureDirectoryExists();
    
    const files = [
      { path: USERS_FILE, data: initialUsers, name: 'users.json' },
      { path: PRODUCTS_FILE, data: initialProducts, name: 'products.json' },
      { path: ORDERS_FILE, data: initialOrders, name: 'orders.json' },
      { path: SUBSCRIPTIONS_FILE, data: initialSubscriptions, name: 'subscriptions.json' },
      { path: TRANSACTIONS_FILE, data: initialTransactions, name: 'transactions.json' }
    ];
    
    for (const file of files) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(file.path);
        if (!fileInfo.exists) {
          console.log(`Creating missing file: ${file.name}`);
          await FileSystem.writeAsStringAsync(file.path, JSON.stringify(file.data, null, 2));
        }
      } catch (fileError) {
        console.error(`Error handling file ${file.name}:`, fileError);
      }
    }
  } catch (error) {
    console.error('Error in emergency initialization:', error);
  }
};

// Write to JSON file
export const writeJsonFile = async (fileName, data) => {
  try {
    const filePath = DATA_DIR + fileName;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${fileName}:`, error);
    return false;
  }
};

// Generate unique ID
export const generateId = (array, idField = 'id') => {
  if (!array || array.length === 0) return '1';
  
  const ids = array.map(item => {
    const idValue = item[idField];
    // Remove any non-numeric characters for proper comparison
    const numericValue = idValue.replace(/\D/g, '');
    return parseInt(numericValue, 10);
  });
  
  const maxId = Math.max(...ids);
  return (maxId + 1).toString();
};

// User operations
export const getUsers = async () => {
  return await readJsonFile('users.json');
};

export const getUserById = async (id) => {
  try {
    console.log('getUserById called with id:', id);
    const users = await getUsers();
    
    if (!users || users.length === 0) {
      console.log('No users found in database');
      return null;
    }
    
    console.log(`Found ${users.length} users in database, searching for id: ${id}`);
    const user = users.find(user => user.id === id);
    
    if (user) {
      console.log('User found:', user.name);
    } else {
      console.log('User not found with id:', id);
    }
    
    return user;
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
};

export const getUserByEmail = async (email) => {
  const users = await getUsers();
  return users ? users.find(user => user.email.toLowerCase() === email.toLowerCase()) : null;
};

export const addUser = async (userData) => {
  const users = await getUsers();
  if (!users) return null;
  
  // Check if email already exists
  const existingUser = users.find(user => user.email.toLowerCase() === userData.email.toLowerCase());
  if (existingUser) return null;
  
  const newId = generateId(users);
  const newUser = { id: newId, ...userData };
  
  users.push(newUser);
  const success = await writeJsonFile('users.json', users);
  return success ? newUser : null;
};

export const updateUser = async (id, userData) => {
  const users = await getUsers();
  if (!users) return false;
  
  const index = users.findIndex(user => user.id === id);
  if (index === -1) return false;
  
  users[index] = { ...users[index], ...userData };
  return await writeJsonFile('users.json', users);
};

// New function to update user avatar
export const updateUserAvatar = async (userId, avatarName) => {
  try {
    const users = await getUsers();
    if (!users) return false;
    
    const index = users.findIndex(user => user.id === userId);
    if (index === -1) return false;
    
    // Create profile_info if it doesn't exist
    if (!users[index].profile_info) {
      users[index].profile_info = {};
    }
    
    // Update avatar in profile_info
    users[index].profile_info.avatar = avatarName;
    
    const success = await writeJsonFile('users.json', users);
    return success;
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return false;
  }
};

// Function to get available avatar images
export const getAvailableAvatars = () => {
  // In a real app, this would fetch from a server or file system
  // For now, return hardcoded options
  return [
    { label: 'Default Avatar', value: 'milk-icon.png' },
    { label: 'App Icon', value: 'icon.png' },
    { label: 'Splash Icon', value: 'splash-icon.png' },
  ];
};

// Product operations
export const getProducts = async () => {
  return await readJsonFile('products.json');
};

export const getProductsByVendor = async (vendorId) => {
  const products = await getProducts();
  return products ? products.filter(product => product.vendor_id === vendorId) : [];
};

export const addProduct = async (productData) => {
  const products = await getProducts();
  if (!products) return null;
  
  const newId = generateId(products, 'product_id');
  const newProduct = { product_id: `p${newId}`, ...productData };
  
  products.push(newProduct);
  const success = await writeJsonFile('products.json', products);
  return success ? newProduct : null;
};

export const updateProduct = async (productId, productData) => {
  const products = await getProducts();
  if (!products) return false;
  
  const index = products.findIndex(product => product.product_id === productId);
  if (index === -1) return false;
  
  products[index] = { ...products[index], ...productData };
  return await writeJsonFile('products.json', products);
};

export const deleteProduct = async (productId) => {
  const products = await getProducts();
  if (!products) return false;
  
  const filteredProducts = products.filter(product => product.product_id !== productId);
  return await writeJsonFile('products.json', filteredProducts);
};

// Order operations
export const getOrders = async () => {
  return await readJsonFile('orders.json');
};

export const getOrdersByUser = async (userId) => {
  const orders = await getOrders();
  return orders ? orders.filter(order => order.user_id === userId) : [];
};

export const getOrdersByVendor = async (vendorId) => {
  const orders = await getOrders();
  return orders ? orders.filter(order => order.vendor_id === vendorId) : [];
};

export const addOrder = async (orderData) => {
  const orders = await getOrders();
  if (!orders) return null;
  
  const newOrderId = `o${generateId(orders, 'order_id')}`;
  const newOrder = { 
    order_id: newOrderId, 
    created_at: new Date().toISOString(),
    status: 'pending',
    ...orderData 
  };
  
  orders.push(newOrder);
  const success = await writeJsonFile('orders.json', orders);
  return success ? newOrder : null;
};

export const updateOrderStatus = async (orderId, status) => {
  const orders = await getOrders();
  if (!orders) return false;
  
  const index = orders.findIndex(order => order.order_id === orderId);
  if (index === -1) return false;
  
  orders[index].status = status;
  orders[index].updated_at = new Date().toISOString();
  
  return await writeJsonFile('orders.json', orders);
};

// Subscription operations
export const getSubscriptions = async () => {
  return await readJsonFile('subscriptions.json');
};

export const getSubscriptionsByUser = async (userId) => {
  const subscriptions = await getSubscriptions();
  return subscriptions ? subscriptions.filter(sub => sub.user_id === userId) : [];
};

export const getSubscriptionsByVendor = async (vendorId) => {
  const subscriptions = await getSubscriptions();
  return subscriptions ? subscriptions.filter(sub => sub.vendor_id === vendorId) : [];
};

export const addSubscription = async (subscriptionData) => {
  const subscriptions = await getSubscriptions();
  if (!subscriptions) return null;
  
  const newSubscriptionId = `s${generateId(subscriptions, 'subscription_id')}`;
  const newSubscription = { 
    subscription_id: newSubscriptionId, 
    created_at: new Date().toISOString(),
    status: 'active',
    ...subscriptionData 
  };
  
  subscriptions.push(newSubscription);
  const success = await writeJsonFile('subscriptions.json', subscriptions);
  return success ? newSubscription : null;
};

export const updateSubscriptionStatus = async (subscriptionId, status) => {
  const subscriptions = await getSubscriptions();
  if (!subscriptions) return false;
  
  const index = subscriptions.findIndex(sub => sub.subscription_id === subscriptionId);
  if (index === -1) return false;
  
  subscriptions[index].status = status;
  subscriptions[index].updated_at = new Date().toISOString();
  
  return await writeJsonFile('subscriptions.json', subscriptions);
};

// Delivery operations
export const getDeliveries = async () => {
  // We'll store deliveries in a separate file
  try {
    return await readJsonFile('deliveries.json');
  } catch (error) {
    // If the file doesn't exist yet, initialize it
    await writeJsonFile('deliveries.json', []);
    return [];
  }
};

export const getUpcomingDeliveries = async (subscriptionId) => {
  const deliveries = await getDeliveries();
  return deliveries ? 
    deliveries.filter(delivery => 
      delivery.subscription_id === subscriptionId && 
      new Date(delivery.scheduled_date) >= new Date()
    ) : [];
};

export const getDeliveriesBySubscription = async (subscriptionId) => {
  const deliveries = await getDeliveries();
  return deliveries ? 
    deliveries.filter(delivery => delivery.subscription_id === subscriptionId) : [];
};

export const addDelivery = async (deliveryData) => {
  const deliveries = await getDeliveries();
  if (!deliveries) return null;
  
  const newDeliveryId = `d${generateId(deliveries, 'delivery_id')}`;
  const newDelivery = { 
    delivery_id: newDeliveryId, 
    created_at: new Date().toISOString(),
    status: 'scheduled',
    ...deliveryData 
  };
  
  deliveries.push(newDelivery);
  const success = await writeJsonFile('deliveries.json', deliveries);
  return success ? newDelivery : null;
};

export const updateDeliveryStatus = async (deliveryId, status) => {
  const deliveries = await getDeliveries();
  if (!deliveries) return false;
  
  // If it's a temporary ID for a new delivery
  if (deliveryId.startsWith('delivery_')) {
    // Get the subscription ID from the temp ID
    const subscriptionId = deliveryId.replace('delivery_', '');
    
    // Find if there's an upcoming delivery for this subscription
    let upcomingDeliveries = await getUpcomingDeliveries(subscriptionId);
    
    if (upcomingDeliveries && upcomingDeliveries.length > 0) {
      // Update the status of the first upcoming delivery
      const index = deliveries.findIndex(d => d.delivery_id === upcomingDeliveries[0].delivery_id);
      if (index !== -1) {
        deliveries[index].status = status;
        deliveries[index].updated_at = new Date().toISOString();
        return await writeJsonFile('deliveries.json', deliveries);
      }
    }
    
    // If no upcoming delivery found, create one
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) return false;
    
    // Create a new delivery for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 8 AM
    
    const newDelivery = {
      delivery_id: `d${generateId(deliveries, 'delivery_id')}`,
      subscription_id: subscriptionId,
      user_id: subscription.user_id,
      vendor_id: subscription.vendor_id,
      scheduled_date: tomorrow.toISOString(),
      status: status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    deliveries.push(newDelivery);
    return await writeJsonFile('deliveries.json', deliveries);
  }
  
  // Regular delivery ID update
  const index = deliveries.findIndex(delivery => delivery.delivery_id === deliveryId);
  if (index === -1) return false;
  
  deliveries[index].status = status;
  deliveries[index].updated_at = new Date().toISOString();
  
  return await writeJsonFile('deliveries.json', deliveries);
};

export const getSubscriptionById = async (subscriptionId) => {
  const subscriptions = await getSubscriptions();
  return subscriptions ? 
    subscriptions.find(sub => sub.subscription_id === subscriptionId) : null;
};

// Transaction operations
export const getTransactions = async () => {
  return await readJsonFile('transactions.json');
};

export const getTransactionsByUser = async (userId) => {
  const transactions = await getTransactions();
  return transactions ? transactions.filter(transaction => transaction.user_id === userId) : [];
};

export const addTransaction = async (transactionData) => {
  const transactions = await getTransactions();
  if (!transactions) return null;
  
  const newId = generateId(transactions, 'transaction_id');
  const newTransaction = { transaction_id: `t${newId}`, ...transactionData, date: new Date().toISOString() };
  
  transactions.push(newTransaction);
  const success = await writeJsonFile('transactions.json', transactions);
  return success ? newTransaction : null;
};

// Authentication
export const loginUser = async (email, password) => {
  try {
    const users = await getUsers();
    if (!users) return { success: false, message: 'Error reading user data' };
    
    const user = users.find(user => 
      user.email.toLowerCase() === email.toLowerCase() && 
      user.password === password
    );
    
    if (!user) return { success: false, message: 'Invalid email or password' };
    
    // Store user ID in AsyncStorage
    await AsyncStorage.setItem('userId', user.id);
    
    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approval_status: user.approval_status,
        profile_info: user.profile_info
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Login failed' };
  }
};

export const signupUser = async (userData) => {
  try {
    const { email, password, name, role, phone_number } = userData;
    
    // Check if email already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return { success: false, message: 'Email already in use' };
    }
    
    // Prepare user object
    const newUserData = {
      email,
      password,
      name,
      role,
      phone_number
    };
    
    // Initialize profile_info for all users
    newUserData.profile_info = userData.profile_info || {};
    
    // Add approval_status for vendors
    if (role === 'vendor') {
      newUserData.approval_status = 'pending';
      // Ensure vendor profile info has the required fields
      if (!newUserData.profile_info) {
        newUserData.profile_info = {};
      }
      newUserData.profile_info.business_name = userData.profile_info?.business_name || '';
      newUserData.profile_info.address = userData.profile_info?.address || '';
    }
    
    const newUser = await addUser(newUserData);
    if (!newUser) {
      return { success: false, message: 'Failed to create user' };
    }
    
    return { 
      success: true, 
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        approval_status: newUser.approval_status,
        profile_info: newUser.profile_info
      }
    };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, message: 'Signup failed' };
  }
};

export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem('userId');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Logout failed' };
  }
};

export const getCurrentUser = async () => {
  try {
    console.log('Checking for current user in AsyncStorage...');
    const userId = await AsyncStorage.getItem('userId');
    console.log('Retrieved userId from AsyncStorage:', userId);
    
    if (!userId) {
      console.log('No userId found in AsyncStorage');
      return null;
    }
    
    console.log('Getting user details for userId:', userId);
    const user = await getUserById(userId);
    
    if (!user) {
      console.log('User not found in database, clearing invalid userId');
      // Clear invalid user ID
      await AsyncStorage.removeItem('userId');
      return null;
    }
    
    console.log('Current user found:', user.name, '(', user.role, ')');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      approval_status: user.approval_status,
      profile_info: user.profile_info
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Verify user password
export const verifyPassword = async (userId, password) => {
  try {
    const users = await getUsers();
    if (!users) return { success: false, message: 'Error reading user data' };
    
    const user = users.find(user => user.id === userId);
    if (!user) return { success: false, message: 'User not found' };
    
    if (user.password === password) {
      return { success: true };
    } else {
      return { success: false, message: 'Incorrect password' };
    }
  } catch (error) {
    console.error('Verify password error:', error);
    return { success: false, message: 'Verification failed' };
  }
};

// Update user password
export const updatePassword = async (userId, newPassword) => {
  try {
    const users = await getUsers();
    if (!users) return { success: false, message: 'Error reading user data' };
    
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex === -1) return { success: false, message: 'User not found' };
    
    // Update password
    users[userIndex].password = newPassword;
    
    // Save updated users data
    const success = await writeJsonFile('users.json', users);
    return success ? { success: true } : { success: false, message: 'Failed to update password' };
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, message: 'Password update failed' };
  }
};
