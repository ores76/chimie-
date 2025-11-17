import React, { useState } from 'react';
import { type Product, type User, type InventorySubmission } from '../types';
import { ChartBarIcon, FlaskIcon, UsersIcon, ArchiveIcon, CloseIcon, DocumentArrowDownIcon } from './icons/Icons';
import { useNotification } from '../context/NotificationContext';
import { approveSubmission, updateSubmissionStatus } from '../services/dataService';
import FeatureSlider from './FeatureSlider';

// A versatile modal for viewing or approving a submission
const SubmissionModal: React.FC<{
    submission: InventorySubmission;
    mode: 'view' | 'approve';
    onClose: () => void;
    onConfirm: () => void;
    allProducts: Product[];
    addNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}> = ({ submission, mode, onClose, onConfirm, allProducts, addNotification }) => {
    const isApprovalMode = mode === 'approve';

    const handleDownloadCsv = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Code,Désignation,Qte en stock\n";

        submission.items.forEach(item => {
            const product = allProducts.find(p => p.id === item.productId);
            const code = product?.code || 'N/A';
            const name = `"${item.name.replace(/"/g, '""')}"`;
            const quantity = item.quantity;
            csvContent += `${code},${name},${quantity}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventaire_${submission.depotName.replace(/\s+/g, '_')}_${submission.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue">{isApprovalMode ? "Approbation de la Soumission" : "Détails de la Soumission"}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6">
                    <p className="font-semibold text-lg">{submission.depotName}</p>
                    <p className="text-sm text-gray-500 mb-4">{new Date(submission.created_at).toLocaleString()}</p>
                    <div className="border rounded-lg max-h-60 overflow-y-auto p-2 mb-6">
                        <table className="w-full text-sm">
                           <thead><tr className="border-b"><th className="text-left p-2">Produit</th><th className="text-right p-2">Quantité</th></tr></thead>
                           <tbody>
                            {submission.items.map((item, index) => (
                                <tr key={`${item.productId}-${index}`}><td className="p-2">{item.name}</td><td className="text-right p-2 font-medium">{item.quantity}</td></tr>
                            ))}
                           </tbody>
                        </table>
                    </div>
                     <div className="flex flex-wrap justify-center gap-4 mb-4">
                        <button onClick={handleDownloadCsv} className="flex items-center gap-2 px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition">
                            <DocumentArrowDownIcon className="h-5 w-5"/> Télécharger la Liste (Excel)
                        </button>
                    </div>
                </div>
                 <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">{isApprovalMode ? "Annuler" : "Fermer"}</button>
                    {isApprovalMode && (
                        <button type="button" onClick={onConfirm} className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow">Confirmer l'Approbation</button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface DashboardProps {
    currentUser: User;
    products: Product[];
    users: User[];
    submissions: InventorySubmission[];
    isLoading: {
        products: boolean;
        users: boolean;
        submissions: boolean;
    };
    setSubmissions: (submissions: InventorySubmission[]) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; isLoading?: boolean }> = ({ title, value, icon, color, isLoading }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between border-l-4" style={{ borderColor: color }}>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {isLoading ? (
                <div className="mt-1 h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            )}
        </div>
        <div className={`p-3 rounded-full`} style={{ backgroundColor: `${color}20` }}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: `h-7 w-7 ${(icon as React.ReactElement<any>).props.className || ''}`.trim(), style: { color } })}
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ currentUser, products, users, submissions, setSubmissions, isLoading }) => {
    const [submissionForModal, setSubmissionForModal] = useState<{ submission: InventorySubmission; mode: 'view' | 'approve' } | null>(null);
    const [activeSubmissionTab, setActiveSubmissionTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const { addNotification } = useNotification();

    const lowStockProducts = products.filter(p => p.stock <= p.alertThreshold).sort((a,b) => a.stock - b.stock);
    const pendingSubmissions = submissions.filter(s => s.status === 'pending');
    const approvedSubmissions = submissions.filter(s => s.status === 'approved');
    const rejectedSubmissions = submissions.filter(s => s.status === 'rejected');

    const submissionsToDisplay = {
        pending: pendingSubmissions,
        approved: approvedSubmissions,
        rejected: rejectedSubmissions,
    }[activeSubmissionTab];

    const handleApprove = async (submission: InventorySubmission) => {
        const { error } = await approveSubmission(submission, currentUser);
        if (error) {
            addNotification(`Erreur lors de l'approbation : ${error.message}`, 'error');
        } else {
            addNotification(`La soumission de ${submission.depotName} a été approuvée et les stocks mis à jour.`, 'success');
            setSubmissions(
                submissions.map(s => s.id === submission.id ? { ...s, status: 'approved' } : s)
            );
        }
    };

    const handleReject = async (submission: InventorySubmission) => {
        if (window.confirm(`Voulez-vous vraiment rejeter la soumission de ${submission.depotName} ?`)) {
            const { error } = await updateSubmissionStatus(submission.id, 'rejected');
            if (error) {
                addNotification(`Erreur lors du rejet : ${error.message}`, 'error');
            } else {
                addNotification(`La soumission de ${submission.depotName} a été rejetée.`, 'info');
                setSubmissions(
                    submissions.map(s => s.id === submission.id ? { ...s, status: 'rejected' } : s)
                );
            }
        }
    };

    const handleDownloadApprovedCsv = () => {
        if (approvedSubmissions.length === 0) {
            addNotification("Aucune soumission approuvée à exporter.", 'info');
            return;
        }
    
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Depot,Date de soumission,Code Produit,Désignation,Quantité Approuvée\n";
    
        approvedSubmissions.forEach(submission => {
            const submissionDate = new Date(submission.created_at).toLocaleString();
            const depotName = `"${submission.depotName.replace(/"/g, '""')}"`;
    
            submission.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const code = product?.code || 'N/A';
                const name = `"${item.name.replace(/"/g, '""')}"`;
                const quantity = item.quantity;
                
                csvContent += `${depotName},${submissionDate},${code},${name},${quantity}\n`;
            });
        });
    
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `rapport_soumissions_approuvees_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const activeTabClass = 'border-ipt-blue text-ipt-blue';
    const inactiveTabClass = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    
    return (
        <div className="space-y-6">
            <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden shadow-lg mb-6">
                <FeatureSlider />
            </div>
            
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Produits en stock" value={products.length} icon={<FlaskIcon/>} color="#3498db" isLoading={isLoading.products} />
                <StatCard title="Utilisateurs" value={users.length} icon={<UsersIcon/>} color="#2ecc71" isLoading={isLoading.users} />
                <StatCard title="Produits en alerte" value={lowStockProducts.length} icon={<ChartBarIcon className="transform rotate-180"/>} color="#f1c40f" isLoading={isLoading.products} />
                <StatCard title="Soumissions en attente" value={pendingSubmissions.length} icon={<ArchiveIcon/>} color="#e74c3c" isLoading={isLoading.submissions} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Products */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Produits avec stock bas</h3>
                    <div className="overflow-y-auto max-h-80">
                        {isLoading.products ? (
                           <div className="space-y-3 py-2">
                                <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                <div className="h-6 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                           </div>
                        ) : lowStockProducts.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {lowStockProducts.map(p => (
                                    <li key={p.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-700">{p.name}</p>
                                            <p className="text-sm text-gray-500">{p.location}</p>
                                        </div>
                                        <span className="font-bold text-red-600">{p.stock} {p.unit}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 py-4">Aucun produit en alerte de stock.</p>
                        )}
                    </div>
                </div>

                {/* Inventory Submissions */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Activité des Dépôts (Soumissions)</h3>
                        {activeSubmissionTab === 'approved' && approvedSubmissions.length > 0 && (
                            <button 
                                onClick={handleDownloadApprovedCsv}
                                className="px-3 py-1.5 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition shadow-sm text-sm flex items-center gap-2"
                            >
                                <DocumentArrowDownIcon className="h-5 w-5"/>
                                Télécharger le Rapport (Excel)
                            </button>
                        )}
                    </div>
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                             <button onClick={() => setActiveSubmissionTab('pending')} className={`${activeSubmissionTab === 'pending' ? activeTabClass : inactiveTabClass} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}>
                                En attente
                                {pendingSubmissions.length > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{pendingSubmissions.length}</span>}
                            </button>
                            <button onClick={() => setActiveSubmissionTab('approved')} className={`${activeSubmissionTab === 'approved' ? activeTabClass : inactiveTabClass} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                Approuvées
                            </button>
                             <button onClick={() => setActiveSubmissionTab('rejected')} className={`${activeSubmissionTab === 'rejected' ? activeTabClass : inactiveTabClass} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}>
                                Rejetées
                            </button>
                        </nav>
                    </div>
                    <div className="overflow-y-auto max-h-80 space-y-4 pt-4">
                        {isLoading.submissions ? (
                             <div className="space-y-3 py-2">
                                <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                                <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                            </div>
                        ) : submissionsToDisplay.length > 0 ? (
                            submissionsToDisplay.map(sub => (
                                <div key={sub.id} className="p-4 border rounded-lg bg-gray-50 animate-fade-in">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold text-ipt-blue">{sub.depotName}</p>
                                            <p className="text-xs text-gray-500">{new Date(sub.created_at).toLocaleString()}</p>
                                        </div>
                                         <div className="flex gap-2">
                                            <button onClick={() => setSubmissionForModal({ submission: sub, mode: 'view' })} className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600">Détails</button>
                                            {activeSubmissionTab === 'pending' && (
                                                <>
                                                    <button onClick={() => setSubmissionForModal({ submission: sub, mode: 'approve' })} className="px-2 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600">Approuver</button>
                                                    <button onClick={() => handleReject(sub)} className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600">Rejeter</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <ul className="list-disc pl-5 text-sm">
                                        {sub.items.slice(0, 3).map((item, index) => (
                                            <li key={`${item.productId}-${index}`} className="text-gray-700">
                                                {item.name}: <span className="font-medium">{item.quantity}</span>
                                            </li>
                                        ))}
                                        {sub.items.length > 3 && <li className="text-gray-500">et {sub.items.length - 3} autre(s)...</li>}
                                    </ul>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-4">
                                {
                                    {
                                        pending: "Aucune soumission en attente de validation.",
                                        approved: "Aucune soumission approuvée récemment.",
                                        rejected: "Aucune soumission rejetée."
                                    }[activeSubmissionTab]
                                }
                            </p>
                        )}
                    </div>
                </div>
            </div>
            {submissionForModal && (
                <SubmissionModal 
                    submission={submissionForModal.submission}
                    mode={submissionForModal.mode}
                    onClose={() => setSubmissionForModal(null)}
                    onConfirm={() => {
                        handleApprove(submissionForModal.submission);
                        setSubmissionForModal(null);
                    }}
                    allProducts={products}
                    addNotification={addNotification}
                />
            )}
        </div>
    );
}

export default Dashboard;