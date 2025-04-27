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
  Platform,
  StatusBar,
  Image
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
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
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Could implement detailed view
              Alert.alert(
                `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Details`,
                `ID: #${item.transaction_id || item.order_id || item.subscription_id}\nUser: ${user.name}\nVendor: ${vendor.name}`
              );
            }}
          >
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filtersScrollView}>
      <View style={styles.filtersContainer}>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'all' && styles.activeFilterButton
          ]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[
            styles.filterButtonText, 
            activeFilter === 'all' && styles.activeFilterText
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'transaction' && styles.activeFilterButton
          ]}
          onPress={() => setActiveFilter('transaction')}
        >
          <Text style={[
            styles.filterButtonText, 
            activeFilter === 'transaction' && styles.activeFilterText
          ]}>
            Transactions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'order' && styles.activeFilterButton
          ]}
          onPress={() => setActiveFilter('order')}
        >
          <Text style={[
            styles.filterButtonText, 
            activeFilter === 'order' && styles.activeFilterText
          ]}>
            Orders
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            activeFilter === 'subscription' && styles.activeFilterButton
          ]}
          onPress={() => setActiveFilter('subscription')}
        >
          <Text style={[
            styles.filterButtonText, 
            activeFilter === 'subscription' && styles.activeFilterText
          ]}>
            Subscriptions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNavButtons = () => (
    <View style={styles.filtersScrollView}>
     
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Admin Dashboard</Text>
            <Text style={styles.businessName}>Transactions</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoContainer}
            onPress={() => navigation.navigate('ProfileTab')}
            activeOpacity={0.7}
          >
            <Image 
              source={require('../../assets/milk-icon.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
        
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
        
      {renderNavButtons()}
      {renderFilterTabs()}
        
      {getFilteredData().length > 0 ? (
        <FlatList
          data={getFilteredData()}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => 
            (item.transaction_id || item.order_id || item.subscription_id) + item.type
          }
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={loadData}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? 'No transactions match your search criteria' 
              : `No ${activeFilter !== 'all' ? activeFilter : ''} transactions available`
            }
          </Text>
          {searchQuery && (
            <TouchableOpacity 
              style={styles.btnAction}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.btnActionText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  searchContainer: {
    padding: SIZES.PADDING_M,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  searchInput: {
    height: SIZES.INPUT_HEIGHT,
    backgroundColor: '#f5f5f5',
    borderRadius: SIZES.RADIUS_M,
    paddingHorizontal: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#333'
  },
  filtersScrollView: {
    backgroundColor: '#fff',
    marginBottom: 8,
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
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
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
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  idText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  cardBody: {
    padding: 16
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  amountText: {
    fontSize: 14,
    color: '#4e9af1',
    fontWeight: '600'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600'
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
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
  btnAction: {
    backgroundColor: '#4e9af1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: scale(120),
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
  btnActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default TransactionListScreen;
