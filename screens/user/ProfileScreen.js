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

// Import responsive utility functions
import { scale, verticalScale, moderateScale, fontScale, SIZES, getShadowStyles } from '../../utils/responsive';

// Avatar image mapping
const avatarImages = {
  'milk-icon.png': require('../../assets/milk-icon.png'),
  'icon.png': require('../../assets/icon.png'),
  'splash-icon.png': require('../../assets/splash-icon.png'),
  'adaptive-icon.png': require('../../assets/adaptive-icon.png'),
  'favicon.png': require('../../assets/favicon.png'),
};

const ProfileScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user, logout, updateUserData } = useAuth();
  const focusOnAddress = route.params?.focusOnAddress;
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'settings'
  
  // Address input ref to focus on it when requested
  const addressInputRef = React.useRef(null);
  
  // Avatar selection state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('milk-icon.png');
  const [availableAvatars, setAvailableAvatars] = useState([]);
  
  // Check if we should focus on address
  useEffect(() => {
    if (focusOnAddress && !editing) {
      setEditing(true);
      // We'll focus on the address input after render
      setTimeout(() => {
        if (addressInputRef.current) {
          addressInputRef.current.focus();
        }
      }, 300);
    }
  }, [focusOnAddress]);

  // Load user data when component mounts
  useEffect(() => {
    loadUserData();
    
    // Load available avatars
    setAvailableAvatars(localData.getAvailableAvatars());
  }, [user]);

  const loadUserData = async () => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.profile_info?.phone || '');
      setAddress(user.profile_info?.address || '');
      setSelectedAvatar(user.profile_info?.avatar || 'milk-icon.png');
      
      // Load order and subscription counts
      try {
        const userOrders = await localData.getOrdersByUser(user.id);
        setOrderCount(userOrders.length);
        
        const userSubscriptions = await localData.getSubscriptionsByUser(user.id);
        setSubscriptionCount(userSubscriptions.length);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
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
      // Cancel editing - reset fields to original values
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.profile_info?.phone || '');
      setAddress(user.profile_info?.address || '');
      setPassword('');
      setConfirmPassword('');
    }
    setEditing(!editing);
  };
  
  const handleSaveProfile = async () => {
    // Validate inputs
    if (!name) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    if (password && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare update data
      const updateData = { 
        name,
        profile_info: {
          ...(user.profile_info || {}),
          phone,
          address,
          avatar: selectedAvatar
        }
      };
      
      // Only update password if provided
      if (password) {
        updateData.password = password;
      }
      
      // Update user data
      const result = await updateUserData(updateData);
      
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditing(false);
        setPassword('');
        setConfirmPassword('');
        
        // If we came from address edit, navigate back to refresh home screen
        if (focusOnAddress) {
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
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

  const navigateToOrders = () => {
    navigation.navigate('HistoryScreen');
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
  
  const renderProfileContent = () => (
    <>
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>{editing ? 'Edit Information' : 'Personal Information'}</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
          ) : (
            <Text style={styles.infoText}>{user?.name || 'Not provided'}</Text>
          )}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
            />
          ) : (
            <Text style={styles.infoText}>{user?.email || 'Not provided'}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Your phone number"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.infoText}>{user?.profile_info?.phone || 'Not provided'}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Delivery Address</Text>
          {editing ? (
            <TextInput
              ref={addressInputRef}
              style={[styles.input, styles.textAreaInput]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your delivery address"
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.infoText}>{user?.profile_info?.address || 'Not provided'}</Text>
          )}
        </View>
        
        {editing && (
          <>
            <Text style={[styles.sectionTitle, {marginTop: SIZES.PADDING_L}]}>Change Password</Text>
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
      
    </>
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
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
          
          <Text style={styles.headerTitle}>{editing ? 'Edit Profile' : user?.name || 'My Profile'}</Text>
          {!editing && <Text style={styles.roleLabel}>{user?.role?.toUpperCase() || 'USER'}</Text>}
        </View>

        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={navigateToOrders}>
            <Text style={styles.statNumber}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statCard} onPress={navigateToOrders}>
            <Text style={styles.statNumber}>{subscriptionCount}</Text>
            <Text style={styles.statLabel}>Subscriptions</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'profile' && styles.activeTabButton]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'profile' && styles.activeTabText]}>
              Profile
            </Text>
          </TouchableOpacity>
          
        </View>
        
        {activeTab === 'profile' ? renderProfileContent() : renderSettingsContent()}
        
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
              {activeTab === 'profile' && (
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={handleEditToggle}
                >
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              )}
              
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
            <Text style={styles.modalTitle}>Select Avatar</Text>
            
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
    fontSize: SIZES.BODY,
    color: '#666'
  },
  header: {
    alignItems: 'center',
    paddingVertical: SIZES.PADDING_L,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    ...getShadowStyles(2)
  },
  avatarContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.PADDING_S,
    ...getShadowStyles(2),
  },
  avatar: {
    width: scale(60),
    height: scale(60)
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#4e9af1',
    borderRadius: SIZES.RADIUS_ROUND,
    width: scale(30),
    height: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
    ...getShadowStyles(2),
  },
  editAvatarText: {
    color: '#fff',
    fontSize: SIZES.SMALL,
    fontWeight: 'bold'
  },
  headerTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SIZES.PADDING_XS
  },
  roleLabel: {
    fontSize: SIZES.SMALL,
    color: '#4e9af1',
    fontWeight: '600',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: SIZES.PADDING_S,
    paddingVertical: SIZES.PADDING_XS,
    borderRadius: SIZES.RADIUS_ROUND
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SIZES.PADDING_M,
    marginTop: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_S
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_M,
    marginHorizontal: SIZES.PADDING_XS,
    alignItems: 'center',
    ...getShadowStyles(2),
  },
  statNumber: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: SIZES.PADDING_XS
  },
  statLabel: {
    fontSize: SIZES.CAPTION,
    color: '#666'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    ...getShadowStyles(1),
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
  tabButtonText: {
    fontSize: SIZES.BODY,
    fontWeight: '500',
    color: '#666'
  },
  activeTabText: {
    color: '#4e9af1'
  },
  sectionTitle: {
    fontSize: SIZES.SUBTITLE,
    fontWeight: '600',
    color: '#333',
    marginBottom: SIZES.PADDING_M,
    marginLeft: SIZES.PADDING_XS
  },
  formContainer: {
    padding: SIZES.PADDING_M
  },
  formGroup: {
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    marginBottom: SIZES.PADDING_S,
    ...getShadowStyles(1),
  },
  label: {
    fontSize: SIZES.CAPTION,
    color: '#666',
    marginBottom: SIZES.PADDING_XS
  },
  infoText: {
    fontSize: SIZES.BODY,
    color: '#333'
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: SIZES.RADIUS_S,
    padding: SIZES.PADDING_S,
    fontSize: SIZES.BODY,
    backgroundColor: '#f8f8f8'
  },
  textAreaInput: {
    height: verticalScale(100),
    textAlignVertical: 'top'
  },
  quickLinks: {
    padding: SIZES.PADDING_M
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    marginBottom: SIZES.PADDING_S,
    ...getShadowStyles(1),
  },
  linkText: {
    fontSize: SIZES.BODY,
    color: '#333'
  },
  linkArrow: {
    fontSize: SIZES.TITLE,
    color: '#999'
  },
  // Settings tab styles
  settingsContainer: {
    padding: SIZES.PADDING_M
  },
  settingGroup: {
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    marginBottom: SIZES.PADDING_S,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...getShadowStyles(1),
  },
  settingLabel: {
    fontSize: SIZES.BODY,
    color: '#333',
    fontWeight: '500'
  },
  settingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: SIZES.RADIUS_ROUND,
    overflow: 'hidden'
  },
  toggleOption: {
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    minWidth: scale(50),
    alignItems: 'center'
  },
  activeToggle: {
    backgroundColor: '#4e9af1'
  },
  toggleText: {
    fontSize: SIZES.CAPTION,
    fontWeight: '500',
    color: '#666'
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: SIZES.PADDING_XS,
    paddingHorizontal: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S
  },
  languageText: {
    fontSize: SIZES.BODY,
    color: '#333',
    marginRight: SIZES.PADDING_S
  },
  dropdownArrow: {
    fontSize: SIZES.CAPTION,
    color: '#999'
  },
  aboutItem: {
    backgroundColor: '#fff',
    padding: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_M,
    marginBottom: SIZES.PADDING_S,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...getShadowStyles(1),
  },
  aboutText: {
    fontSize: SIZES.BODY,
    color: '#333'
  },
  aboutArrow: {
    fontSize: SIZES.SUBTITLE,
    color: '#999'
  },
  versionText: {
    fontSize: SIZES.CAPTION,
    color: '#999'
  },
  actionsContainer: {
    padding: SIZES.PADDING_M,
    marginBottom: SIZES.PADDING_XL
  },
  editButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    alignItems: 'center',
    marginBottom: SIZES.PADDING_S,
    ...getShadowStyles(2),
  },
  editButtonText: {
    color: '#fff',
    fontSize: SIZES.BODY,
    fontWeight: 'bold'
  },
  logoutButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontSize: SIZES.BODY,
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    alignItems: 'center',
    marginBottom: SIZES.PADDING_S,
    ...getShadowStyles(2),
  },
  saveButtonText: {
    color: '#fff',
    fontSize: SIZES.BODY,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: SIZES.PADDING_M,
    borderRadius: SIZES.RADIUS_S,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: SIZES.BODY,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.PADDING_L
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: SIZES.RADIUS_M,
    padding: SIZES.PADDING_L,
    width: '90%',
    maxHeight: '70%',
    ...getShadowStyles(4),
  },
  modalTitle: {
    fontSize: SIZES.TITLE,
    fontWeight: 'bold',
    marginBottom: SIZES.PADDING_L,
    textAlign: 'center',
    color: '#333'
  },
  avatarGrid: {
    paddingVertical: SIZES.PADDING_S
  },
  avatarOption: {
    flex: 1,
    margin: SIZES.PADDING_S,
    alignItems: 'center',
    padding: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8'
  },
  selectedAvatarOption: {
    borderColor: '#4e9af1',
    backgroundColor: '#e6f2ff'
  },
  avatarOptionImage: {
    width: scale(60),
    height: scale(60),
    marginBottom: SIZES.PADDING_S
  },
  avatarOptionText: {
    fontSize: SIZES.SMALL,
    color: '#666',
    textAlign: 'center'
  },
  closeButton: {
    marginTop: SIZES.PADDING_M,
    backgroundColor: '#f8f8f8',
    padding: SIZES.PADDING_S,
    borderRadius: SIZES.RADIUS_S,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  closeButtonText: {
    fontSize: SIZES.BODY,
    color: '#666'
  },
});

export default ProfileScreen;
