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
  const [activeTab, setActiveTab] = useState(initialTab); // Use initialTab from route params
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'delivered', 'cancelled', etc.
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
        return '#5cb85c'; // green
      case 'out for delivery':
        return '#5bc0de'; // blue
      case 'delayed':
        return '#f0ad4e'; // orange
      case 'cancelled':
      case 'canceled':
        return '#d9534f'; // red
      case 'pending':
      default:
        return '#777'; // gray
    }
  };

  // Render an order item
  const renderOrderItem = ({ item }) => {
    const vendorInfo = vendorMap[item.vendor_id] || {};
    const vendorName = vendorInfo?.profile_info?.business_name || 'Vendor';

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            Order from {vendorName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status || 'Pending'}</Text>
          </View>
        </View>
        
        <Text style={styles.cardDate}>
          Ordered on {item.created_at ? formatDate(item.created_at) : formatDate(item.date)}
        </Text>
        
        {item.total && (
          <Text style={styles.cardTotal}>Total: ${parseFloat(item.total).toFixed(2)}</Text>
        )}

        {item.products && (
          <Text style={styles.productsText}>
            {Array.isArray(item.products) ? `${item.products.length} items` : 'Items not available'}
          </Text>
        )}
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => {
              // In a real app, navigate to order details
              // navigation.navigate('OrderDetails', { orderId: item.order_id });
              alert(`Order ID: ${item.order_id}\nStatus: ${item.status}\nVendor: ${vendorName}`);
            }}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
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
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            Subscription with {vendorName}
          </Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(statusText) }
          ]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        
        <Text style={styles.cardType}>
          {item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Regular'} Delivery
        </Text>
        
        <View style={styles.dateRange}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateValue}>{formatDate(item.start_date)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>End Date</Text>
            <Text style={styles.dateValue}>{formatDate(item.end_date)}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => {
              // In a real app, navigate to subscription details
              // navigation.navigate('SubscriptionDetails', { subscriptionId: item.subscription_id });
              alert(`Subscription ID: ${item.subscription_id}\nStatus: ${statusText}\nVendor: ${vendorName}`);
            }}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    fontWeight: '500',
    color: '#666'
  },
  activeTabText: {
    color: '#4e9af1',
    fontWeight: 'bold'
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f0f0f0'
  },
  activeFilterButton: {
    backgroundColor: '#4e9af1'
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666'
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '500'
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#999'
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  cardTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4e9af1',
    marginBottom: 12
  },
  productsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  cardType: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12
  },
  dateRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  dateItem: {
    flex: 1
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  dateValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12
  },
  detailsButton: {
    backgroundColor: '#f0f8ff',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  detailsButtonText: {
    color: '#4e9af1',
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
