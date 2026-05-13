/**
 * Common validation utilities
 */

const { TASK_PRIORITY_LEVELS } = require('./constants');

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  const local = cleaned.startsWith('91') && cleaned.length === 12 ? cleaned.slice(2) : cleaned;
  return /^\d{10}$/.test(local);
};

const normalizeIndianPhone = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  return cleaned;
};

const validateRequired = (value, fieldName) => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
};

const validateLength = (value, min, max, fieldName) => {
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  if (value.length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }
  return null;
};

const validateLeadData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.phone || data.phone.trim() === '') {
    errors.push('Phone is required');
  } else if (!validatePhone(data.phone)) {
    errors.push('Invalid phone format');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.source || data.source.trim() === '') {
    errors.push('Source is required');
  }

  if (data.leadType && !['guest', 'registered'].includes(data.leadType)) {
    errors.push('leadType must be guest or registered');
  }

  if (data.priority != null && String(data.priority).trim() !== '') {
    if (!Object.values(TASK_PRIORITY_LEVELS).includes(data.priority)) {
      errors.push('Invalid priority');
    }
  }
  
  return errors;
};

const validateUserData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else if (!validateEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (!data.role || !['admin', 'team_manager', 'team_member'].includes(data.role)) {
    errors.push('Role must be one of admin, team_manager, or team_member');
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Phone must be a valid 10-digit number');
  }

  if (data.priority != null && String(data.priority).trim() !== '') {
    if (!Object.values(TASK_PRIORITY_LEVELS).includes(data.priority)) {
      errors.push('Invalid priority');
    }
  }

  return errors;
};

module.exports = {
  validateEmail,
  validatePhone,
  normalizeIndianPhone,
  validateRequired,
  validateLength,
  validateLeadData,
  validateUserData
};
