import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, Toast } from 'react-native';
import axios from 'axios';

const [isVacationModalVisible, setIsVacationModalVisible] = useState(false);
const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);
const [vacationDays, setVacationDays] = useState('7');

const renderVacationModal = () => {
  return (
    <Modal
      isVisible={isVacationModalVisible}
      backdropOpacity={0.5}
      onBackdropPress={() => setIsVacationModalVisible(false)}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Set Vacation Mode</Text>
        <Text style={styles.modalDescription}>
          Pause your subscription temporarily. Deliveries will resume automatically after the specified days.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Number of days:</Text>
          <TextInput
            style={styles.dayInput}
            value={vacationDays}
            onChangeText={setVacationDays}
            keyboardType="numeric"
            placeholder="Enter days"
            maxLength={3}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => setIsVacationModalVisible(false)}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={setVacationMode}
          >
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const setVacationMode = async () => {
  if (!selectedSubscriptionId || !vacationDays || isNaN(parseInt(vacationDays))) {
    Alert.alert('Error', 'Please enter a valid number of days');
    return;
  }

  const days = parseInt(vacationDays);
  if (days <= 0 || days > 90) {
    Alert.alert('Error', 'Please enter between 1 and 90 days');
    return;
  }

  try {
    setLoading(true);
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    const response = await axios.post(`${API_URL}/subscriptions/${selectedSubscriptionId}/vacation`, {
      vacation_mode: true,
      vacation_start: startDate.toISOString().split('T')[0],
      vacation_end: endDate.toISOString().split('T')[0]
    });
    
    if (response.status === 200) {
      setIsVacationModalVisible(false);
      setVacationDays('7');
      // Refresh subscriptions
      loadSubscriptions();
      Toast.show({
        type: 'success',
        text1: 'Vacation mode set',
        text2: `Your subscription is paused for ${days} days`
      });
    }
  } catch (error) {
    console.error('Error setting vacation mode:', error);
    Alert.alert('Error', 'Failed to set vacation mode. Please try again.');
  } finally {
    setLoading(false);
  }
};

const styles = {
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  dayInput: {
    borderWidth: 1,
 