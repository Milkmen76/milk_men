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
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const UserListScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnimation] = useState(new Animated.Value(0));
  
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Animate the filter tabs when changing
    Animated.timing(filterAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      filterAnimation.setValue(0);
    });
  }, [activeFilter]);

  const loadUsers = async () => {
    try {
      setRefreshing(true);
      const allUsers = await localData.getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredUsers = () => {
    // Filter by role
    let filtered = users;
    if (activeFilter !== 'all') {
      filtered = users.filter(user => user.role === activeFilter);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#d9534f'; // red
      case 'vendor':
        return '#5bc0de'; // blue
      case 'user':
        return '#5cb85c'; // green
      default:
        return '#777'; // gray
    }
  };

  const getStatusDot = (user) => {
    if (user.role !== 'vendor') return null;
    
    const statusColor = user.approval_status === 'approved' 
      ? '#5cb85c' // green
      : user.approval_status === 'rejected'
        ? '#d9534f' // red
        : '#f0ad4e'; // orange for pending
    
    return (
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
    );
  };

  const handleUserPress = (user) => {
    // Could implement user detail view or role-specific actions
    Alert.alert(
      `${user.name}`,
      `Role: ${user.role}\nEmail: ${user.email}`,
      [
        { text: 'OK' }
      ]
    );
  };

  const renderUserItem = ({ item, index }) => {
    // Staggered animation for list items
    const translateY = new Animated.Value(50);
    const opacity = new Animated.Value(0);
    
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
    
    return (
      <Animated.View 
        style={[
          styles.userCard,
          { transform: [{ translateY }], opacity }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleUserPress(item)}
        >
          <View style={styles.userHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.name}</Text>
              {getStatusDot(item)}
            </View>
            <View 
              style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}
            >
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.created_at && (
              <Text style={styles.userDetail}>
                Joined: {new Date(item.created_at).toLocaleDateString()}
              </Text>
            )}
            {item.role === 'vendor' && (
              <Text style={styles.userDetail}>
                Status: 
                <Text style={{
                  fontWeight: '600',
                  color: item.approval_status === 'approved' 
                    ? '#5cb85c' 
                    : item.approval_status === 'rejected'
                      ? '#d9534f'
                      : '#f0ad4e'
                }}>
                  {' '}{item.approval_status || 'pending'}
                </Text>
              </Text>
            )}
            
            {item.role === 'vendor' && item.profile_info && (
              <View style={styles.businessInfoContainer}>
                <Text style={styles.businessInfoTitle}>Business Info:</Text>
                {item.profile_info.business_name && (
                  <Text style={styles.businessInfoText}>
                    {item.profile_info.business_name}
                  </Text>
                )}
                {item.profile_info.address && (
                  <Text style={styles.businessInfoText}>
                    {item.profile_info.address}
                  </Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFilterTabs = () => {
    const translateX = filterAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 0],
    });
    
    return (
      <View style={styles.filterTabs}>
        {['all', 'user', 'vendor', 'admin'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
            onPress={() => setActiveFilter(filter)}
          >
            <Animated.Text 
              style={[
                styles.filterText, 
                activeFilter === filter && styles.activeFilterText,
                activeFilter === filter && { transform: [{ translateX }] }
              ]}
            >
              {filter === 'all' ? 'All Users' : filter.charAt(0).toUpperCase() + filter.slice(1) + 's'}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHeaderButtons = () => (
    <View style={styles.headerButtons}>
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('VendorApproval')}
      >
        <Text style={styles.navButtonText}>Approvals</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('ProductListScreen')}
      >
        <Text style={styles.navButtonText}>Products</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('TransactionListScreen')}
      >
        <Text style={styles.navButtonText}>Transactions</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton}
        onPress={() => navigation.navigate('ProfileScreen')}
      >
        <Text style={styles.navButtonText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>User Management</Text>
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
        
        {renderHeaderButtons()}
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      
      {renderFilterTabs()}
      
      {filteredUsers().length > 0 ? (
        <FlatList
          data={filteredUsers()}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={loadUsers}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery 
              ? `No results matching "${searchQuery}"`
              : activeFilter !== 'all' 
                ? `No ${activeFilter}s are currently registered`
                : 'There are no users in the system'}
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
    padding: 12,
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
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeFilterTab: {
    borderBottomColor: '#4e9af1'
  },
  filterText: {
    color: '#666',
    fontWeight: '500'
  },
  activeFilterText: {
    color: '#4e9af1'
  },
  listContainer: {
    padding: 16
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  userInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginTop: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  userDetail: {
    fontSize: 13,
    color: '#777',
    marginBottom: 4
  },
  businessInfoContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  businessInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6
  },
  businessInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3
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

export default UserListScreen;
