import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES } from '../../../../styles/theme';

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

  const safeDate = date || '';
  const safeStartTime = startTime || '';
  const safeEndTime = endTime || '';
  const safeHours = hours || '';

  // Get device UTC offset in minutes (e.g. SAST = +120)
  const getUtcOffset = () => {
    return -new Date().getTimezoneOffset();
  };

  // Convert local time string (HH:MM) to UTC time string (HH:MM)
  const localTimeToUtc = (localDateStr, localTimeStr) => {
    if (!localDateStr || !localTimeStr) return localTimeStr;
    try {
      const [hours, minutes] = localTimeStr.split(':').map(Number);
      const localDate = new Date(localDateStr);
      localDate.setHours(hours, minutes, 0, 0);
      const utcHours = localDate.getUTCHours().toString().padStart(2, '0');
      const utcMinutes = localDate.getUTCMinutes().toString().padStart(2, '0');
      return `${utcHours}:${utcMinutes}`;
    } catch {
      return localTimeStr;
    }
  };

  // Convert UTC time string (HH:MM) to local time string (HH:MM) for display
  const utcTimeToLocal = (localDateStr, utcTimeStr) => {
    if (!localDateStr || !utcTimeStr) return utcTimeStr;
    try {
      const [hours, minutes] = utcTimeStr.split(':').map(Number);
      const utcDate = new Date(localDateStr);
      utcDate.setUTCHours(hours, minutes, 0, 0);
      const localHours = utcDate.getHours().toString().padStart(2, '0');
      const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
      return `${localHours}:${localMinutes}`;
    } catch {
      return utcTimeStr;
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onChange('scheduled_date', formattedDate);
      // Save UTC offset so we can convert back correctly later
      onChange('utc_offset', getUtcOffset());
    }
  };

  const onTimeChangeHandler = (field, event, selectedTime) => {
    if (field === 'start_time') {
      setShowStartTimePicker(Platform.OS === 'ios');
    } else {
      setShowEndTimePicker(Platform.OS === 'ios');
    }

    if (selectedTime) {
      // Get local time string from picker
      const localTime = selectedTime.toTimeString().split(' ')[0].substring(0, 5);
      // Convert to UTC before storing
      const utcTime = localTimeToUtc(safeDate || new Date().toISOString().split('T')[0], localTime);
      onTimeChange(field, utcTime);
      // Save UTC offset
      onChange('utc_offset', getUtcOffset());
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
    } catch {
      return 'Select date';
    }
  };

  // Display times in local format - converting from stored UTC
  const formatDisplayTime = (utcTimeString) => {
    if (!utcTimeString) return 'Select time';
    try {
      // Convert stored UTC time back to local for display
      const localTime = utcTimeToLocal(
        safeDate || new Date().toISOString().split('T')[0],
        utcTimeString
      );
      const [hours, minutes] = localTime.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return 'Select time';
    }
  };

  // Convert stored UTC time back to local Date object for the picker
  const utcTimeToLocalDate = (utcTimeStr) => {
    if (!utcTimeStr) return new Date();
    try {
      const dateStr = safeDate || new Date().toISOString().split('T')[0];
      const [hours, minutes] = utcTimeStr.split(':').map(Number);
      const utcDate = new Date(dateStr);
      utcDate.setUTCHours(hours, minutes, 0, 0);
      return utcDate;
    } catch {
      return new Date();
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
              value={utcTimeToLocalDate(safeStartTime)}
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
              value={utcTimeToLocalDate(safeEndTime)}
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
    gap: 12,
    marginBottom: 8,
  },
  timeColumn: {
    flex: 1,
  },
  durationContainer: {
    backgroundColor: COLORS.gray100,
    padding: 8,
    borderRadius: SIZES.radius,
    marginTop: 4,
  },
  durationText: {
    fontSize: SIZES.small,
    color: COLORS.gray700,
    textAlign: 'center',
    fontWeight: '600',
  },
};