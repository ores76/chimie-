import React, { useState, useEffect } from 'react';
import { type AlertConfiguration } from '../types';
import { useNotification } from '../context/NotificationContext';
import { addAlert, updateAlert, deleteAlert } from '../services/dataService';
import { BellIcon, PlusCircleIcon, TrashIcon, PencilIcon, CloseIcon } from './icons/Icons';

interface AlertModalProps {
    alert: Partial<AlertConfiguration> | null;
    onClose: () => void;
    onSave: (alert: AlertConfiguration) => Promise<void>;
}

const AlertModal: React.FC<AlertModalProps> = ({ alert, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<AlertConfiguration>>({
        threshold_days: 30,
        emails_to_notify: [],
        is_active: true,
        alert_type: 'expiry'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const { addNotification } = useNotification();

    useEffect(() => {
        if (alert) {
            setFormData(alert);
            setEmailInput(alert.emails_to_notify?.join(', ') || '');
        }
    }, [alert]);

    if (!alert) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const emails = emailInput.split(',').map(email => email.trim()).filter(Boolean);
        if (emails.length === 0) {
            addNotification("Veuillez entrer au moins une adresse e-mail.", 'error');
            setIsSaving(false);
            return;
        }

        const alertToSave = { ...formData, emails_to_notify: emails };
        await onSave(alertToSave as AlertConfiguration);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue">{alert.id ? 'Modifier' : 'Créer'} une Alerte</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notifier avant expiration (jours)</label>
                        <input
                            type="number"
                            value={formData.threshold_days}
                            onChange={(e) => setFormData(prev => ({ ...prev, threshold_days: parseInt(e.target.value, 10) || 0 }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Emails à notifier (séparés par une virgule)</label>
                        <textarea
                            rows={3}
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm"
                            required
                        />
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="h-4 w-4 text-ipt-blue border-gray-300 rounded focus:ring-ipt-blue"
                            id="is_active"
                        />
                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">Activer cette alerte</label>
                    </div>
                     <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annuler</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-ipt-light-blue/70">
                            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface AlertsProps {
    alertConfigs: AlertConfiguration[];
    isLoading: boolean;
}

const Alerts: React.FC<AlertsProps> = ({ alertConfigs, isLoading }) => {
    const [alertToEdit, setAlertToEdit] = useState<Partial<AlertConfiguration> | null>(null);
    const { addNotification } = useNotification();
    
    const handleSave = async (alertData: AlertConfiguration) => {
        const isNew = !alertData.id;
        const promise = isNew ? addAlert(alertData) : updateAlert(alertData);
        const { error } = await promise;

        if (error) {
            addNotification(`Erreur: ${error.message}`, 'error');
        } else {
            addNotification(`Alerte ${isNew ? 'créée' : 'mise à jour'} avec succès.`, 'success');
            setAlertToEdit(null);
        }
    };

    const handleDelete = async (alertId: string) => {
        if (window.confirm("Voulez-vous vraiment supprimer cette alerte ?")) {
            const { error } = await deleteAlert(alertId);
            if (error) {
                addNotification(`Erreur: ${error.message}`, 'error');
            } else {
                addNotification("Alerte supprimée.", 'info');
            }
        }
    };


    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
             <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><BellIcon className="h-7 w-7 text-ipt-blue"/>Gestion des Alertes</h2>
                 <button onClick={() => setAlertToEdit({})} className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow flex items-center gap-2">
                    <PlusCircleIcon className="h-5 w-5" /> Créer une Alerte
                </button>
            </div>
            <p className="text-gray-600 mb-6">Configurez des alertes automatiques pour les dates d'expiration des produits. Le système de notification par e-mail doit être configuré séparément sur le serveur.</p>

            <div className="space-y-4">
                {isLoading ? (
                    <p>Chargement des alertes...</p>
                ) : alertConfigs.length > 0 ? (
                    alertConfigs.map(alert => (
                        <div key={alert.id} className="p-4 border rounded-lg flex items-center justify-between bg-gray-50">
                            <div>
                                <p className="font-semibold text-ipt-dark-blue">
                                    Alerte d'expiration <span className="font-bold">{alert.threshold_days} jours</span> avant
                                </p>
                                <p className="text-sm text-gray-500 truncate" title={alert.emails_to_notify.join(', ')}>
                                    Notifier: {alert.emails_to_notify.join(', ')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                 <span className={`px-3 py-1 text-xs font-semibold rounded-full ${alert.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                    {alert.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button onClick={() => setAlertToEdit(alert)} className="p-2 rounded-full text-gray-600 hover:bg-blue-100"><PencilIcon className="h-5 w-5" /></button>
                                <button onClick={() => handleDelete(alert.id)} className="p-2 rounded-full text-red-600 hover:bg-red-100"><TrashIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">Aucune alerte configurée.</p>
                )}
            </div>

            {alertToEdit && <AlertModal alert={alertToEdit} onClose={() => setAlertToEdit(null)} onSave={handleSave} />}
        </div>
    );
};

export default Alerts;