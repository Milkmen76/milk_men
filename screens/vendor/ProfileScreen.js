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
  FlatList,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';
import * as ImagePicker from 'expo-image-picker';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

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
  const [logoBase64, setLogoBase64] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('milk-icon.png');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [businessStats, setBusinessStats] = useState({
    orders: 0,
    products: 0,
    customers: 0,
    revenue: 0,
  });

  const availableAvatars = [
    { value: 'milk-icon.png', label: 'Milk Icon' },
    { value: 'icon.png', label: 'App Icon' },
    { value: 'splash-icon.png', label: 'Splash Icon' },
    { value: 'adaptive-icon.png', label: 'Adaptive Icon' },
    { value: 'favicon.png', label: 'Favicon' },
  ];

  useEffect(() => {
    loadUserData();
    loadBusinessStats();
  }, [user]);

  const loadUserData = () => {
    if (!user) return;
    
    setLoading(true);
    try {
      setEmail(user.email || '');
      
      // Load profile info
      const profileInfo = user.profile_info || {};
      setBusinessName(profileInfo.business_name || '');
      setAddress(profileInfo.address || '');
      setPhone(profileInfo.phone || '');
      setDescription(profileInfo.description || '');
      setLogoBase64(profileInfo.logo || '');
      setSelectedAvatar(profileInfo.avatar || 'milk-icon.png');
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessStats = async () => {
    if (!user || !user.uid) return;
    
    try {
      // Load orders
      const allOrders = await localData.getOrders();
      const vendorOrders = allOrders.filter(order => 
        order.vendor_id === user.uid
      );
      
      // Load products
      const allProducts = await localData.getProducts();
      const vendorProducts = allProducts.filter(product => 
        product.vendor_id === user.uid
      );
      
      // Calculate unique customers
      const uniqueCustomers = [...new Set(vendorOrders.map(order => order.user_id))];
      
      // Calculate total revenue
      const totalRevenue = vendorOrders.reduce((sum, order) => {
        return sum + (order.total_amount || 0);
      }, 0);
      
      setBusinessStats({
        orders: vendorOrders.length,
        products: vendorProducts.length,
        customers: uniqueCustomers.length,
        revenue: totalRevenue,
      });
    } catch (error) {
      console.error('Error loading business stats:', error);
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      // Cancel edit, revert to original data
      loadUserData();
    }
    setEditing(!editing);
  };

  const handleSaveProfile = async () => {
    // Validate inputs
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }
    
    if (password && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      // Update profile data
      const updatedProfileInfo = {
        ...user.profile_info,
        business_name: businessName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        description: description.trim(),
        logo: logoBase64,
        avatar: selectedAvatar,
      };
      
      // Update user data
      await updateUserData({
        profile_info: updatedProfileInfo,
      });
      
      // Handle password change if provided
      if (password) {
        // Password change logic would go here
        // This typically requires re-authentication or a separate API call
        Alert.alert('Note', 'Password changes require re-authentication and are not implemented in this demo.');
      }
      
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: () => logout(),
          style: 'destructive',
        },
      ]
    );
  };

  const selectBusinessLogo = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access camera roll is required');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setLogoBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleChangeAvatar = () => {
    setShowAvatarModal(true);
  };

  const handleSelectAvatar = (avatarKey) => {
    setSelectedAvatar(avatarKey);
    setShowAvatarModal(false);
  };

  const renderAvatarItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.avatarItem,
        selectedAvatar === item.value && styles.selectedAvatarItem
      ]}
      onPress={() => handleSelectAvatar(item.value)}
    >
      <Image 
        source={avatarImages[item.value]} 
        style={styles.avatarItemImage}
        resizeMode="contain"
      />
      <Text style={styles.avatarItemLabel}>{item.label}</Text>
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>Manage your business profile</Text>
            </View>
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
                <View style={styles.businessLogoWrapper}>
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
                </View>
                <TouchableOpacity 
                  style={styles.uploadLogoButton}
                  onPress={selectBusinessLogo}
                  activeOpacity={0.7}
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
          
          {/* Add spacing to ensure bottom button doesn't overlap content */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
      
      {/* Sign Out Button at the bottom of screen */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={styles.logoutButtonBottom}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: SIZES.PADDING_XL,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2),
  },
  headerText: {
    paddingHorizontal: SIZES.PADDING_S,
  },
  headerTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
  },
  headerSubtitle: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  profileCard: {
    margin: SIZES.PADDING_M,
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_L,
    padding: SIZES.PADDING_M,
    ...getShadowStyles(3),
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: SIZES.PADDING_M,
  },
  avatarImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: SIZES.RADIUS_ROUND,
    backgroundColor: '#f0f8ff',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4e9af1',
    width: SIZES.ICON_BUTTON / 1.5,
    height: SIZES.ICON_BUTTON / 1.5,
    borderRadius: SIZES.RADIUS_ROUND,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarEditBadgeText: {
    fontSize: SIZES.SMALL,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: SIZES.PADDING_M,
  },
  businessName: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_S,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_M,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: SIZES.SMALL,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_M,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.BODY,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editActionButton: {
    flex: 1,
    paddingVertical: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_M,
    alignItems: 'center',
    marginHorizontal: SIZES.PADDING_XS,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: SIZES.BODY,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.BODY,
  },
  statsContainer: {
    margin: SIZES.PADDING_M,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_M,
    paddingHorizontal: SIZES.PADDING_XS,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    alignItems: 'center',
    ...getShadowStyles(2),
  },
  statValue: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: SIZES.PADDING_XS,
  },
  statLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666',
  },
  editFormContainer: {
    margin: SIZES.PADDING_M,
    marginTop: 0,
  },
  formSectionTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: '600',
    color: '#333',
    marginTop: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
  },
  inputLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_XS,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    fontSize: SIZES.BODY,
    borderWidth: 1,
    borderColor: '#eee',
    minHeight: SIZES.BUTTON_HEIGHT,
  },
  textAreaInput: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_M,
  },
  businessLogoWrapper: {
    width: scale(80),
    height: scale(80),
    borderRadius: SIZES.RADIUS_M,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.PADDING_M,
  },
  businessLogoImage: {
    width: '100%',
    height: '100%',
  },
  placeholderLogo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderLogoText: {
    color: '#999',
    fontSize: SIZES.SMALL,
  },
  uploadLogoButton: {
    backgroundColor: '#4e9af1',
    paddingHorizontal: SIZES.PADDING_M,
    paddingVertical: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_M,
    flex: 1,
  },
  uploadLogoButtonText: {
    color: '#fff',
    fontSize: SIZES.BODY,
    fontWeight: '600',
    textAlign: 'center',
  },
  profileInfoContainer: {
    margin: SIZES.PADDING_M,
    marginTop: 0,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    ...getShadowStyles(2),
  },
  infoRow: {
    paddingVertical: SIZES.PADDING_S,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_XS,
  },
  infoValue: {
    fontSize: SIZES.BODY,
    color: '#333',
  },
  businessLogoContainer: {
    marginTop: SIZES.PADDING_XS,
  },
  businessLogoThumb: {
    width: scale(60),
    height: scale(60),
    borderRadius: SIZES.RADIUS_S,
  },
  bottomSpacer: {
    height: SIZES.BUTTON_HEIGHT + SIZES.PADDING_L * 2,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    ...getShadowStyles(5),
  },
  logoutButtonBottom: {
    backgroundColor: '#ff5252',
    paddingVertical: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SIZES.BODY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_M,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_L,
    width: '90%',
    maxWidth: 400,
    padding: SIZES.PADDING_L,
    ...getShadowStyles(5),
  },
  modalTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_M,
    textAlign: 'center',
  },
  avatarGrid: {
    padding: SIZES.PADDING_XS,
  },
  avatarItem: {
    width: '33%',
    padding: SIZES.PADDING_XS,
    alignItems: 'center',
  },
  selectedAvatarItem: {
    backgroundColor: '#f0f8ff',
    borderRadius: SIZES.RADIUS_M,
  },
  avatarItemImage: {
    width: scale(50),
    height: scale(50),
    marginBottom: SIZES.PADDING_XS,
  },
  avatarItemLabel: {
    fontSize: SIZES.SMALL,
    color: '#666',
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_M,
    alignItems: 'center',
    marginTop: SIZES.PADDING_M,
  },
  closeModalButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: SIZES.BODY,
  },
});

export default ProfileScreen;
