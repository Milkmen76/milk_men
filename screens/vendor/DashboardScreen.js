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
  Platform
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const businessName = user?.profile_info?.business_name || 'Your Business';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    paddingVertical: SIZES.PADDING_L,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2)
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
    marginTop: SIZES.PADDING_S
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    margin: SIZES.PADDING_XS,
    alignItems: 'center',
    minHeight: verticalScale(100),
    justifyContent: 'center',
    ...getShadowStyles(2)
  },
  statValue: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: SIZES.PADDING_XS
  },
  statLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666'
  },
  actionsContainer: {
    padding: SIZES.PADDING_M,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4e9af1',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    marginHorizontal: SIZES.PADDING_XS,
    alignItems: 'center',
    minHeight: SIZES.BUTTON_HEIGHT,
    justifyContent: 'center'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.BODY
  },
  section: {
    padding: SIZES.PADDING_M
  },
  sectionTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    marginBottom: SIZES.PADDING_M,
    color: '#333'
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    ...getShadowStyles(2)
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_S
  },
  orderTitle: {
    fontSize: SIZES.BODY,
    fontWeight: 'bold',
    color: '#333'
  },
  statusBadge: {
    paddingHorizontal: SIZES.PADDING_S,
    paddingVertical: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_S
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
    fontSize: SIZES.SMALL,
    fontWeight: '600'
  },
  orderDate: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_XS
  },
  orderAmount: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333',
    marginBottom: SIZES.PADDING_M
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: SIZES.PADDING_M,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  orderActionButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: verticalScale(36),
    justifyContent: 'center',
    alignItems: 'center'
  },
  orderActionButtonText: {
    color: '#495057',
    fontSize: SIZES.CAPTION,
    fontWeight: '500'
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: SIZES.PADDING_L,
    fontSize: SIZES.BODY
  },
  viewAllButton: {
    alignItems: 'center',
    padding: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_S,
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    ...getShadowStyles(1)
  },
  viewAllButtonText: {
    color: '#4e9af1',
    fontWeight: '600',
    fontSize: SIZES.BODY
  }
});

export default DashboardScreen;
