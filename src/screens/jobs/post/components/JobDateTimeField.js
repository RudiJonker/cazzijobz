// src/screens/jobs/post/components/JobDateTimeField.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  Platform 
} from 'react-native';
import { COLORS, SIZES } from '../../../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function JobDateTimeField({ date, startTime, endTime, hours, onChange, onTimeChange, errors }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Convert time string to Date object for the picker
  const timeToDate = (timeString) => {
    if (!timeString) return new Date();
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  };

  // Convert Date object to time string
  const dateToTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-ZA', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle date selection
  const handleDateConfirm = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      onChange('scheduled_date', dateString);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  // Handle time selection
  const handleTimeConfirm = (field, selectedTime) => {
    if (selectedTime) {
      const timeString = dateToTime(selectedTime);
      onTimeChange(field, timeString);
    }
    
    if (Platform.OS === 'android') {
      if (field === 'start_time') setShowStartTimePicker(false);
      if (field === 'end_time') setShowEndTimePicker(false);
    }
  };

  // Calculate hours display text
  const getHoursDisplay = () => {
    if (!hours || hours <= 0) return '-- hours';
    if (hours === 1) return '1 hour';
    if (hours < 1) return `${(hours * 60).toFixed(0)} minutes`;
    return `${parseFloat(hours).toFixed(1)} hours`;
  };

  // Android Pickers
  const renderAndroidPickers = () => {
    return (
      <>
        {showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="calendar"
            minimumDate={new Date()}
            onChange={handleDateConfirm}
          />
        )}
        {showStartTimePicker && (
          <DateTimePicker
            value={timeToDate(startTime)}
            mode="time"
            display="clock"
            onChange={(event, time) => handleTimeConfirm('start_time', time)}
          />
        )}
        {showEndTimePicker && (
          <DateTimePicker
            value={timeToDate(endTime)}
            mode="time"
            display="clock"
            onChange={(event, time) => handleTimeConfirm('end_time', time)}
          />
        )}
      </>
    );
  };

  // iOS Time Picker Modal
  const renderIOSTimeModal = (field, visible, setVisible, currentTime, title) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
          </View>
          
          <DateTimePicker
            value={timeToDate(currentTime)}
            mode="time"
            display="spinner"
            onChange={(event, time) => {
              if (time) {
                const timeString = dateToTime(time);
                onTimeChange(field, timeString);
              }
            }}
            style={styles.timePicker}
          />
          
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => setVisible(false)}
          >
            <Text style={styles.confirmButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // iOS Date Picker Modal
  const renderIOSDatePickerModal = () => {
    if (Platform.OS === 'ios' && showDatePicker) {
      return (
        <Modal
          visible={showDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.gray500} />
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
                style={styles.dateTimePicker}
              />
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleDateConfirm(null, tempDate)}
              >
                <Text style={styles.confirmButtonText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }
    return null;
  };

  return (
    <View style={{ marginBottom: SIZES.margin }}>
      <Text style={styles.fieldLabel}>Schedule *</Text>

      {/* Date Selection */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.subLabel}>Date</Text>
        <TouchableOpacity onPress={() => {
          setTempDate(date ? new Date(date) : new Date());
          setShowDatePicker(true);
        }}>
          <View style={styles.pickerButton}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.gray600} />
            <Text style={[
              styles.pickerButtonText,
              !date && styles.placeholderText
            ]}>
              {date ? formatDate(date) : 'Select job date'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.gray500} />
          </View>
        </TouchableOpacity>
        {errors.scheduled_date && (
          <Text style={styles.errorText}>{errors.scheduled_date}</Text>
        )}
      </View>

      {/* Time Selection Row */}
      <View style={styles.timeRow}>
        {/* Start Time */}
        <View style={styles.timeColumn}>
          <Text style={styles.subLabel}>Start Time</Text>
          <TouchableOpacity onPress={() => {
            if (Platform.OS === 'android') {
              setShowStartTimePicker(true);
            } else {
              setShowStartTimePicker(true);
            }
          }}>
            <View style={styles.pickerButton}>
              <Ionicons name="time-outline" size={18} color={COLORS.gray600} />
              <Text style={[
                styles.pickerButtonText,
                !startTime && styles.placeholderText
              ]}>
                {startTime || '08:00'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.gray500} />
            </View>
          </TouchableOpacity>
          {errors.start_time && (
            <Text style={styles.errorText}>{errors.start_time}</Text>
          )}
        </View>

        {/* End Time */}
        <View style={styles.timeColumn}>
          <Text style={styles.subLabel}>End Time</Text>
          <TouchableOpacity onPress={() => {
            if (Platform.OS === 'android') {
              setShowEndTimePicker(true);
            } else {
              setShowEndTimePicker(true);
            }
          }}>
            <View style={styles.pickerButton}>
              <Ionicons name="time-outline" size={18} color={COLORS.gray600} />
              <Text style={[
                styles.pickerButtonText,
                !endTime && styles.placeholderText
              ]}>
                {endTime || '17:00'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.gray500} />
            </View>
          </TouchableOpacity>
          {errors.end_time && (
            <Text style={styles.errorText}>{errors.end_time}</Text>
          )}
        </View>
      </View>

      {/* Auto-calculated Hours Display */}
      <View style={styles.hoursContainer}>
        <View style={styles.hoursLabelContainer}>
          <Ionicons name="timer-outline" size={18} color={COLORS.primary} />
          <Text style={styles.hoursLabel}>Estimated Duration:</Text>
        </View>
        <Text style={styles.hoursValue}>
          {getHoursDisplay()}
        </Text>
      </View>

      {/* Android Pickers */}
      {Platform.OS === 'android' && renderAndroidPickers()}

      {/* iOS Pickers */}
      {Platform.OS === 'ios' && (
        <>
          {renderIOSDatePickerModal()}
          {renderIOSTimeModal('start_time', showStartTimePicker, setShowStartTimePicker, startTime, 'Select Start Time')}
          {renderIOSTimeModal('end_time', showEndTimePicker, setShowEndTimePicker, endTime, 'Select End Time')}
        </>
      )}
    </View>
  );
}

const styles = {
  fieldLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: SIZES.xSmall,
    fontWeight: '500',
    color: COLORS.gray600,
    marginBottom: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: SIZES.small,
    color: COLORS.gray800,
    marginLeft: 8,
  },
  placeholderText: {
    color: COLORS.gray500,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.xSmall,
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeColumn: {
    width: '48%',
  },
  hoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    padding: 12,
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  hoursLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursLabel: {
    fontSize: SIZES.small,
    fontWeight: '500',
    color: COLORS.gray700,
    marginLeft: 6,
  },
  hoursValue: {
    fontSize: SIZES.small,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding * 1.2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  dateTimePicker: {
    height: 200,
    margin: SIZES.padding,
  },
  timePicker: {
    height: 200,
    margin: SIZES.padding,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    margin: SIZES.padding,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: SIZES.medium,
    fontWeight: '500',
  },
};