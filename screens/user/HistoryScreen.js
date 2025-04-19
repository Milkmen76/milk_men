import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

const HistoryScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const route = navigation.getState().routes[navigation.getState().index];
  const initialTab = route.params?.initialTab || 'orders';
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [vendorMap, setVendorMap] = useState({});

  useEffect(() => {
    if (!user) return;
    
    loadData();
  }, [user]);

  const loadData = async () => {
    setRefreshing(true);
    try {
      // Fetch user's orders
      const userOrders = await localData.getOrdersByUser(user.id);
      setOrders(userOrders);
      
      // Fetch user's subscriptions
      const userSubscriptions = await localData.getSubscriptionsByUser(user.id);
      setSubscriptions(userSubscriptions);

      // Load vendors for mapping
      const allUsers = await localData.getUsers();
      const vendors = {};
      allUsers.forEach(user => {
        if (user.role === 'vendor') {
          vendors[user.id] = user;
        }
      });
      setVendorMap(vendors);
    } catch (error) {
      console.error('Error fetching user history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Get filtered orders based on status filter
  const getFilteredOrders = () => {
    if (statusFilter === 'all') {
      return orders;
    }
    return orders.filter(order => order.status === statusFilter);
  };

  // Format date string to readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return '#4CAF50'; // green
      case 'out for delivery':
        return '#2196F3'; // blue
      case 'delayed':
        return '#FF9800'; // orange
      case 'cancelled':
      case 'canceled':
        return '#F44336'; // red
      case 'pending':
      default:
        return '#9E9E9E'; // gray
    }
  };

  // Render an order item
  const renderOrderItem = ({ item }) => {
    const vendorInfo = vendorMap[item.vendor_id] || {};
    const vendorName = vendorInfo?.profile_info?.business_name || 'Vendor';

    return (
      <TouchableOpacity 
        style={styles.historyCard}
        onPress={() => {
          alert(`Order ID: ${item.order_id}\nStatus: ${item.status}\nVendor: ${vendorName}`);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.vendorContainer}>
            <Text style={styles.cardTitle}>
              {vendorName}
            </Text>
            <Text style={styles.cardDate}>
              {item.created_at ? formatDate(item.created_at) : formatDate(item.date)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status || 'Pending'}</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.cardContent}>
          {item.products && (
            <Text style={styles.productsText}>
              {Array.isArray(item.products) ? `${item.products.length} items` : 'Items not available'}
            </Text>
          )}
          
          {item.total && (
            <Text style={styles.cardTotal}>₹{parseFloat(item.total).toFixed(2)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render a subscription item
  const renderSubscriptionItem = ({ item }) => {
    const vendorInfo = vendorMap[item.vendor_id] || {};
    const vendorName = vendorInfo?.profile_info?.business_name || 'Vendor';

    // Determine if subscription is active
    const isActive = () => {
      if (item.status === 'cancelled' || item.status === 'completed') {
        return false;
      }
      const endDate = new Date(item.end_date);
      const now = new Date();
      return endDate > now;
    };

    const statusText = item.status || (isActive() ? 'Active' : 'Expired');
    
    return (
      <TouchableOpacity 
        style={styles.historyCard}
        onPress={() => {
          alert(`Subscription ID: ${item.subscription_id}\nStatus: ${statusText}\nVendor: ${vendorName}`);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.vendorContainer}>
            <Text style={styles.cardTitle}>
              {vendorName}
            </Text>
            <Text style={styles.subscriptionType}>
              {item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Regular'} Delivery
            </Text>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(statusText) }
          ]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.dateRange}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Starts</Text>
            <Text style={styles.dateValue}>{formatDate(item.start_date)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Ends</Text>
            <Text style={styles.dateValue}>{formatDate(item.end_date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render status filter buttons
  const renderStatusFilters = () => {
    const statusOptions = activeTab === 'orders' 
      ? [
          { value: 'all', label: 'All Orders' },
          { value: 'pending', label: 'Pending' },
          { value: 'processing', label: 'Processing' },
          { value: 'delivered', label: 'Delivered' },
          { value: 'cancelled', label: 'Cancelled' }
        ]
      : [
          { value: 'all', label: 'All Subscriptions' },
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' }
        ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {statusOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterButton,
              statusFilter === option.value && styles.activeFilterButton
            ]}
            onPress={() => setStatusFilter(option.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === option.value && styles.activeFilterText
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading your history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'orders' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('orders');
            setStatusFilter('all');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'subscriptions' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('subscriptions');
            setStatusFilter('all');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.activeTabText]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
      </View>
      
      {renderStatusFilters()}
      
      {activeTab === 'orders' && (
        <View style={styles.contentContainer}>
          {orders.length > 0 ? (
            <FlatList
              data={getFilteredOrders()}
              renderItem={renderOrderItem}
              keyExtractor={item => item.order_id}
              contentContainerStyle={styles.listContent}
              onRefresh={loadData}
              refreshing={refreshing}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No {statusFilter !== 'all' ? statusFilter : ''} orders found</Text>
                  {statusFilter !== 'all' && (
                    <TouchableOpacity onPress={() => setStatusFilter('all')}>
                      <Text style={styles.showAllText}>Show all orders</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't placed any orders yet</Text>
            </View>
          )}
        </View>
      )}
      
      {activeTab === 'subscriptions' && (
        <View style={styles.contentContainer}>
          {subscriptions.length > 0 ? (
            <FlatList
              data={subscriptions.filter(sub => statusFilter === 'all' || sub.status === statusFilter)}
              renderItem={renderSubscriptionItem}
              keyExtractor={item => item.subscription_id}
              contentContainerStyle={styles.listContent}
              onRefresh={loadData}
              refreshing={refreshing}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No {statusFilter !== 'all' ? statusFilter : ''} subscriptions found</Text>
                  {statusFilter !== 'all' && (
                    <TouchableOpacity onPress={() => setStatusFilter('all')}>
                      <Text style={styles.showAllText}>Show all subscriptions</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You don't have any subscriptions yet</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  activeTabButton: {
    borderBottomColor: '#4e9af1'
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  activeTabText: {
    color: '#4e9af1',
    fontWeight: 'bold'
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  filtersContent: {
    paddingHorizontal: 12
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f0f0f0'
  },
  activeFilterButton: {
    backgroundColor: '#4e9af1'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600'
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  vendorContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  cardDate: {
    fontSize: 14,
    color: '#888',
  },
  subscriptionType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productsText: {
    fontSize: 15,
    color: '#666',
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4e9af1',
  },
  dateRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4
  },
  dateLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12
  },
  showAllText: {
    color: '#4e9af1',
    fontSize: 15,
    fontWeight: '500'
  }
});

export default HistoryScreen;
