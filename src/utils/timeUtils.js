// src/utils/timeUtils.js

/**
 * Convert a stored UTC time string to local display time
 * @param {string} utcTimeStr - Time stored in DB e.g. "14:55"
 * @param {string} dateStr - Date string e.g. "2026-02-26"
 * @param {number} utcOffset - UTC offset in minutes e.g. 120 for SAST
 * @returns {string} Local time in 12hr format e.g. "4:55 PM"
 */
export const formatLocalTime = (utcTimeStr, dateStr, utcOffset = 0) => {
  if (!utcTimeStr) return '';
  try {
    const [hours, minutes] = utcTimeStr.split(':').map(Number);
    
    // If we have a date and offset, do proper conversion
    if (dateStr && utcOffset !== 0) {
      const utcDate = new Date(dateStr);
      utcDate.setUTCHours(hours, minutes, 0, 0);
      const localHours = utcDate.getHours();
      const localMinutes = utcDate.getMinutes();
      const ampm = localHours >= 12 ? 'PM' : 'AM';
      const displayHour = localHours % 12 || 12;
      const displayMinutes = localMinutes.toString().padStart(2, '0');
      return `${displayHour}:${displayMinutes} ${ampm}`;
    }

    // Fallback - just format as 12hr without conversion
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHour}:${displayMinutes} ${ampm}`;
  } catch {
    return utcTimeStr;
  }
};

/**
 * Format a date string for display
 * @param {string} dateString - e.g. "2026-02-26"
 * @param {object} options - toLocaleDateString options
 */
export const formatDisplayDate = (dateString, options = {}) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options
    });
  } catch {
    return dateString;
  }
};