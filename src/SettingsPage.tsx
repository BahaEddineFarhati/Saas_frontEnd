import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle, AlertCircle, User, Lock, Save } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { apiClient } from './api/apiClient';
import './settings-page.css';

// ── Validation schemas ──────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match",
  path: ["confirmNewPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// ── Toast Notification ──────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

function Toast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isSuccess = toast.type === 'success';

  return (
    <div className={`sp-toast sp-toast-${toast.type}`}>
      <div className="sp-toast-content">
        {isSuccess ? (
          <CheckCircle size={20} className="sp-toast-icon" />
        ) : (
          <AlertCircle size={20} className="sp-toast-icon" />
        )}
        <p className="sp-toast-message">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="sp-toast-close"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="sp-skeleton-container">
      <div className="sp-skeleton sp-skeleton-text"></div>
      <div className="sp-skeleton sp-skeleton-text"></div>
      <div className="sp-skeleton sp-skeleton-text"></div>
    </div>
  );
}

// ── Settings Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, updateUserProfile, updateTokens } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profileEmailError, setProfileEmailError] = useState('');
  const [passwordCurrentError, setPasswordCurrentError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Add toast notification ──
  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Profile form ────────────────────────────────────────────────────────
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: profileFormState,
    reset: profileReset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  // ── Password form ────────────────────────────────────────────────────────
  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    formState: passwordFormState,
    reset: passwordReset,
    watch: passwordWatch,
    trigger: passwordTrigger,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const passwordConfirm = passwordWatch('confirmNewPassword');

  // Validate confirm password on blur
  useEffect(() => {
    if (passwordConfirm) {
      passwordTrigger('confirmNewPassword');
    }
  }, [passwordConfirm, passwordTrigger]);

  // ── Load initial profile ────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/v1/profile');
        const profile = response.data.data;
        profileReset({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        addToast('Failed to load profile information.', 'error');
      } finally {
        setProfileLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, profileReset]);

  // ── Profile form submission ────────────────────────────────────────────
  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileSubmitting(true);
    setProfileEmailError('');
    try {
      const response = await apiClient.patch('/v1/profile', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      });

      const result = response.data.data;

      // Update user in context and localStorage
      updateUserProfile(
        {
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          email: result.user.email,
          fullName: `${result.user.firstName} ${result.user.lastName}`,
        },
        result.accessToken,
        result.refreshToken
      );

      // Show success toast
      addToast('Profil mis à jour avec succès.');
    } catch (error: any) {
      // Handle email already taken error
      if (error.response?.status === 409) {
        const errorCode = error.response?.data?.error?.code;
        if (errorCode === 'PROFILE_EMAIL_TAKEN') {
          setProfileEmailError('Cette adresse email est déjà utilisée.');
        } else {
          addToast('Failed to update profile.', 'error');
        }
      } else {
        console.error('Failed to update profile:', error);
        addToast('Failed to update profile.', 'error');
      }
    } finally {
      setProfileSubmitting(false);
    }
  };

  // ── Password form submission ────────────────────────────────────────────
  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordSubmitting(true);
    setPasswordCurrentError('');
    try {
      const response = await apiClient.patch('/v1/profile/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      });

      const result = response.data.data;

      // Update tokens in context and localStorage
      updateTokens(result.accessToken, result.refreshToken);

      // Clear form
      passwordReset();

      // Show success toast
      addToast('Mot de passe modifié avec succès.');
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      
      if (errorCode === 'PROFILE_WRONG_PASSWORD') {
        setPasswordCurrentError('Mot de passe actuel incorrect.');
      } else if (errorCode === 'PROFILE_PASSWORDS_DO_NOT_MATCH') {
        addToast('The new passwords do not match.', 'error');
      } else {
        console.error('Failed to change password:', error);
        addToast('Failed to change password.', 'error');
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <>
      <div className="sp-container">
        <div className="sp-grid">
          {/* ── Section 1: Profile Information ── */}
          <div className="sp-section">
          <div className="sp-section-header">
            <div className="sp-section-icon-wrap">
              <User size={18} strokeWidth={2.2} />
            </div>
            <h2 className="sp-section-title">Informations du profil</h2>
          </div>
          
          {profileLoading ? (
            <ProfileSkeleton />
          ) : (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="sp-form">
              {/* First Name */}
              <div className="sp-form-group">
                <label htmlFor="firstName" className="sp-label">
                  First Name <span className="sp-required">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  {...profileRegister('firstName')}
                  disabled={profileSubmitting}
                  className="sp-input"
                />
                {profileFormState.errors.firstName && (
                  <p className="sp-error">{profileFormState.errors.firstName.message}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="sp-form-group">
                <label htmlFor="lastName" className="sp-label">
                  Last Name <span className="sp-required">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  {...profileRegister('lastName')}
                  disabled={profileSubmitting}
                  className="sp-input"
                />
                {profileFormState.errors.lastName && (
                  <p className="sp-error">{profileFormState.errors.lastName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="sp-form-group">
                <label htmlFor="email" className="sp-label">
                  Email <span className="sp-required">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  {...profileRegister('email')}
                  disabled={profileSubmitting}
                  className="sp-input"
                />
                {profileFormState.errors.email && (
                  <p className="sp-error">{profileFormState.errors.email.message}</p>
                )}
                {profileEmailError && (
                  <p className="sp-error">{profileEmailError}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={profileSubmitting}
                className="cand-btn-primary"
              >
                <Save size={16} strokeWidth={2.2} />
                <span>{profileSubmitting ? 'Enregistrement...' : 'Sauvegarder les modifications'}</span>
              </button>
            </form>
          )}
        </div>

          {/* ── Section 2: Change Password ── */}
          <div className="sp-section">
          <div className="sp-section-header">
            <div className="sp-section-icon-wrap">
              <Lock size={18} strokeWidth={2.2} />
            </div>
            <h2 className="sp-section-title">Modifier le mot de passe</h2>
          </div>
          
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="sp-form">
            {/* Current Password */}
            <div className="sp-form-group">
              <label htmlFor="currentPassword" className="sp-label">
                Current Password <span className="sp-required">*</span>
              </label>
              <div className="sp-password-input-wrapper">
                <input
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  {...passwordRegister('currentPassword')}
                  disabled={passwordSubmitting}
                  className="sp-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                  className="sp-password-toggle"
                  disabled={passwordSubmitting}
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordFormState.errors.currentPassword && (
                <p className="sp-error">{passwordFormState.errors.currentPassword.message}</p>
              )}
              {passwordCurrentError && (
                <p className="sp-error">{passwordCurrentError}</p>
              )}
            </div>

            {/* New Password */}
            <div className="sp-form-group">
              <label htmlFor="newPassword" className="sp-label">
                New Password <span className="sp-required">*</span>
              </label>
              <div className="sp-password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  {...passwordRegister('newPassword')}
                  disabled={passwordSubmitting}
                  className="sp-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                  className="sp-password-toggle"
                  disabled={passwordSubmitting}
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordFormState.errors.newPassword && (
                <p className="sp-error">{passwordFormState.errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="sp-form-group">
              <label htmlFor="confirmNewPassword" className="sp-label">
                Confirm New Password <span className="sp-required">*</span>
              </label>
              <div className="sp-password-input-wrapper">
                <input
                  id="confirmNewPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  {...passwordRegister('confirmNewPassword')}
                  disabled={passwordSubmitting}
                  className="sp-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                  className="sp-password-toggle"
                  disabled={passwordSubmitting}
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordFormState.errors.confirmNewPassword && (
                <p className="sp-error">{passwordFormState.errors.confirmNewPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={passwordSubmitting}
              className="cand-btn-primary"
            >
              <Lock size={16} strokeWidth={2.2} />
              <span>{passwordSubmitting ? 'Enregistrement...' : 'Changer le mot de passe'}</span>
            </button>
          </form>
          </div>
        </div>
      </div>

      {/* Toast container */}
      <div className="sp-toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}

