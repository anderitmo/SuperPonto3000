// Helper to convert "HH:MM:SS" or "HH:MM" string to minutes from midnight
function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

// Convert Date object to minutes from midnight
function dateToMinutes(dateObj) {
  return dateObj.getHours() * 60 + dateObj.getMinutes();
}

/**
 * Calculates Journey status according to SPEC 4.4 requirements:
 * - 15 minute delay tolerance on entry without infraction flag.
 * - Exact delay minutes (up to 15 min) added to required exit time for same-shift compensation.
 * - Statuses: Normal, Atraso (> 15 min), Saída Antecipada, Falta.
 */
export function calculateJourneyStatus(record, employeeSchedule, department) {
  if (!record) return { status: 'Falta', badgeClass: 'badge-falta' };

  const recordType = record.record_type; // 'ENTRADA' or 'SAIDA'
  const recordDate = new Date(record.record_timestamp);
  const recordMinutes = dateToMinutes(recordDate);

  // Determine standard vs custom exception entry and exit times
  const expectedEntryStr = employeeSchedule?.custom_entry_time || department?.default_entry_time || '08:00:00';
  const expectedExitStr = employeeSchedule?.custom_exit_time || department?.default_exit_time || '17:00:00';

  const expectedEntryMin = timeStringToMinutes(expectedEntryStr);
  const expectedExitMin = timeStringToMinutes(expectedExitStr);

  if (recordType === 'ENTRADA') {
    const delayMinutes = recordMinutes - expectedEntryMin;

    if (delayMinutes <= 0) {
      return { status: 'Normal', delayMinutes: 0, badgeClass: 'badge-normal' };
    } else if (delayMinutes <= 15) {
      // Within tolerance - normal status with compensation requirement
      return { status: 'Normal (Compensar)', delayMinutes, badgeClass: 'badge-normal' };
    } else {
      // Excess delay (> 15 min)
      return { status: 'Atraso', delayMinutes, badgeClass: 'badge-atraso' };
    }
  } else if (recordType === 'SAIDA') {
    // If entry had a delay within 15 mins, add compensation to exit requirement
    const entryDelay = record.entryDelayMinutes || 0;
    const requiredExitMin = expectedExitMin + (entryDelay <= 15 ? entryDelay : 0);

    if (recordMinutes >= requiredExitMin) {
      return { status: 'Normal', badgeClass: 'badge-normal' };
    } else {
      return { status: 'Saída Antecipada', badgeClass: 'badge-saida-antecipada' };
    }
  }

  return { status: 'Normal', badgeClass: 'badge-normal' };
}
