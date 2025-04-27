import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';
import * as ImagePicker from 'expo-image-picker';
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

const { width } = Dimensions.get('window');

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
  const [customAvatar, setCustomAvatar] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'business'
  const [fadeAnim] = useState(new Animated.Value(1));
  
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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    });
  }, [activeTab]);

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
      setLogoBase64(profileInfo.logo_base64 || '');
      setSelectedAvatar(profileInfo.avatar || 'milk-icon.png');
      setCustomAvatar(profileInfo.custom_avatar_base64 || null);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessStats = async () => {
    if (!user || !user.id) return;
    
    try {
      // Load orders
      const allOrders = await localData.getOrdersByVendor(user.id);
      
      // Load products
      const vendorProducts = await localData.getProductsByVendor(user.id);
      
      // Calculate unique customers
      const uniqueCustomers = [...new Set(allOrders.map(order => order.user_id))];
      
      // Calculate total revenue
      let totalRevenue = 0;
      allOrders.forEach(order => {
        if (order.total) {
          totalRevenue += parseFloat(order.total);
        }
      });
      
      setBusinessStats({
        orders: allOrders.length,
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
        logo_base64: logoBase64,
        avatar: selectedAvatar,
        custom_avatar_base64: customAvatar,
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

  const pickImage = async (forLogo = false) => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access camera roll is required');
        return;
      }
      
      // Fix the ImagePicker configuration - the problem was with mediaTypes format
      const result = await ImagePicker.launchImageLibraryAsync({
        // For older Expo versions, use an array of strings or undefined
        // For newer versions, use the enum directly
        // Try both approaches to handle different Expo versions
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        if (forLogo) {
          setLogoBase64(result.assets[0].base64);
          setShowLogoModal(false);
        } else {
          setCustomAvatar(result.assets[0].base64);
          setShowAvatarModal(false);
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleChangeAvatar = () => {
    setShowAvatarModal(true);
  };

  const handleChangeLogo = () => {
    setShowLogoModal(true);
  };

  const handleSelectAvatar = (avatarKey) => {
    setSelectedAvatar(avatarKey);
    setCustomAvatar(null);
    setShowAvatarModal(false);
  };

  const renderAvatarItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.avatarItem,
        selectedAvatar === item.value && !customAvatar && styles.selectedAvatarItem
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

  const getAvatarSource = () => {
    if (customAvatar) {
      return { uri: `data:image/jpeg;base64,${customAvatar}` };
    }
    return avatarImages[selectedAvatar] || avatarImages['milk-icon.png'];
  };

  const getBusinessLogoSource = () => {
    if (logoBase64) {
      return { uri: `data:image/jpeg;base64,${logoBase64}` };
    }
    return null;
  };

  const renderProfileTabContent = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Account Information</Text>
      
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email || 'Not set'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          {editing ? (
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.infoValue}>{phone || 'Not set'}</Text>
          )}
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          {editing ? (
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter business address"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.infoValue}>{address || 'Not set'}</Text>
          )}
        </View>
      </View>
      
      {editing && (
        <View style={styles.passwordSection}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderBusinessTabContent = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Business Information</Text>
      
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Business Name</Text>
          {editing ? (
            <TextInput
              style={styles.textInput}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Enter business name"
            />
          ) : (
            <Text style={styles.infoValue}>{businessName || 'Not set'}</Text>
          )}
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Description</Text>
          {editing ? (
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your business"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.infoValue}>{description || 'Not set'}</Text>
          )}
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Business Logo</Text>
          <View style={styles.logoContainer}>
            {logoBase64 ? (
              <Image 
                source={getBusinessLogoSource()}
                style={styles.businessLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderLogo}>
                <Text style={styles.placeholderLogoText}>Logo</Text>
              </View>
            )}
            
            {editing && (
              <TouchableOpacity 
                style={styles.changeLogoButton}
                onPress={handleChangeLogo}
              >
                <Text style={styles.changeLogoText}>Change Logo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Business Statistics</Text>
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
  );

  if (loading && !editing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4e9af1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={!editing ? handleChangeAvatar : null}
              disabled={editing}
            >
              <Image
                source={getAvatarSource()}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              {!editing && (
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditBadgeText}>✏️</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.businessNameHeader}>{businessName || 'Your Business'}</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {user?.approval_status === 'approved' ? 'Approved' : 'Pending Approval'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'profile' && styles.activeTabButton]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'profile' && styles.activeTabButtonText]}>
              Profile
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'business' && styles.activeTabButton]}
            onPress={() => setActiveTab('business')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'business' && styles.activeTabButtonText]}>
              Business
            </Text>
          </TouchableOpacity>
        </View>
        
        <Animated.View style={{ opacity: fadeAnim }}>
          {activeTab === 'profile' ? renderProfileTabContent() : renderBusinessTabContent()}
        </Animated.View>
        
        <View style={styles.actionsContainer}>
          {editing ? (
            <>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleEditToggle}
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
            <Text style={styles.modalTitle}>Change Profile Picture</Text>
            
            <TouchableOpacity 
              style={styles.photoPickerButton}
              onPress={() => {
                setShowAvatarModal(false);
                setTimeout(() => pickImage(false), 500);
              }}
            >
              <View style={styles.photoIconContainer}>
                <Text style={styles.photoIcon}>📷</Text>
              </View>
              <View style={styles.photoTextContainer}>
                <Text style={styles.photoOptionTitle}>Upload Photo</Text>
                <Text style={styles.photoOptionDesc}>Choose an image from your gallery</Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.avatarSectionTitle}>Or Select an Avatar</Text>
            
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
      
      {/* Logo Selection Modal */}
      <Modal
        visible={showLogoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLogoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Business Logo</Text>
            
            <TouchableOpacity 
              style={styles.photoPickerButton}
              onPress={() => {
                setShowLogoModal(false);
                setTimeout(() => pickImage(true), 500);
              }}
            >
              <View style={styles.photoIconContainer}>
                <Text style={styles.photoIcon}>📷</Text>
              </View>
              <View style={styles.photoTextContainer}>
                <Text style={styles.photoOptionTitle}>Upload Logo</Text>
                <Text style={styles.photoOptionDesc}>Choose an image from your gallery</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowLogoModal(false)}
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
    backgroundColor: '#f9f9f9',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
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
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    marginRight: 16,
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
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4e9af1',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarEditBadgeText: {
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
  },
  businessNameHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
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
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4e9af1',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#4e9af1',
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
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
  infoRow: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  passwordSection: {
    marginTop: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessLogo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  },
  placeholderLogo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLogoText: {
    color: '#999',
    fontSize: 14,
  },
  changeLogoButton: {
    marginLeft: 16,
    backgroundColor: '#4e9af1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  changeLogoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
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
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    padding: 16,
    marginTop: 8,
  },
  editButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
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
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logoutButtonText: {
    color: '#ff5252',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
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
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  photoPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4e9af1',
  },
  photoIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4e9af1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  photoIcon: {
    fontSize: 24,
  },
  photoTextContainer: {
    flex: 1,
  },
  photoOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  photoOptionDesc: {
    fontSize: 14,
    color: '#666',
  },
  avatarSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  avatarGrid: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  avatarItem: {
    width: '30%',
    margin: '1.5%',
    padding: 8,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  selectedAvatarItem: {
    borderColor: '#4e9af1',
    backgroundColor: '#e6f2ff',
  },
  avatarItemImage: {
    width: 50,
    height: 50,
    marginBottom: 8,
  },
  avatarItemLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
