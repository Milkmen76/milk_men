import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  TextInput,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

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
  const [searchQuery, setSearchQuery] = useState('');

  // Get status color based on status string
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
      case 'active':
        return '#4CAF50'; // green
      case 'out for delivery':
        return '#2196F3'; // blue
      case 'delayed':
      case 'paused':
        return '#FF9800'; // orange
      case 'cancelled':
      case 'canceled':
        return '#F44336'; // red
      case 'pending':
      case 'processing':
        return '#4e9af1'; // primary blue
      default:
        return '#9E9E9E'; // gray
    }
  };

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

  // Get filtered orders based on status filter and search query
  const getFilteredOrders = () => {
    let filtered = orders;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Apply search filter if there is a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const vendorInfo = vendorMap[order.vendor_id] || {};
        const vendorName = vendorInfo?.profile_info?.business_name?.toLowerCase() || '';
        const orderId = order.order_id?.toLowerCase() || '';
        return vendorName.includes(query) || orderId.includes(query);
      });
    }
    
    return filtered;
  };

  // Get filtered subscriptions based on status filter and search query
  const getFilteredSubscriptions = () => {
    let filtered = subscriptions;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }
    
    // Apply search filter if there is a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sub => {
        const vendorInfo = vendorMap[sub.vendor_id] || {};
        const vendorName = vendorInfo?.profile_info?.business_name?.toLowerCase() || '';
        const subId = sub.subscription_id?.toLowerCase() || '';
        return vendorName.includes(query) || subId.includes(query);
      });
    }
    
    return filtered;
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

  // Render an order item
  const renderOrderItem = ({ item }) => {
    const vendorInfo = vendorMap[item.vendor_id] || {};
    const vendorName = vendorInfo?.profile_info?.business_name || 'Vendor';
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity 
        style={styles.historyCard}
        onPress={() => navigation.navigate('OrderDetailsScreen', { orderId: item.order_id })}
      >
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.cardHeader}>
          <View style={styles.vendorContainer}>
            <Text style={styles.cardTitle}>
              {vendorName}
            </Text>
            <Text style={styles.cardDate}>
              {item.created_at ? formatDate(item.created_at) : formatDate(item.date)}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderIdText}>Order #{item.order_id}</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status || 'Pending'}</Text>
          </View>
          
          {item.products && (
            <Text style={styles.productsText}>
              {Array.isArray(item.products) ? `${item.products.length} items` : 'Items not available'}
            </Text>
          )}
          
          {item.total && (
            <Text style={styles.cardTotal}>₹{parseFloat(item.total).toFixed(2)}</Text>
          )}
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => navigation.navigate('OrderDetailsScreen', { orderId: item.order_id })}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a subscription item
  const renderSubscriptionItem = ({ item }) => {
    const vendorInfo = vendorMap[item.vendor_id] || {};
    const vendorName = vendorInfo?.profile_info?.business_name || 'Vendor';
    const statusColor = getStatusColor(item.status);

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
        onPress={() => navigation.navigate('SubscriptionDetailsScreen', { subscriptionId: item.subscription_id })}
      >
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.cardHeader}>
          <View style={styles.vendorContainer}>
            <Text style={styles.cardTitle}>
              {vendorName}
            </Text>
            <Text style={styles.subscriptionType}>
              {item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Regular'} Delivery
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderIdText}>Subscription #{item.subscription_id?.slice(-5)}</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>
        
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
        
        <View style={styles.divider} />
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => navigation.navigate('SubscriptionDetailsScreen', { subscriptionId: item.subscription_id })}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {statusText === 'Active' && (
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => navigation.navigate('ManageSubscription', { subscriptionId: item.subscription_id })}
            >
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          )}
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
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
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
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading your history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {activeTab === 'orders' ? 'My Orders' : 'My Subscriptions'}
          </Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearch} 
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
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
                    <Text style={styles.emptyText}>
                      {searchQuery 
                        ? 'No matching orders found' 
                        : `No ${statusFilter !== 'all' ? statusFilter : ''} orders found`}
                    </Text>
                    {(statusFilter !== 'all' || searchQuery) && (
                      <TouchableOpacity 
                        onPress={() => {
                          setStatusFilter('all');
                          setSearchQuery('');
                        }}
                      >
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
                data={getFilteredSubscriptions()}
                renderItem={renderSubscriptionItem}
                keyExtractor={item => item.subscription_id}
                contentContainerStyle={styles.listContent}
                onRefresh={loadData}
                refreshing={refreshing}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchQuery 
                        ? 'No matching subscriptions found' 
                        : `No ${statusFilter !== 'all' ? statusFilter : ''} subscriptions found`}
                    </Text>
                    {(statusFilter !== 'all' || searchQuery) && (
                      <TouchableOpacity 
                        onPress={() => {
                          setStatusFilter('all');
                          setSearchQuery('');
                        }}
                      >
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: 16,
    ...getShadowStyles(2)
  },
  headerTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S,
  },
  searchContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_S,
    marginBottom: SIZES.PADDING_S,
    paddingHorizontal: SIZES.PADDING_S,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    height: verticalScale(40),
    flex: 1,
    fontSize: SIZES.BODY,
    paddingHorizontal: SIZES.PADDING_S,
  },
  clearSearch: {
    padding: SIZES.PADDING_XS,
  },
  clearSearchText: {
    color: '#999',
    fontSize: SIZES.BODY,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa'
  },
  loadingText: {
    marginTop: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    color: '#666'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_S,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SIZES.PADDING_S,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTabButton: {
    borderBottomColor: '#4e9af1'
  },
  tabText: {
    fontSize: SIZES.BODY,
    fontWeight: '600',
    color: '#666'
  },
  activeTabText: {
    color: '#4e9af1',
    fontWeight: 'bold'
  },
  filtersContainer: {
    backgroundColor: '#f5f7fa',
    paddingVertical: SIZES.PADDING_M,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filtersContent: {
    paddingHorizontal: SIZES.PADDING_M,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    paddingVertical: SIZES.PADDING_M,
    paddingHorizontal: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_XL,
    marginRight: SIZES.PADDING_S,
    backgroundColor: '#f0f0f0',
    minWidth: scale(110),
    alignItems: 'center',
    justifyContent: 'center',
    height: verticalScale(50),
  },
  activeFilterButton: {
    backgroundColor: '#4e9af1'
  },
  filterButtonText: {
    fontSize: SIZES.BODY,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center'
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600'
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_XL
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    ...getShadowStyles(2),
    position: 'relative',
    overflow: 'hidden',
  },
  statusIndicator: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: SIZES.RADIUS_M,
    borderBottomLeftRadius: SIZES.RADIUS_M,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.PADDING_S,
    paddingLeft: SIZES.PADDING_S,
  },
  vendorContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS
  },
  cardDate: {
    fontSize: SIZES.CAPTION,
    color: '#888',
  },
  subscriptionType: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginTop: SIZES.PADDING_XS
  },
  statusText: {
    fontSize: SIZES.SMALL,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_XS
  },
  orderIdText: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#333'
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: SIZES.PADDING_S
  },
  cardContent: {
    marginBottom: SIZES.PADDING_S,
    paddingLeft: SIZES.PADDING_S,
  },
  productsText: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginVertical: SIZES.PADDING_XS
  },
  cardTotal: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: '600',
    color: '#4e9af1',
    marginTop: SIZES.PADDING_XS
  },
  dateRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.PADDING_S,
    paddingLeft: SIZES.PADDING_S,
  },
  dateItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    marginRight: SIZES.PADDING_XS
  },
  dateLabel: {
    fontSize: SIZES.SMALL,
    color: '#888',
    marginBottom: SIZES.PADDING_XS
  },
  dateValue: {
    fontSize: SIZES.CAPTION,
    color: '#333',
    fontWeight: '600'
  },
  cardFooter: {
    flexDirection: 'row',
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingVertical: SIZES.PADDING_XS,
    alignItems: 'center',
    borderRadius: SIZES.RADIUS_S,
    marginRight: SIZES.PADDING_XS
  },
  detailsButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
  },
  manageButton: {
    flex: 1,
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_XS,
    alignItems: 'center',
    borderRadius: SIZES.RADIUS_S,
    marginLeft: SIZES.PADDING_XS
  },
  manageButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
  },
  emptyContainer: {
    flex: 1,
    padding: SIZES.PADDING_XL,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: SIZES.BODY,
    color: '#666',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_S
  },
  showAllText: {
    color: '#4e9af1',
    fontSize: SIZES.BODY,
    fontWeight: '500'
  }
});

export default HistoryScreen;
