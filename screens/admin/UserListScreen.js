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
  StatusBar
} from 'react-native';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';
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

  

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
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
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
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
    backgroundColor: '#f5f7fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: SIZES.PADDING_S,
    color: '#666',
    fontSize: SIZES.BODY
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: SIZES.PADDING_M,
    paddingBottom: SIZES.PADDING_M,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2)
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M
  },
  title: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333'
  },
  signOutButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#ff5252',
    minHeight: verticalScale(30),
    justifyContent: 'center',
    alignItems: 'center'
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.CAPTION
  },
  headerButtons: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.PADDING_S,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  navButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_S,
    marginHorizontal: SIZES.PADDING_XS,
    marginBottom: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    backgroundColor: '#f0f0f0',
    minHeight: verticalScale(32),
    minWidth: scale(80),
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadowStyles(1)
  },
  navButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
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
    borderRadius: SIZES.RADIUS_S,
    paddingHorizontal: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#333'
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: SIZES.PADDING_S,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(1)
  },
  filterTab: {
    flex: 1,
    paddingVertical: SIZES.PADDING_S,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: verticalScale(36),
    justifyContent: 'center'
  },
  activeFilterTab: {
    borderBottomColor: '#4e9af1'
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
    fontSize: SIZES.CAPTION
  },
  activeFilterText: {
    color: '#4e9af1'
  },
  listContainer: {
    padding: SIZES.PADDING_M
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    ...getShadowStyles(3)
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_M
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userName: {
    fontSize: SIZES.SUBTITLE,
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
    paddingHorizontal: SIZES.PADDING_S,
    paddingVertical: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_S
  },
  roleText: {
    color: '#fff',
    fontSize: SIZES.SMALL,
    fontWeight: '600'
  },
  userInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_XS
  },
  userEmail: {
    fontSize: SIZES.BODY,
    color: '#666',
    marginBottom: SIZES.PADDING_S
  },
  userDetail: {
    fontSize: SIZES.CAPTION,
    color: '#777',
    marginBottom: SIZES.PADDING_XS
  },
  businessInfoContainer: {
    backgroundColor: '#f8f8f8',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    marginTop: SIZES.PADDING_M,
  },
  businessInfoTitle: {
    fontSize: SIZES.CAPTION,
    fontWeight: '600',
    color: '#444',
    marginBottom: SIZES.PADDING_XS
  },
  businessInfoText: {
    fontSize: SIZES.SMALL,
    color: '#666',
    marginBottom: SIZES.PADDING_XXS
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_L
  },
  emptyText: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_S
  },
  emptySubtext: {
    fontSize: SIZES.BODY,
    color: '#666',
    textAlign: 'center',
    marginBottom: SIZES.PADDING_M
  },
  clearSearchButton: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    backgroundColor: '#4e9af1',
    borderRadius: SIZES.RADIUS_S,
    minHeight: SIZES.BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadowStyles(2)
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: SIZES.BODY
  }
});

export default UserListScreen;
