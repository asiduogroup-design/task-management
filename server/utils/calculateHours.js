export const minutesBetween = (start, end) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
};

export const calculateWorkingHours = (loginTime, logoutTime, breakMinutes = 0) => {
  const minutes = Math.max(0, minutesBetween(loginTime, logoutTime) - breakMinutes);
  return Number((minutes / 60).toFixed(2));
};

export const dateOnly = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};
