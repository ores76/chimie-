import React, { useState } from 'react';
import { type User, Role } from '../types';
import { MenuIcon, LogoutIcon, KeyIcon, CloseIcon } from './icons/Icons';
import { updateUserPassword } from '../services/authService';
import { useNotification } from '../context/NotificationContext';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuClick: () => void;
}

const PasswordChangeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            addNotification("Le mot de passe doit contenir au moins 6 caractères.", 'error');
            return;
        }
        if (password !== confirmPassword) {
            addNotification("Les mots de passe ne correspondent pas.", 'error');
            return;
        }

        setIsSubmitting(true);
        const { error: updateError } = await updateUserPassword(password);
        setIsSubmitting(false);

        if (updateError) {
            addNotification(updateError, 'error');
        } else {
            addNotification("Mot de passe mis à jour avec succès !", 'success');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue flex items-center gap-2">
                        <KeyIcon className="h-6 w-6" />
                        Changer le mot de passe
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm"
                            required
                        />
                    </div>
                    <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annuler</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-gray-400">
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ user, onLogout, onMenuClick }) => {
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between h-20 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-center">
          <button onClick={onMenuClick} className="text-gray-500 focus:outline-none lg:hidden mr-4">
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="text-xl md:text-2xl font-semibold text-ipt-blue">
            Bienvenue, {user.firstName}
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden sm:flex flex-col items-end">
              <span className="font-semibold text-gray-700">{user.firstName} {user.lastName}</span>
              <span className="text-sm text-gray-500 capitalize">{user.role}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-ipt-light-blue flex items-center justify-center text-white font-bold select-none">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          {(user.role === Role.Depot || user.role === Role.Admin) && (
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="p-2 rounded-full text-gray-600 hover:bg-blue-100 hover:text-ipt-blue transition-colors"
              aria-label="Changer le mot de passe"
              title="Changer le mot de passe"
            >
              <KeyIcon className="h-6 w-6" />
            </button>
          )}
          <button
            onClick={onLogout}
            className="p-2 rounded-full text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
            aria-label="Déconnexion"
          >
            <LogoutIcon className="h-6 w-6" />
          </button>
        </div>
      </header>
      {isPasswordModalOpen && <PasswordChangeModal onClose={() => setPasswordModalOpen(false)} />}
    </>
  );
};

export default Header;