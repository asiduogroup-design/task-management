import { useEffect, useState } from 'react';
import { employeeService } from '../services/employeeService.js';

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

export const formatDateTime = (value) =>
  (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-');

export const fallbackAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e2e8f0"/><circle cx="60" cy="46" r="22" fill="#94a3b8"/><rect x="22" y="78" width="76" height="30" rx="15" fill="#94a3b8"/></svg>'
)}`;

export const initialsFromName = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'EM';

export const defaultProfile = {
  user: {
    name: '',
    email: '',
    notificationPreferences: {
      inAppNotifications: true,
      emailNotifications: true,
      taskUpdates: true,
      leaveUpdates: true
    }
  },
  employeeCode: '',
  department: '',
  designation: '',
  joiningDate: '',
  reportingManager: null,
  phone: '',
  address: '',
  photoUrl: ''
};

export const useEmployeeProfileSettings = ({ refreshUser }) => {
  const [profile, setProfile] = useState(defaultProfile);
  const [personalForm, setPersonalForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    photoUrl: ''
  });
  const [photoForm, setPhotoForm] = useState({ photoUrl: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferencesForm, setPreferencesForm] = useState({
    inAppNotifications: true,
    emailNotifications: true,
    taskUpdates: true,
    leaveUpdates: true
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await employeeService.myProfile();
      const nextProfile = data.profile || defaultProfile;

      setProfile(nextProfile);
      setPersonalForm({
        name: nextProfile.user?.name || '',
        email: nextProfile.user?.email || '',
        phone: nextProfile.phone || '',
        address: nextProfile.address || '',
        photoUrl: nextProfile.photoUrl || ''
      });
      setPhotoForm({ photoUrl: nextProfile.photoUrl || '' });
      setPreferencesForm({
        inAppNotifications: nextProfile.user?.notificationPreferences?.inAppNotifications ?? true,
        emailNotifications: nextProfile.user?.notificationPreferences?.emailNotifications ?? true,
        taskUpdates: nextProfile.user?.notificationPreferences?.taskUpdates ?? true,
        leaveUpdates: nextProfile.user?.notificationPreferences?.leaveUpdates ?? true
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load profile.');
      setProfile(defaultProfile);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onSavePersonalDetails = async (event) => {
    event.preventDefault();
    setBusy('personal');
    setError('');
    setSuccess('');

    try {
      await employeeService.updateMyProfile({
        name: personalForm.name,
        email: personalForm.email,
        phone: personalForm.phone,
        address: personalForm.address,
        photoUrl: personalForm.photoUrl
      });
      await refreshUser();
      setSuccess('Personal details updated successfully.');
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update personal details.');
    } finally {
      setBusy('');
    }
  };

  const onChangePassword = async (event) => {
    event.preventDefault();
    setBusy('password');
    setError('');
    setSuccess('');

    try {
      await employeeService.changeMyPassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change password.');
    } finally {
      setBusy('');
    }
  };

  const onSavePreferences = async (event) => {
    event.preventDefault();
    setBusy('preferences');
    setError('');
    setSuccess('');

    try {
      await employeeService.updateMyNotificationPreferences(preferencesForm);
      setSuccess('Notification preferences updated successfully.');
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update notification preferences.');
    } finally {
      setBusy('');
    }
  };

  const onUpdatePhoto = async (event) => {
    event.preventDefault();
    setBusy('photo');
    setError('');
    setSuccess('');

    try {
      await employeeService.updateMyProfile({ photoUrl: photoForm.photoUrl });
      setSuccess('Profile photo updated successfully.');
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update profile photo.');
    } finally {
      setBusy('');
    }
  };

  return {
    busy,
    error,
    loading,
    onChangePassword,
    onSavePersonalDetails,
    onSavePreferences,
    onUpdatePhoto,
    passwordForm,
    personalForm,
    photoForm,
    preferencesForm,
    profile,
    setPasswordForm,
    setPersonalForm,
    setPhotoForm,
    setPreferencesForm,
    success
  };
};