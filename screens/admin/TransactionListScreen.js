import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const TransactionListScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      
      // Load all transactions
      const allTransactions = await localData.getTransactions();
      setTransactions(allTransactions.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      ));
      
      // Load orders
      const allOrders = await localData.getOrders();
      setOrders(allOrders.sort((a, b) => 
        new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
      ));
      
      // Load subscriptions
      const allSubscriptions = await localData.getSubscriptions();
      setSubscriptions(allSubscriptions);
      
      // Load users for mapping IDs to names
      const allUsers = await localData.getUsers();
      const users = {};
      allUsers.forEach(user => {
        users[user.id] = user;
      });
      setUserMap(users);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredData = () => {
    let data = [];
    
    // Determine which data types to include based on filter
    if (activeFilter === 'all' || activeFilter === 'transaction') {
      data = [...data, ...transactions.map(item => ({...item, type: 'transaction'}))];
    }
    
    if (activeFilter === 'all' || activeFilter === 'order') {
      data = [...data, ...orders.map(item => ({...item, type: 'order'}))];
    }
    
    if (activeFilter === 'all' || activeFilter === 'subscription') {
      data = [...data, ...subscriptions.map(item => ({...item, type: 'subscription'}))];
    }
    
    // Apply search filter if needed
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => {
        const userName = userMap[item.user_id]?.name?.toLowerCase() || '';
        const vendorName = userMap[item.vendor_id]?.name?.toLowerCase() || '';
        const orderId = item.order_id || item.transaction_id || item.subscription_id || '';
        
        return userName.includes(query) || 
               vendorName.includes(query) || 
               orderId.includes(query);
      });
    }
    
    // Sort by date, most recent first
    return data.sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || a.start_date);
      const dateB = new Date(b.date || b.created_at || b.start_date);
      return dateB - dateA;
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'order':
        return '#5bc0de'; // blue
      case 'subscription':
        return '#5cb85c'; // green
      case 'transaction':
        return '#f0ad4e'; // orange
      default:
        return '#777'; // gray
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return '#5cb85c'; // green
      case 'out for delivery':
        return '#5bc0de'; // blue
      case 'delayed':
        return '#f0ad4e'; // orange
      case 'canceled':
        return '#d9534f'; // red
      case 'pending':
      default:
        return '#777'; // gray
    }
  };

  const renderTransactionItem = ({ item }) => {
    const user = userMap[item.user_id] || {};
    const vendor = userMap[item.vendor_id] || {};
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
            <Text style={styles.typeText}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
          
          <Text style={styles.idText}>
            #{item.transaction_id || item.order_id || item.subscription_id || 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User:</Text>
            <Text style={styles.detailValue}>{user.name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vendor:</Text>
            <Text style={styles.detailValue}>{vendor.name || 'Unknown'}</Text>
          </View>
          
          {item.type === 'transaction' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.amountText}>₹{parseFloat(item.amount).toFixed(2)}</Text>
            </View>
          )}
          
          {item.type === 'order' && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Products:</Text>
                <Text style={styles.detailValue}>
                  {Array.isArray(item.products) ? item.products.length : 0} items
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status || 'Pending'}
                </Text>
              </View>
            </>
          )}
          
          {item.type === 'subscription' && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} ({item.frequency || 'Daily'})
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status || 'Active'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Period:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(item.start_date)} - {formatDate(item.end_date)}
                </Text>
              </View>
              
              {item.delivery_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Delivery:</Text>
                  <Text style={styles.detailValue}>{item.delivery_time}</Text>
                </View>
              )}
            </>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {formatDate(item.date || item.created_at || item.start_date)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            // Could implement detailed view
            Alert.alert(
              `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Details`,
              `ID: #${item.transaction_id || item.order_id || item.subscription_id}\nUser: ${user.name}\nVendor: ${vendor.name}`
            );
          }}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      {['all', 'transaction', 'order', 'subscription'].map(filter => (
        <TouchableOpacity
          key={filter}
          style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
          onPress={() => setActiveFilter(filter)}
        >
          <Text 
            style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}
          >
            {filter === 'all' ? 'All' : 
              filter.charAt(0).toUpperCase() + filter.slice(1) + 's'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  const filteredData = getFilteredData();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Transactions & Orders</Text>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', onPress: logout, style: 'destructive' }
                ]
              );
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
    
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by user, vendor or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      
      {renderFilterTabs()}
      
      {filteredData.length > 0 ? (
        <FlatList
          data={filteredData}
          renderItem={renderTransactionItem}
          keyExtractor={(item, index) => 
            (item.transaction_id || item.order_id || item.subscription_id || index.toString())
          }
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={loadData}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? `No results matching "${searchQuery}"`
              : activeFilter !== 'all' 
                ? `No ${activeFilter}s are currently available`
                : 'There are no transactions, orders, or subscriptions in the system yet'}
          </Text>
          
          {searchQuery && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
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
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#ff5252'
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600'
  },
  headerButtons: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  navButtonText: {
    color: '#333',
    fontWeight: '500'
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#333'
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0'
  },
  activeFilterTab: {
    backgroundColor: '#4e9af1'
  },
  filterText: {
    fontWeight: '500',
    color: '#666'
  },
  activeFilterText: {
    color: '#fff'
  },
  listContainer: {
    padding: 16
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  idText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  cardBody: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  detailLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: '500',
    color: '#666'
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  amountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4e9af1'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },
  viewButton: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  viewButtonText: {
    color: '#4e9af1',
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  clearSearchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4e9af1',
    borderRadius: 6
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '500'
  }
});

export default TransactionListScreen;
