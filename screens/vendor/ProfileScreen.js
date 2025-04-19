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
import { launchImageLibrary } from 'react-native-image-picker';

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
  
  // Business logo state
  const [businessLogo, setBusinessLogo] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  
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
        setLogoBase64(user.profile_info.logo_base64 || null);
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
        setLogoBase64(user.profile_info.logo_base64 || null);
      }
      setPassword('');
      setConfirmPassword('');
    }
    
    setEditing(!editing);
  };
  
  const selectBusinessLogo = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.7,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'An error occurred while selecting the image');
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        setBusinessLogo(source.uri);
        setLogoBase64(response.assets[0].base64);
      }
    });
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
          avatar: selectedAvatar,
          logo_base64: logoBase64
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
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your business profile</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handleChangeAvatar}>
              <Image 
                source={avatarImages[selectedAvatar] || avatarImages['milk-icon.png']}
                style={styles.avatarImage}
              />
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditBadgeText}>✏️</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.businessName}>{businessName || 'Your Business'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {user?.approval_status === 'approved' ? 'Approved' : 'Pending Approval'}
              </Text>
            </View>
          </View>
          
          {!editing ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditToggle}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editButtonsRow}>
              <TouchableOpacity 
                style={[styles.editActionButton, styles.cancelButton]}
                onPress={handleEditToggle}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editActionButton, styles.saveButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Business Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{businessStats.orders}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{businessStats.products}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{businessStats.customers}</Text>
              <Text style={styles.statLabel}>Customers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₹{businessStats.revenue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </View>
        
        {editing ? (
          <View style={styles.editFormContainer}>
            <Text style={styles.formSectionTitle}>Business Information</Text>
            
            <Text style={styles.inputLabel}>Business Name *</Text>
            <TextInput
              style={styles.textInput}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Enter business name"
            />
            
            <Text style={styles.inputLabel}>Business Description</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your business"
              multiline
              numberOfLines={4}
            />
            
            <Text style={styles.inputLabel}>Business Logo</Text>
            <View style={styles.logoContainer}>
              {logoBase64 ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${logoBase64}` }}
                  style={styles.businessLogoImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderLogo}>
                  <Text style={styles.placeholderLogoText}>Add Logo</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.uploadLogoButton}
                onPress={selectBusinessLogo}
              >
                <Text style={styles.uploadLogoButtonText}>
                  {logoBase64 ? 'Change Logo' : 'Upload Logo'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Business Address</Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter business address"
            />
            
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            
            <Text style={styles.formSectionTitle}>Account Information</Text>
            
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: '#f0f0f0' }]}
              value={email}
              editable={false}
            />
            
            <Text style={styles.inputLabel}>New Password (leave blank to keep current)</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password"
              secureTextEntry
            />
            
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
            />
          </View>
        ) : (
          <View style={styles.profileInfoContainer}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Business Name</Text>
                <Text style={styles.infoValue}>{businessName || 'Not set'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>{description || 'Not set'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Business Logo</Text>
                <View style={styles.businessLogoContainer}>
                  {logoBase64 ? (
                    <Image 
                      source={{ uri: `data:image/jpeg;base64,${logoBase64}` }}
                      style={styles.businessLogoThumb}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.infoValue}>No logo set</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{address || 'Not set'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{phone || 'Not set'}</Text>
              </View>
            </View>
          </View>
        )}
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
            <Text style={styles.modalTitle}>Select Avatar</Text>
            <FlatList
              data={availableAvatars}
              renderItem={renderAvatarItem}
              keyExtractor={item => item.value}
              numColumns={3}
              contentContainerStyle={styles.avatarGrid}
            />
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#f44336',
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4e9af1',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadgeText: {
    fontSize: 12,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4e9af1',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  editFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  formSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessLogoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  placeholderLogo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  placeholderLogoText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  uploadLogoButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadLogoButtonText: {
    color: '#2196f3',
    fontWeight: '500',
  },
  profileInfoContainer: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
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
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  businessLogoContainer: {
    marginTop: 8,
  },
  businessLogoThumb: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  avatarGrid: {
    paddingVertical: 8,
  },
  avatarOption: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
  },
  selectedAvatarOption: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  avatarOptionImage: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  avatarOptionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalButtonText: {
    color: '#666',
    fontWeight: '500',
  },
});

export default ProfileScreen;
