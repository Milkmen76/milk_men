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
  Animated,
  StatusBar,
  Image
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const UserListScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  
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
      <View style={styles.filtersScrollView}>
        <View style={styles.filtersContainer}>
          {['all', 'user', 'vendor', 'admin'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton, 
                activeFilter === filter && styles.activeFilterButton
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text 
                style={[
                  styles.filterButtonText, 
                  activeFilter === filter && styles.activeFilterText
                ]}
              >
                {filter === 'all' ? 'All Users' : filter.charAt(0).toUpperCase() + filter.slice(1) + 's'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading users...</Text>
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
            <Text style={styles.businessName}>User Management</Text>
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
              : `No ${activeFilter !== 'all' ? activeFilter : ''} users available`}
          </Text>
          {searchQuery && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.actionButtonText}>Clear Search</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
    padding: SIZES.PADDING_M
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
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
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginLeft: SIZES.PADDING_S
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
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
    marginBottom: 6
  },
  userDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  businessInfoContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  businessInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4
  },
  businessInfoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2
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
  actionButton: {
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
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default UserListScreen;
