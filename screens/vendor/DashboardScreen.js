import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Image,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingOrders: 0,
    totalOrders: 0,
    revenue: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch vendor's products
        const vendorProducts = await localData.getProductsByVendor(user.id);
        setProducts(vendorProducts);
        
        // Fetch vendor's orders
        const vendorOrders = await localData.getOrdersByVendor(user.id);
        setOrders(vendorOrders);
        
        // Calculate dashboard stats
        const pendingOrders = vendorOrders.filter(order => order.status === 'pending').length;
        
        // Calculate total revenue from all orders 
        // (in a real app, we'd calculate from transactions)
        let totalRevenue = 0;
        vendorOrders.forEach(order => {
          if (order.total) {
            totalRevenue += parseFloat(order.total);
          }
        });
        
        setStats({
          totalProducts: vendorProducts.length,
          pendingOrders,
          totalOrders: vendorOrders.length,
          revenue: totalRevenue
        });
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  const renderOrderItem = ({ item }) => {
    // Format date
    const orderDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A';
    
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>Order #{item.order_id.replace('o', '')}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.orderDate}>Placed on: {orderDate}</Text>
        {item.total && <Text style={styles.orderAmount}>Amount: ${parseFloat(item.total).toFixed(2)}</Text>}
        
        <View style={styles.orderActions}>
          <TouchableOpacity 
            style={styles.orderActionButton}
            onPress={() => navigation.navigate('OrderManagementScreen', { orderId: item.order_id })}
          >
            <Text style={styles.orderActionButtonText}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Helper function to get status badge style
  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return styles.pendingStatus;
      case 'out for delivery':
        return styles.deliveryStatus;
      case 'delivered':
        return styles.deliveredStatus;
      case 'canceled':
        return styles.canceledStatus;
      default:
        return {};
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const businessName = user?.profile_info?.business_name || 'Your Business';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.businessName}>{businessName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Image 
            source={require('../../assets/milk-icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending Orders</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${stats.revenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('ProductManagementScreen')}
        >
          <Text style={styles.actionButtonText}>Manage Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('OrderManagementScreen')}
        >
          <Text style={styles.actionButtonText}>Manage Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('ProfileScreen')}
        >
          <Text style={styles.actionButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        
        {orders.length > 0 ? (
          <FlatList
            data={orders.slice(0, 5)} // Show only the most recent 5 orders
            renderItem={renderOrderItem}
            keyExtractor={item => item.order_id}
            scrollEnabled={false} // Disable scrolling as it's inside a ScrollView
          />
        ) : (
          <Text style={styles.emptyText}>No orders yet</Text>
        )}
        
        {orders.length > 5 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('OrderManagementScreen')}
          >
            <Text style={styles.viewAllButtonText}>View All Orders</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  welcomeText: {
    fontSize: 16,
    color: '#666'
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333'
  },
  logo: {
    width: 40,
    height: 40
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between'
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 14,
    color: '#666'
  },
  actionsContainer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4e9af1',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  pendingStatus: {
    backgroundColor: '#f0ad4e'
  },
  deliveryStatus: {
    backgroundColor: '#5bc0de'
  },
  deliveredStatus: {
    backgroundColor: '#5cb85c'
  },
  canceledStatus: {
    backgroundColor: '#d9534f'
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  orderActionButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  orderActionButtonText: {
    color: '#495057',
    fontSize: 14
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8
  },
  viewAllButtonText: {
    color: '#4e9af1',
    fontWeight: '500'
  }
});

export default DashboardScreen;
