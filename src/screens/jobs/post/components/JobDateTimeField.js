// src/screens/jobs/post/components/JobDateTimeField.js - FIXED VERSION
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES } from '../../../../styles/theme';
import { Button } from '../../../../components/common/Button';

export default function JobDateTimeField({ 
  date, 
  startTime, 
  endTime, 
  hours, 
  onChange, 
  onTimeChange 
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [mode, setMode] = useState('date');

  // Safe default values
  const safeDate = date || '';
  const safeStartTime = startTime || '';
  const safeEndTime = endTime || '';
  const safeHours = hours || '';

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onChange('scheduled_date', formattedDate);
    }
  };

  const onTimeChangeHandler = (field, event, selectedTime) => {
    if (field === 'start_time') {
      setShowStartTimePicker(Platform.OS === 'ios');
    } else {
      setShowEndTimePicker(Platform.OS === 'ios');
    }

    if (selectedTime) {
      const formattedTime = selectedTime.toTimeString().split(' ')[0].substring(0, 5);
      onTimeChange(field, formattedTime);
    }
  };

  const showDatepicker = () => {
    setMode('date');
    setShowDatePicker(true);
  };

  const showTimepicker = (field) => {
    setMode('time');
    if (field === 'start_time') {
      setShowStartTimePicker(true);
    } else {
      setShowEndTimePicker(true);
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Select date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Select date';
    }
  };

  const formatDisplayTime = (timeString) => {
    if (!timeString) return 'Select time';
    
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return 'Select time';
    }
  };

  return (
    <View style={{ marginBottom: SIZES.margin }}>
      <Text style={styles.fieldLabel}>Date & Time</Text>
      
      {/* Date Picker */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.subLabel}>Date</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={showDatepicker}>
          <Text style={styles.pickerText}>
            {formatDisplayDate(safeDate)}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={safeDate ? new Date(safeDate) : new Date()}
            mode={mode}
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Time Pickers */}
      <View style={styles.timeRow}>
        <View style={styles.timeColumn}>
          <Text style={styles.subLabel}>Start Time</Text>
          <TouchableOpacity 
            style={styles.pickerButton} 
            onPress={() => showTimepicker('start_time')}
          >
            <Text style={styles.pickerText}>
              {formatDisplayTime(safeStartTime)}
            </Text>
          </TouchableOpacity>
          {showStartTimePicker && (
            <DateTimePicker
              value={safeStartTime ? new Date(`2000-01-01T${safeStartTime}`) : new Date()}
              mode="time"
              display="default"
              onChange={(event, time) => onTimeChangeHandler('start_time', event, time)}
            />
          )}
        </View>

        <View style={styles.timeColumn}>
          <Text style={styles.subLabel}>End Time</Text>
          <TouchableOpacity 
            style={styles.pickerButton} 
            onPress={() => showTimepicker('end_time')}
          >
            <Text style={styles.pickerText}>
              {formatDisplayTime(safeEndTime)}
            </Text>
          </TouchableOpacity>
          {showEndTimePicker && (
            <DateTimePicker
              value={safeEndTime ? new Date(`2000-01-01T${safeEndTime}`) : new Date()}
              mode="time"
              display="default"
              onChange={(event, time) => onTimeChangeHandler('end_time', event, time)}
            />
          )}
        </View>
      </View>

      {/* Duration Display */}
      {(safeStartTime && safeEndTime) && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            Duration: {safeHours} hours
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = {
  fieldLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: SIZES.xSmall,
    fontWeight: '500',
    color: COLORS.gray600,
    marginBottom: 4,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  pickerText: {
    fontSize: SIZES.small,
    color: COLORS.gray800,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeColumn: {
    width: '48%',
  },
  durationContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius,
  },
  durationText: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray700,
    fontWeight: '500',
    textAlign: 'center',
  },
};