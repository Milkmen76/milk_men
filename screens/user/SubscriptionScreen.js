import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  Animated,
  Image,
  Dimensions,
  FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const subscriptionTypes = [
  { 
    value: 'daily', 
    label: 'Daily Delivery', 
    description: 'Fresh milk delivered every day',
    icon: '🌞',
    price: 45.99 
  },
  { 
    value: 'weekly', 
    label: 'Weekly Delivery', 
    description: 'Delivery once a week on your preferred day',
    icon: '📅',
    price: 22.99 
  },
  { 
    value: 'monthly', 
    label: 'Monthly Package', 
    description: 'Monthly subscription with bulk discount',
    icon: '📦',
    price: 89.99 
  },
];

const timeSlots = [
  { id: 'morning', label: 'Morning', time: '6:00 AM - 9:00 AM', icon: '🌅' },
  { id: 'midday', label: 'Afternoon', time: '12:00 PM - 2:00 PM', icon: '☀️' },
  { id: 'evening', label: 'Evening', time: '5:00 PM - 8:00 PM', icon: '🌇' }
];

const daysOfWeek = [
  { id: 0, name: 'Sunday', shortName: 'Sun' },
  { id: 1, name: 'Monday', shortName: 'Mon' },
  { id: 2, name: 'Tuesday', shortName: 'Tue' },
  { id: 3, name: 'Wednesday', shortName: 'Wed' },
  { id: 4, name: 'Thursday', shortName: 'Thu' },
  { id: 5, name: 'Friday', shortName: 'Fri' },
  { id: 6, name: 'Saturday', shortName: 'Sat' },
];

// Get vendor image from base64 or default
const getVendorImage = (vendor) => {
  if (vendor?.profile_info?.logo_base64) {
    return { uri: `data:image/jpeg;base64,${vendor.profile_info.logo_base64}` };
  }
  return require('../../assets/milk-icon.png');
};

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { vendorId } = route.params || {};
  
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('weekly');
  const [startDate, setStartDate] = useState(getTomorrowDate());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(timeSlots[0].id);
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [calendarDates, setCalendarDates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [processingSubscription, setProcessingSubscription] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch vendor info
        const vendorData = await localData.getUserById(vendorId);
        setVendor(vendorData);
        
        // Fetch vendor's products
        const vendorProducts = await localData.getProductsByVendor(vendorId);
        setProducts(vendorProducts);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (vendorId) {
      fetchData();
    } else {
      setLoading(false);
    }
    
    // Initialize calendar
    generateCalendarDates(startDate);
  }, [vendorId]);
  
  // Function to get tomorrow's date
  function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  // Generate 30 days for the calendar
  const generateCalendarDates = (baseDate) => {
    const dates = [];
    const month = baseDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    setCalendarMonth(month);
    
    // Start from tomorrow
    const firstDay = new Date(baseDate);
    
    // Generate next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() + i);
      
      dates.push({
        date: date,
        dayOfWeek: date.getDay(),
        dayOfMonth: date.getDate(),
        fullDate: date.toISOString(),
        isToday: date.toDateString() === new Date().toDateString(),
        isSelected: date.toDateString() === startDate.toDateString()
      });
    }
    
    setCalendarDates(dates);
  };

  // Calculate end date based on subscription type
  const calculateEndDate = (type, start) => {
    const endDate = new Date(start);
    
    switch (type) {
      case 'daily':
        // 30 days subscription for daily
        endDate.setDate(endDate.getDate() + 30);
        break;
      case 'weekly':
        // 8 weeks subscription
        endDate.setDate(endDate.getDate() + 56);
        break;
      case 'monthly':
        // 3 months subscription
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      default:
        // Default to 1 month
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to subscribe');
      return;
    }
    
    setProcessingSubscription(true);
    
    try {
      const endDate = calculateEndDate(selectedType, startDate);
      
      // Get the time slot string value
      const timeSlot = timeSlots.find(slot => slot.id === selectedTimeSlot)?.value || timeSlots[0].value;
      
      // Create subscription in local storage
      const subscriptionData = {
        user_id: user.id,
        vendor_id: vendorId,
        type: selectedType,
        status: 'active',
        frequency: selectedType,
        delivery_time: timeSlot,
        preferred_day: selectedType === 'weekly' ? daysOfWeek[selectedDay].name : 'Daily',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        created_at: new Date().toISOString()
      };
      
      const newSubscription = await localData.addSubscription(subscriptionData);
      
      if (!newSubscription) {
        throw new Error('Failed to create subscription');
      }
      
      // Create a transaction for the subscription
      const price = calculateSubscriptionPrice(selectedType);
      const transactionData = {
        user_id: user.id,
        vendor_id: vendorId,
        type: 'subscription',
        amount: price,
        status: 'completed',
        reference_id: newSubscription.subscription_id,
        date: new Date().toISOString()
      };
      
      const newTransaction = await localData.addTransaction(transactionData);
      
      if (!newTransaction) {
        throw new Error('Failed to record transaction');
      }
      
      // Show success message
      Alert.alert(
        'Subscription Created Successfully',
        `Your ${selectedType} subscription has been activated and will start on ${formatDate(startDate)} with delivery during ${timeSlots.find(slot => slot.id === selectedTimeSlot)?.label} hours.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate back to home screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserHome' }]
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating subscription:', error);
      Alert.alert('Error', 'Failed to create subscription. Please try again.');
    } finally {
      setProcessingSubscription(false);
    }
  };

  const calculateSubscriptionPrice = (type) => {
    const option = subscriptionTypes.find(t => t.value === type);
    return option ? option.price : 0;
  };

  const handleDateSelect = (date) => {
    setStartDate(new Date(date.fullDate));
    setShowCalendar(false);
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const renderDeliveryOptions = () => {
    if (selectedType === 'weekly') {
      return (
        <View style={styles.daySelector}>
          <Text style={styles.daySelectorTitle}>Preferred Day of Week</Text>
          <View style={styles.dayOptions}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayOption,
                  selectedDay === day.id && styles.selectedDayOption
                ]}
                onPress={() => setSelectedDay(day.id)}
              >
                <Text 
                  style={[
                    styles.dayText,
                    selectedDay === day.id && styles.selectedDayText
                  ]}
                >
                  {day.shortName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    return null;
  };
  
  const renderCalendarItem = ({ item }) => {
    const isSelected = item.date.toDateString() === startDate.toDateString();
    
    return (
      <TouchableOpacity
        style={[
          styles.calendarDay,
          isSelected && styles.selectedCalendarDay
        ]}
        onPress={() => handleDateSelect(item)}
      >
        <Text style={[styles.dayOfWeekText, isSelected && styles.selectedDayText]}>
          {daysOfWeek[item.dayOfWeek].shortName}
        </Text>
        <Text style={[styles.dayOfMonthText, isSelected && styles.selectedDayText]}>
          {item.dayOfMonth}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {vendor && (
            <View style={styles.vendorCard}>
              <Image 
                source={getVendorImage(vendor)} 
                style={styles.vendorImage} 
                resizeMode="cover"
              />
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>
                  {vendor.profile_info?.business_name || 'Vendor'}
                </Text>
                <Text style={styles.vendorAddress}>
                  {vendor.profile_info?.address || 'No address provided'}
                </Text>
                <View style={styles.vendorBadge}>
                  <Text style={styles.vendorBadgeText}>Premium Vendor</Text>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Subscription Plan</Text>
            
            {subscriptionTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.subscriptionOption,
                  selectedType === type.value && styles.selectedOption
                ]}
                onPress={() => setSelectedType(type.value)}
              >
                <View style={styles.optionIconContainer}>
                  <Text style={styles.optionIcon}>{type.icon}</Text>
                </View>
                <View style={styles.optionContent}>
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionLabel}>{type.label}</Text>
                    <Text style={styles.optionPrice}>
                      ₹{type.price}
                    </Text>
                  </View>
                  <Text style={styles.optionDescription}>{type.description}</Text>
                </View>
                <View style={[styles.radioButton, selectedType === type.value && styles.radioButtonSelected]}>
                  {selectedType === type.value && <View style={styles.radioButtonInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Schedule</Text>
            
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowCalendar(true)}
            >
              <View style={styles.calendarIcon}>
                <Text style={styles.calendarIconText}>📅</Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Starting Date</Text>
                <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
              </View>
              <Text style={styles.chevronRight}>›</Text>
            </TouchableOpacity>
            
            {renderDeliveryOptions()}
            
            <View style={styles.timeSection}>
              <Text style={styles.timeSectionTitle}>Preferred Delivery Time</Text>
              
              <View style={styles.timeOptions}>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeOption,
                      selectedTimeSlot === slot.id && styles.selectedTimeOption
                    ]}
                    onPress={() => setSelectedTimeSlot(slot.id)}
                  >
                    <Text style={styles.timeIcon}>{slot.icon}</Text>
                    <View style={styles.timeInfo}>
                      <Text 
                        style={[
                          styles.timeLabel,
                          selectedTimeSlot === slot.id && styles.selectedTimeLabel
                        ]}
                      >
                        {slot.label}
                      </Text>
                      <Text 
                        style={[
                          styles.timeValue,
                          selectedTimeSlot === slot.id && styles.selectedTimeValue
                        ]}
                      >
                        {slot.time}
                      </Text>
                    </View>
                    <View style={[
                      styles.timeRadioButton, 
                      selectedTimeSlot === slot.id && styles.timeRadioButtonSelected
                    ]}>
                      {selectedTimeSlot === slot.id && <View style={styles.timeRadioButtonInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription Summary</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subscription Type</Text>
                <Text style={styles.summaryValue}>
                  {subscriptionTypes.find(t => t.value === selectedType)?.label}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Start Date</Text>
                <Text style={styles.summaryValue}>{formatDate(startDate)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>End Date</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(calculateEndDate(selectedType, startDate))}
                </Text>
              </View>
              
              {selectedType === 'weekly' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Day</Text>
                  <Text style={styles.summaryValue}>
                    {daysOfWeek[selectedDay].name}
                  </Text>
                </View>
              )}
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Time</Text>
                <Text style={styles.summaryValue}>
                  {timeSlots.find(slot => slot.id === selectedTimeSlot)?.time}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>
                  ₹{calculateSubscriptionPrice(selectedType)}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={processingSubscription}
          >
            {processingSubscription ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      </Animated.View>
      
      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.calendarMonth}>{calendarMonth}</Text>
            
            <FlatList
              data={calendarDates}
              renderItem={renderCalendarItem}
              keyExtractor={(item) => item.fullDate}
              horizontal={false}
              numColumns={7}
              contentContainerStyle={styles.calendarGrid}
            />
            
            <TouchableOpacity
              style={styles.confirmDateButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.confirmDateButtonText}>Confirm Date</Text>
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
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  vendorCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
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
  vendorImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    backgroundColor: '#f0f8ff',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  vendorAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  vendorBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  vendorBadgeText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  subscriptionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  selectedOption: {
    borderColor: '#4e9af1',
    backgroundColor: '#e3f2fd'
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4e9af1'
  },
  optionDescription: {
    fontSize: 14,
    color: '#666'
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioButtonSelected: {
    borderColor: '#4e9af1',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4e9af1',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  calendarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  calendarIconText: {
    fontSize: 20,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  chevronRight: {
    fontSize: 24,
    color: '#999',
  },
  daySelector: {
    marginBottom: 16,
  },
  daySelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  dayOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayOption: {
    backgroundColor: '#4e9af1',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeSection: {
    marginBottom: 8,
  },
  timeSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  timeOptions: {
    marginBottom: 8,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  selectedTimeOption: {
    borderColor: '#4e9af1',
    backgroundColor: '#e3f2fd'
  },
  timeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 14,
    color: '#666',
  },
  selectedTimeLabel: {
    color: '#4e9af1',
    fontWeight: 'bold',
  },
  selectedTimeValue: {
    color: '#4e9af1',
  },
  timeRadioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRadioButtonSelected: {
    borderColor: '#4e9af1',
  },
  timeRadioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4e9af1',
  },
  summaryCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666'
  },
  summaryValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500'
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4e9af1'
  },
  subscribeButton: {
    backgroundColor: '#4e9af1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  bottomPadding: {
    height: 40,
  },
  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    padding: 16,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
    padding: 4,
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4e9af1',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarGrid: {
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  calendarDay: {
    width: (width - 72) / 7,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 8,
  },
  selectedCalendarDay: {
    backgroundColor: '#4e9af1',
  },
  dayOfWeekText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayOfMonthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmDateButton: {
    backgroundColor: '#4e9af1',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmDateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SubscriptionScreen;
