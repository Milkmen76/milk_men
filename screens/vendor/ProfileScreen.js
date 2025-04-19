import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  Modal,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

// Avatar image mapping
const avatarImages = {
  'milk-icon.png': require('../../assets/milk-icon.png'),
  'icon.png': require('../../assets/icon.png'),
  'splash-icon.png': require('../../assets/splash-icon.png'),
  'adaptive-icon.png': require('../../assets/adaptive-icon.png'),
  'favicon.png': require('../../assets/favicon.png'),
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout, updateUserData } = useAuth();
  
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [businessStats, setBusinessStats] = useState({
    orders: 0,
    products: 0,
    customers: 0,
    revenue: 0
  });
  
  // Avatar selection state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('milk-icon.png');
  const [availableAvatars, setAvailableAvatars] = useState([]);
  
  useEffect(() => {
    loadVendorData();
    
    // Load available avatars
    setAvailableAvatars(localData.getAvailableAvatars());
  }, [user]);
  
  const loadVendorData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Set form values from user data
      setEmail(user.email || '');
      
      // Load business info from profile_info
      if (user.profile_info) {
        setBusinessName(user.profile_info.business_name || '');
        setAddress(user.profile_info.address || '');
        setPhone(user.profile_info.phone || '');
        setDescription(user.profile_info.description || '');
        setSelectedAvatar(user.profile_info.avatar || 'milk-icon.png');
      }
      
      // Load business stats
      try {
        // Get orders for this vendor
        const orders = await localData.getOrdersByVendor(user.id);
        
        // Get products for this vendor
        const products = await localData.getProductsByVendor(user.id);
        
        // Calculate total revenue from orders
        let totalRevenue = 0;
        const uniqueCustomers = new Set();
        
        orders.forEach(order => {
          if (order.total) {
            totalRevenue += parseFloat(order.total);
          }
          
          if (order.user_id) {
            uniqueCustomers.add(order.user_id);
          }
        });
        
        setBusinessStats({
          orders: orders.length,
          products: products.length,
          customers: uniqueCustomers.size,
          revenue: totalRevenue
        });
      } catch (error) {
        console.error('Error loading business stats:', error);
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: async () => await logout() }
      ]
    );
  };
  
  const handleEditToggle = () => {
    if (editing) {
      // Revert form values if canceling
      if (user.profile_info) {
        setBusinessName(user.profile_info.business_name || '');
        setAddress(user.profile_info.address || '');
        setPhone(user.profile_info.phone || '');
        setDescription(user.profile_info.description || '');
      }
      setPassword('');
      setConfirmPassword('');
    }
    
    setEditing(!editing);
  };
  
  const handleSaveProfile = async () => {
    if (!businessName) {
      Alert.alert('Error', 'Business name is required');
      return;
    }
    
    if (password && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare profile data update
      const updateData = {
        profile_info: {
          ...user.profile_info,
          business_name: businessName,
          address: address,
          phone: phone,
          description: description,
          avatar: selectedAvatar
        }
      };
      
      // Add password if provided
      if (password) {
        updateData.password = password;
      }
      
      // Update profile
      const result = await updateUserData(updateData);
      
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditing(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangeAvatar = () => {
    setShowAvatarModal(true);
  };
  
  const selectAvatar = async (avatarName) => {
    setSelectedAvatar(avatarName);
    setShowAvatarModal(false);
    
    // If not in editing mode, save immediately
    if (!editing) {
      try {
        setLoading(true);
        const success = await localData.updateUserAvatar(user.id, avatarName);
        
        if (success) {
          // Update local context
          const updateData = {
            profile_info: {
              ...(user.profile_info || {}),
              avatar: avatarName
            }
          };
          await updateUserData(updateData);
          Alert.alert('Success', 'Avatar updated successfully');
        } else {
          Alert.alert('Error', 'Failed to update avatar');
        }
      } catch (error) {
        console.error('Error updating avatar:', error);
        Alert.alert('Error', 'Failed to update avatar');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const renderAvatarItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.avatarOption,
        selectedAvatar === item.value && styles.selectedAvatarOption
      ]}
      onPress={() => selectAvatar(item.value)}
    >
      <Image
        source={avatarImages[item.value]}
        style={styles.avatarOptionImage}
        resizeMode="contain"
      />
      <Text style={styles.avatarOptionText}>{item.label}</Text>
    </TouchableOpacity>
  );
  
  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <Image 
                source={avatarImages[selectedAvatar] || avatarImages['milk-icon.png']}
                style={styles.avatar}
                resizeMode="contain"
              />
              {!editing && (
                <TouchableOpacity 
                  style={styles.editAvatarButton}
                  onPress={handleChangeAvatar}
                >
                  <Text style={styles.editAvatarText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.businessName}>{businessName || 'Your Business'}</Text>
              <View style={styles.approvalBadge}>
                <Text style={styles.approvalText}>
                  {user?.approval_status?.toUpperCase() || 'PENDING'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{businessStats.orders}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{businessStats.products}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{businessStats.customers}</Text>
              <Text style={styles.statLabel}>Customers</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>${businessStats.revenue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            {editing ? 'Edit Business Information' : 'Business Information'}
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Business Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your business name"
              />
            ) : (
              <Text style={styles.infoText}>{businessName || 'Not provided'}</Text>
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Business Address</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Business address"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.infoText}>{address || 'Not provided'}</Text>
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Business phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoText}>{phone || 'Not provided'}</Text>
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.infoText}>{email || 'Not provided'}</Text>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Business Description</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell customers about your business..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.infoText}>
                {description || 'No business description provided.'}
              </Text>
            )}
          </View>
          
          {editing && (
            <>
              <Text style={[styles.sectionTitle, {marginTop: 20}]}>Change Password</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password (leave blank to keep current)</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="New password"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Confirm new password"
                />
              </View>
            </>
          )}
        </View>
        
        {!editing && (
          <View style={styles.quickLinks}>
            <Text style={styles.sectionTitle}>Quick Links</Text>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => navigation.navigate('OrderManagementScreen')}
            >
              <Text style={styles.linkText}>Manage Orders</Text>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => navigation.navigate('ProductManagementScreen')}
            >
              <Text style={styles.linkText}>Manage Products</Text>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => navigation.navigate('DashboardScreen')}
            >
              <Text style={styles.linkText}>Dashboard</Text>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.actionsContainer}>
          {editing ? (
            <>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleEditToggle}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={handleEditToggle}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dashboardButton} 
                onPress={() => navigation.navigate('DashboardScreen')}
              >
                <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
      
      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Business Avatar</Text>
            
            <FlatList
              data={availableAvatars}
              renderItem={renderAvatarItem}
              keyExtractor={item => item.value}
              numColumns={2}
              contentContainerStyle={styles.avatarGrid}
            />
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fdf5e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
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
  avatar: {
    width: 50,
    height: 50
  },
  editAvatarButton: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    backgroundColor: '#f0ad4e',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  editAvatarText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold'
  },
  headerTextContainer: {
    flex: 1
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  approvalBadge: {
    backgroundColor: '#f0ad4e',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20
  },
  approvalText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  statsContainer: {
    margin: 15
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f0ad4e',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 14,
    color: '#666'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginLeft: 5
  },
  formContainer: {
    padding: 15
  },
  formGroup: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6
  },
  infoText: {
    fontSize: 16,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  quickLinks: {
    padding: 15
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
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
  linkText: {
    fontSize: 16,
    color: '#333'
  },
  linkArrow: {
    fontSize: 20,
    color: '#999'
  },
  actionsContainer: {
    padding: 15,
    marginBottom: 30
  },
  editButton: {
    backgroundColor: '#f0ad4e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
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
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  dashboardButton: {
    backgroundColor: '#5cb85c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
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
  dashboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  logoutButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  logoutButtonText: {
    color: '#d9534f',
    fontSize: 16,
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#f0ad4e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
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
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500'
  },
  // Avatar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  avatarGrid: {
    paddingVertical: 10
  },
  avatarOption: {
    flex: 1,
    margin: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8'
  },
  selectedAvatarOption: {
    borderColor: '#f0ad4e',
    backgroundColor: '#fdf5e6'
  },
  avatarOptionImage: {
    width: 60,
    height: 60,
    marginBottom: 8
  },
  avatarOptionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666'
  }
});

export default ProfileScreen;
