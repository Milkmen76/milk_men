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
              onPress={() => navigation.navigate('HistoryScreen')}
            >
              <Text style={styles.linkText}>Order History</Text>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => navigation.navigate('VendorList')}
            >
              <Text style={styles.linkText}>Milk Vendors</Text>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => Alert.alert('Help', 'Contact customer support at support@milkapp.com')}
            >
              <Text style={styles.linkText}>Help & Support</Text>
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
    backgroundColor: '#f9f9f9'
  },
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
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
  avatar: {
    width: 60,
    height: 60
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#4e9af1',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  roleLabel: {
    fontSize: 12,
    color: '#4e9af1',
    fontWeight: '600',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 5,
    alignItems: 'center',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4e9af1',
    marginBottom: 4
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
    padding: 16
  },
  formGroup: {
    backgroundColor: '#fff',
    padding: 16,
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
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8'
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top'
  },
  quickLinks: {
    padding: 16
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
    padding: 16,
    marginBottom: 30
  },
  editButton: {
    backgroundColor: '#4e9af1',
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
  logoutButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '500'
  },
  saveButton: {
    backgroundColor: '#4e9af1',
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
    borderColor: '#4e9af1',
    backgroundColor: '#e6f2ff'
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
  },
});

export default ProfileScreen;
