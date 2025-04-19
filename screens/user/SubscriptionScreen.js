import React, { useState, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as localData from '../../services/localData';
import { useAuth } from '../../contexts/AuthContext';

const subscriptionTypes = [
  { value: 'daily', label: 'Daily Delivery', description: 'Fresh milk delivered every day' },
  { value: 'weekly', label: 'Weekly Delivery', description: 'Delivery once a week on your preferred day' },
  { value: 'monthly', label: 'Monthly Package', description: 'Monthly subscription with bulk discount' },
];

const timeSlots = [
  { id: 'morning', label: 'Morning (6AM - 9AM)', value: '06:00-09:00' },
  { id: 'midday', label: 'Mid-day (11AM - 2PM)', value: '11:00-14:00' },
  { id: 'evening', label: 'Evening (5PM - 8PM)', value: '17:00-20:00' }
];

const daysOfWeek = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { vendorId } = route.params || {};
  
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('weekly');
  const [startDate, setStartDate] = useState(new Date());
  // Add 1 day to start date to ensure it's in the future
  startDate.setDate(startDate.getDate() + 1);
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(timeSlots[0].id);
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [processingSubscription, setProcessingSubscription] = useState(false);

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
  }, [vendorId]);

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
        `Your ${selectedType} subscription has been activated and will start on ${startDate.toDateString()} with delivery during ${timeSlots.find(slot => slot.id === selectedTimeSlot)?.label}.`,
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
    // Simple pricing logic - in a real app, this would be more sophisticated
    switch (type) {
      case 'daily':
        return 45.99;
      case 'weekly':
        return 22.99;
      case 'monthly':
        return 89.99;
      default:
        return 0;
    }
  };

  const handleStartDateChange = (date) => {
    setStartDate(date);
    setShowDatePicker(false);
  };

  const adjustDate = (days) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    setStartDate(newDate);
  };

  const renderDeliveryOptions = () => {
    if (selectedType === 'weekly') {
      return (
        <View style={styles.deliverySelection}>
          <Text style={styles.deliveryLabel}>Preferred Day of Week:</Text>
          <View style={styles.daySelector}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayOption,
                  selectedDay === day.id && styles.selectedDayOption
                ]}
                onPress={() => setSelectedDay(day.id)}
              >
                <Text style={[
                  styles.dayText,
                  selectedDay === day.id && styles.selectedDayText
                ]}>
                  {day.name.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    return null;
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
      <ScrollView style={styles.container}>
        {vendor && (
          <View style={styles.vendorCard}>
            <Text style={styles.vendorName}>
              {vendor.profile_info?.business_name || 'Vendor'}
            </Text>
            <Text style={styles.vendorAddress}>
              {vendor.profile_info?.address || 'No address provided'}
            </Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Subscription Type</Text>
          
          {subscriptionTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.subscriptionOption,
                selectedType === type.value && styles.selectedOption
              ]}
              onPress={() => setSelectedType(type.value)}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionLabel}>{type.label}</Text>
                <Text style={styles.optionPrice}>
                  ₹{calculateSubscriptionPrice(type.value)}
                </Text>
              </View>
              <Text style={styles.optionDescription}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Schedule</Text>
          
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Start Date:</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => adjustDate(-1)}
              >
                <Text style={styles.dateButtonText}>-</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dateDisplay}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{startDate.toDateString()}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => adjustDate(1)}
              >
                <Text style={styles.dateButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {renderDeliveryOptions()}
          
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Preferred Delivery Time:</Text>
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
                  <Text style={[
                    styles.timeText,
                    selectedTimeSlot === slot.id && styles.selectedTimeText
                  ]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subscription</Text>
            <Text style={styles.summaryValue}>
              {subscriptionTypes.find(t => t.value === selectedType)?.label}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Start Date</Text>
            <Text style={styles.summaryValue}>{startDate.toDateString()}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>End Date</Text>
            <Text style={styles.summaryValue}>
              {calculateEndDate(selectedType, startDate).toDateString()}
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
              {timeSlots.find(slot => slot.id === selectedTimeSlot)?.label}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  vendorCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
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
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  vendorAddress: {
    fontSize: 14,
    color: '#666'
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  subscriptionOption: {
    backgroundColor: '#f5f7fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  selectedOption: {
    borderColor: '#4e9af1',
    backgroundColor: '#f0f8ff'
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
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
  dateSection: {
    marginBottom: 16
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dateButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  dateDisplay: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 10,
    alignItems: 'center'
  },
  dateText: {
    fontSize: 16,
    color: '#333'
  },
  deliverySelection: {
    marginBottom: 16
  },
  deliveryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  dayOption: {
    width: '13.5%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginBottom: 8
  },
  selectedDayOption: {
    backgroundColor: '#4e9af1'
  },
  dayText: {
    fontSize: 12,
    color: '#333'
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  timeSection: {
    marginBottom: 16
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8
  },
  timeOptions: {
    flexDirection: 'column'
  },
  timeOption: {
    backgroundColor: '#f5f7fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  selectedTimeOption: {
    borderColor: '#4e9af1',
    backgroundColor: '#f0f8ff'
  },
  timeText: {
    fontSize: 14,
    color: '#333'
  },
  selectedTimeText: {
    fontWeight: 'bold',
    color: '#4e9af1'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
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
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
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
  }
});

export default SubscriptionScreen;
