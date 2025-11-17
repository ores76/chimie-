import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Role, UserStatus, type User } from '../types';
import { CloseIcon, PencilIcon, TrashIcon } from './icons/Icons';
import { updateUser, deleteUser, bulkUpdateUsers } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';

// Edit User Modal Component
const EditUserModal: React.FC<{ user: User | null; onClose: () => void; onSave: (updatedUser: User) => Promise<void>; currentUser: User; }> = ({ user, onClose, onSave, currentUser }) => {
    const [formData, setFormData] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    if (!user || !formData) return null;

    const isEditingSelfAsAdmin = user.id === currentUser.id && user.role === Role.Admin;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            setIsSaving(true);
            await onSave(formData);
            setIsSaving(false);
        }
    };

    return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue">Modifier l'utilisateur</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Prénom</label>
                            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Nom</label>
                            <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="service" className="block text-sm font-medium text-gray-700">Service / Labo</label>
                        <input type="text" name="service" id="service" value={formData.service} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rôle</label>
                            <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm capitalize disabled:bg-gray-100" disabled={isEditingSelfAsAdmin}>
                                {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                             {isEditingSelfAsAdmin && <p className="mt-1 text-xs text-gray-500">Vous ne pouvez pas modifier votre propre rôle.</p>}
                        </div>
                         <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Statut</label>
                            <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm disabled:bg-gray-100" disabled={isEditingSelfAsAdmin}>
                                {Object.values(UserStatus).map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                            {isEditingSelfAsAdmin && <p className="mt-1 text-xs text-gray-500">Vous ne pouvez pas modifier votre propre statut.</p>}
                        </div>
                    </div>
                     <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annuler</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-ipt-blue text-white rounded-md hover:bg-ipt-light-blue transition disabled:bg-ipt-light-blue/70">
                            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Informational component for admins on how to create users
const UserCreationGuide: React.FC = () => (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-md">
        <div className="flex">
            <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
            </div>
            <div className="ml-3">
                <p className="text-sm font-bold text-blue-800">Comment ajouter un nouvel utilisateur ?</p>
                <div className="mt-2 text-sm text-blue-700">
                    <p>Pour des raisons de sécurité, la création d'utilisateur se fait manuellement dans votre tableau de bord Supabase :</p>
                    <ol className="list-decimal list-inside space-y-1 mt-2">
                        <li>
                            <strong>Étape 1 : Créer l'authentification</strong><br/>
                            Allez dans la section <strong className="font-semibold">Authentication</strong>, cliquez sur "Add user", et remplissez l'email et le mot de passe.
                        </li>
                        <li>
                            <strong>Étape 2 : Créer le profil</strong><br/>
                            Allez dans le <strong className="font-semibold">Table Editor</strong>, ouvrez la table <code className="text-xs bg-blue-100 p-1 rounded">users</code>, et ajoutez une nouvelle ligne avec les détails du profil (nom, service, rôle, etc.), en utilisant le même email.
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
);


interface UsersProps {
    currentUser: User;
    users: User[];
    setUsers: (users: User[]) => void;
    isLoading: boolean;
}

const Users: React.FC<UsersProps> = ({ currentUser, users, setUsers, isLoading }) => {
    const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all');
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [bulkRole, setBulkRole] = useState<Role | ''>('');
    const [bulkStatus, setBulkStatus] = useState<UserStatus | ''>('');
    const { addNotification } = useNotification();
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);


    const isAdmin = currentUser.role === Role.Admin;

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const roleMatch = filterRole === 'all' || user.role === filterRole;
            const statusMatch = filterStatus === 'all' || user.status === filterStatus;
            return roleMatch && statusMatch;
        });
    }, [users, filterRole, filterStatus]);
    
     useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numFiltered = filteredUsers.length;
            const numSelected = selectedUserIds.filter(id => filteredUsers.some(u => u.id === id)).length;
            selectAllCheckboxRef.current.checked = numFiltered > 0 && numSelected === numFiltered;
            selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numFiltered;
        }
    }, [selectedUserIds, filteredUsers]);


    const handleUpdateUser = async (updatedUser: User) => {
        const { error } = await updateUser(updatedUser);
        if (error) {
            addNotification(`Erreur: ${error.message}`, 'error');
        } else {
            addNotification(`Utilisateur ${updatedUser.firstName} mis à jour.`, 'success');
            setUserToEdit(null);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete) return;

        if (userToDelete.role === Role.Admin) {
            addNotification("La suppression des comptes administrateur n'est pas autorisée.", 'error');
            return;
        }

        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le profil de ${userToDelete.firstName} ${userToDelete.lastName} ?\n\nNOTE : Le compte d'authentification doit être supprimé manuellement depuis Supabase.`)) {
            const { error } = await deleteUser(userId);
            if (error) {
                addNotification(`Erreur lors de la suppression : ${error.message}`, 'error');
            } else {
                addNotification("Profil utilisateur supprimé avec succès.", 'info');
            }
        }
    };

    const handleSelectUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };
    
    const handleBulkUpdate = async () => {
        if (!bulkRole && !bulkStatus) {
            addNotification("Veuillez sélectionner une action (rôle ou statut).", 'error');
            return;
        }

        const usersToUpdateIds = selectedUserIds.filter(id => {
            const user = users.find(u => u.id === id);
            return user && user.role !== Role.Admin;
        });
        
        const adminCount = selectedUserIds.length - usersToUpdateIds.length;

        if (usersToUpdateIds.length === 0) {
            addNotification(adminCount > 0 ? "Les admins ne peuvent pas être modifiés en masse. Aucune action effectuée." : "Aucun utilisateur sélectionné pour la mise à jour.", 'info');
            setSelectedUserIds([]);
            return;
        }
        
        const updates: { role?: Role; status?: UserStatus } = {};
        if (bulkRole) updates.role = bulkRole;
        if (bulkStatus) updates.status = bulkStatus;

        const { error } = await bulkUpdateUsers(usersToUpdateIds, updates);

        if (error) {
            addNotification(`Erreur lors de la mise à jour groupée : ${error.message}`, 'error');
        } else {
            let successMsg = `${usersToUpdateIds.length} utilisateur(s) mis à jour avec succès.`;
            if (adminCount > 0) {
                successMsg += ` ${adminCount} admin(s) ont été ignorés.`;
            }
            addNotification(successMsg, 'success');
            setSelectedUserIds([]);
            setBulkRole('');
            setBulkStatus('');
        }
    };


    const getStatusBadge = (status: UserStatus) => {
        switch (status) {
            case UserStatus.Active: return 'bg-green-100 text-green-800';
            case UserStatus.Pending: return 'bg-yellow-100 text-yellow-800';
            case UserStatus.Inactive: return 'bg-gray-100 text-gray-800';
            case UserStatus.Rejected: return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            {isAdmin && <UserCreationGuide />}
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestion des Utilisateurs</h2>
            
            {selectedUserIds.length > 0 ? (
                <div className="bg-ipt-blue/10 border border-ipt-light-blue p-3 rounded-md mb-4 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
                    <span className="font-semibold text-ipt-dark-blue">{selectedUserIds.length} utilisateur(s) sélectionné(s)</span>
                    <div className="flex items-center flex-wrap gap-2">
                        <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as UserStatus | '')} className="p-2 border border-gray-300 rounded-md text-sm">
                            <option value="">Changer le statut...</option>
                            {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={bulkRole} onChange={e => setBulkRole(e.target.value as Role | '')} className="p-2 border border-gray-300 rounded-md text-sm capitalize">
                            <option value="">Changer le rôle...</option>
                             {Object.values(Role).filter(r => r !== Role.Admin).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={handleBulkUpdate} className="px-3 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue text-sm">Appliquer</button>
                        <button onClick={() => setSelectedUserIds([])} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm">Annuler</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-4 mb-4">
                    <select 
                        className="p-2 border border-gray-300 rounded-md"
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value as Role | 'all')}
                    >
                        <option value="all">Tous les Rôles</option>
                        {Object.values(Role).map(role => <option key={role} value={role} className="capitalize">{role}</option>)}
                    </select>
                    <select 
                        className="p-2 border border-gray-300 rounded-md"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as UserStatus | 'all')}
                    >
                        <option value="all">Tous les Statuts</option>
                        {Object.values(UserStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </div>
            )}
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            {isAdmin && <th className="p-4 w-4"><input ref={selectAllCheckboxRef} type="checkbox" onChange={handleSelectAll} className="rounded" /></th>}
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Service/Labo</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Rôle</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                            {isAdmin && <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 5} className="text-center p-8 text-gray-500">
                                    Chargement des utilisateurs...
                                </td>
                            </tr>
                        ) : filteredUsers.map((user, index) => (
                            <tr key={user.id} className={`${selectedUserIds.includes(user.id) ? 'bg-blue-100' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')} hover:bg-ipt-gold/10`}>
                                {isAdmin && (
                                    <td className="p-4">
                                        <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => handleSelectUser(user.id)} className="rounded" />
                                    </td>
                                )}
                                <td className="p-4 font-medium text-gray-800">{user.firstName} {user.lastName}</td>
                                <td className="p-4 text-gray-600">{user.email}</td>
                                <td className="p-4 text-gray-600">{user.service}</td>
                                <td className="p-4 text-gray-600 capitalize">{user.role}</td>
                                <td className="p-4">
                                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                                        {user.status}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td className="p-4 space-x-2 whitespace-nowrap">
                                        <button 
                                            onClick={() => setUserToEdit(user)} 
                                            className="p-2 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                            title="Modifier l'utilisateur"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user.id)} 
                                            className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                            title={user.role === Role.Admin ? "La suppression d'un admin est désactivée" : "Supprimer l'utilisateur"}
                                            disabled={user.role === Role.Admin}
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <EditUserModal user={userToEdit} onClose={() => setUserToEdit(null)} onSave={handleUpdateUser} currentUser={currentUser} />
        </div>
    );
};

export default Users;