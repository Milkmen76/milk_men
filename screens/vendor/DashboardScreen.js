import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Image,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

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
        {item.total && <Text style={styles.orderAmount}>Amount: ₹{parseFloat(item.total).toFixed(2)}</Text>}
        
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const businessName = user?.profile_info?.business_name || 'Your Business';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.businessName}>{businessName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoContainer}
            onPress={() => navigation.navigate('ProfileScreen')}
          >
            <Image 
              source={require('../../assets/milk-icon.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
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
            <Text style={styles.statValue}>₹{stats.revenue.toFixed(2)}</Text>
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
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          
          {orders.length > 0 ? (
            <FlatList
              data={orders.slice(0, 5)} // Show only the 5 most recent orders
              renderItem={renderOrderItem}
              keyExtractor={item => item.order_id}
              scrollEnabled={false} // Disable scrolling as it's inside a ScrollView
              contentContainerStyle={styles.ordersList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerContainer: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.PADDING_M,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: SIZES.BODY,
    color: '#666'
  },
  businessName: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333'
  },
  logoContainer: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.RADIUS_ROUND,
    backgroundColor: '#f0f8ff'
  },
  logo: {
    width: scale(30),
    height: scale(30)
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SIZES.PADDING_S,
    justifyContent: 'space-between',
    marginTop: 16,
    marginHorizontal: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(90),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 8
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  actionsContainer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4e9af1',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  section: {
    padding: 16,
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  ordersList: {
    marginBottom: 8,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
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
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  orderActionButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  orderActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 14,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  viewAllButtonText: {
    color: '#4e9af1',
    fontWeight: '600',
    fontSize: 16
  }
});

export default DashboardScreen;
