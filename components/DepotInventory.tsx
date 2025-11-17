import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type Product, type User, type InventoryItem, type InventorySubmission, type ChatMessage } from '../types';
import { PlusCircleIcon, SendIcon, TrashIcon, InventoryIcon, ChartBarIcon, HistoryIcon, ChatBubbleIcon, CloseIcon, DocumentArrowDownIcon, PhotoIcon, EnvelopeIcon } from './icons/Icons';
import { useNotification } from '../context/NotificationContext';
import * as dataService from '../services/dataService';
import { sendMessage, fetchMessages, subscribeToMessages } from '../services/chatService';

type DepotTab = 'inventaire' | 'sortie_stock' | 'statistiques' | 'historique' | 'support';

// --- MODALS ---

const SubmissionDetailModal: React.FC<{ submission: InventorySubmission; onClose: () => void }> = ({ submission, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold text-ipt-blue">Détails de la Soumission</h3>
                <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
                <p className="text-sm text-gray-500 mb-4">Date: {new Date(submission.created_at).toLocaleString()}</p>
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 text-left font-medium">Produit</th>
                            <th className="p-2 text-right font-medium">Quantité Soumise</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submission.items.map((item, index) => (
                            <tr key={`${item.productId}-${index}`} className="border-b">
                                <td className="p-2">{item.name}</td>
                                <td className="p-2 text-right font-semibold">{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);


// --- TABS ---
const StockIndicator: React.FC<{ stock: number; threshold: number; unit: string }> = ({ stock, threshold, unit }) => {
    const max = threshold > 0 ? threshold * 2.5 : 25; // Avoid division by zero and have a default max
    const percentage = Math.min((stock / max) * 100, 100);

    let barColor = 'bg-green-500';
    if (stock <= threshold) {
        barColor = 'bg-red-500';
    } else if (stock <= threshold * 1.5) {
        barColor = 'bg-yellow-500';
    }

    return (
        <div>
            <span className="font-mono text-sm font-medium text-gray-700">{stock} {unit}</span>
            <div title={`Seuil d'alerte: ${threshold}`} className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div
                    className={`h-full ${barColor} rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};


const InventoryTab: React.FC<{
    allProducts: Product[];
    stagedItems: InventoryItem[];
    setStagedItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    handleSubmitInventory: () => Promise<void>;
}> = ({ allProducts, stagedItems, setStagedItems, handleSubmitInventory }) => {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [filter, setFilter] = useState('');

    const filteredProducts = useMemo(() => {
        const searchTerm = filter.toLowerCase();
        if (!searchTerm) return allProducts;
        return allProducts.filter(p => p.name.toLowerCase().includes(searchTerm) || p.code?.toLowerCase().includes(searchTerm) || p.cas?.toLowerCase().includes(searchTerm));
    }, [allProducts, filter]);

    const handleQuantityChange = (productId: string, value: string) => {
        const num = parseInt(value, 10);
        setQuantities(prev => ({ ...prev, [productId]: isNaN(num) || num < 0 ? 0 : num }));
    };

    const handleStageItem = (product: Product) => {
        const quantity = quantities[product.id] || 0;
        if (quantity > 0 && !stagedItems.some(item => item.productId === product.id)) {
            setStagedItems(prev => [...prev, { productId: product.id, name: product.name, quantity }]);
            setQuantities(prev => ({...prev, [product.id]: 0})); // Reset input
        }
    };

    const handleUnstageItem = (productId: string) => {
        setStagedItems(prev => prev.filter(item => item.productId !== productId));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md border">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestion des Produits Chimiques</h3>
                <input
                    type="text"
                    placeholder="Filtrer par nom, code, CAS..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md mb-4"
                />
                <div className="overflow-x-auto border rounded-lg max-h-[60vh]">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">Image</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">Désignation</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">Code / CAS</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">Stock Global</th>
                                <th className="p-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">Quantité & Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p, index) => (
                                <tr key={p.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="p-2">
                                        <div className="h-12 w-12 flex items-center justify-center bg-gray-100 rounded-md">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover rounded-md"/>
                                        ) : (
                                            <PhotoIcon className="h-6 w-6 text-gray-400" />
                                        )}
                                        </div>
                                    </td>
                                    <td className="p-3 font-medium text-gray-800">{p.name}</td>
                                    <td className="p-3 text-gray-600">
                                        <div>{p.code}</div>
                                        <div className="text-xs text-gray-400">{p.cas}</div>
                                    </td>
                                    <td className="p-3">
                                        <StockIndicator stock={p.stock} threshold={p.alertThreshold} unit={p.unit} />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <input type="number" min="0" placeholder="0" value={quantities[p.id] || ''} onChange={(e) => handleQuantityChange(p.id, e.target.value)} className="w-20 p-1 border rounded-md" disabled={stagedItems.some(item => item.productId === p.id)} />
                                            <button onClick={() => handleStageItem(p)} className="p-2 rounded-full text-green-600 hover:bg-green-100 disabled:text-gray-400 disabled:hover:bg-transparent" title="Ajouter à la liste" disabled={stagedItems.some(item => item.productId === p.id) || !quantities[p.id] || quantities[p.id] === 0}>
                                                <PlusCircleIcon className="h-6 w-6"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border">
                <h3 className="text-xl font-bold text-ipt-blue mb-4">Liste à Soumettre</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4 border-y py-2">
                    {stagedItems.length > 0 ? stagedItems.map(item => (
                        <div key={item.productId} className="flex justify-between items-center p-2 bg-blue-50 rounded-md animate-fade-in">
                            <div><p className="font-medium text-blue-800">{item.name}</p><p className="text-sm text-blue-600">Quantité: {item.quantity}</p></div>
                            <button onClick={() => handleUnstageItem(item.productId)} className="p-1 rounded-full text-red-500 hover:bg-red-100"><TrashIcon className="h-5 w-5"/></button>
                        </div>
                    )) : <p className="text-gray-500 text-sm text-center py-4">Ajoutez des produits depuis le catalogue de gauche.</p>}
                </div>
                <button onClick={handleSubmitInventory} disabled={stagedItems.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-gray-400 disabled:cursor-not-allowed"><SendIcon className="h-5 w-5" />Envoyer la Liste à l'Administration</button>
            </div>
        </div>
    );
};

const StockExitTab: React.FC<{
    currentUser: User;
    depotProducts: Product[];
}> = ({ currentUser, depotProducts }) => {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [filter, setFilter] = useState('');
    const { addNotification } = useNotification();

    const filteredProducts = useMemo(() => {
        return depotProducts.filter(p => p.stock > 0 && (p.name.toLowerCase().includes(filter.toLowerCase()) || p.code?.toLowerCase().includes(filter.toLowerCase())));
    }, [depotProducts, filter]);
    
    const handleConsumption = async (product: Product) => {
        const quantity = quantities[product.id];
        if (!quantity || quantity <= 0) {
            addNotification("Veuillez entrer une quantité valide.", 'error');
            return;
        }
        if (quantity > product.stock) {
            addNotification("La quantité de sortie dépasse le stock disponible.", 'error');
            return;
        }

        if (window.confirm(`Confirmer la sortie de ${quantity} ${product.unit} de ${product.name} ?`)) {
            const { error } = await dataService.depotRecordConsumption(product, quantity, currentUser);
            if (error) {
                addNotification(`Erreur: ${error.message}`, 'error');
            } else {
                addNotification("Sortie de stock enregistrée avec succès.", 'success');
                setQuantities(prev => ({ ...prev, [product.id]: 0 }));
            }
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Enregistrer une Sortie de Stock (Consommation)</h3>
            <p className="text-sm text-gray-500 mb-4">Enregistrez ici les produits que vous utilisez. Le stock de votre dépôt sera mis à jour automatiquement.</p>
            <input
                type="text"
                placeholder="Filtrer vos produits en stock..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
            />
            <div className="overflow-x-auto border rounded-lg max-h-[60vh]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="p-2">Produit</th>
                            <th className="p-2">Stock Actuel</th>
                            <th className="p-2">Action de Sortie</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((p, index) => (
                            <tr key={p.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="p-2 font-medium">{p.name}</td>
                                <td className="p-2">{p.stock} {p.unit}</td>
                                <td className="p-2">
                                    <div className="flex items-center gap-1">
                                        <input 
                                            type="number" 
                                            min="1"
                                            max={p.stock}
                                            placeholder="Qté" 
                                            value={quantities[p.id] || ''} 
                                            onChange={(e) => setQuantities(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))} 
                                            className="w-20 p-1 border rounded-md" 
                                        />
                                        <button onClick={() => handleConsumption(p)} className="p-2 text-ipt-blue hover:bg-blue-100 rounded-full" title="Enregistrer la sortie">
                                            <SendIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatisticsTab: React.FC<{ depotProducts: Product[]; depotName: string; }> = ({ depotProducts, depotName }) => {
    const totalStock = useMemo(() => depotProducts.reduce((sum, p) => sum + p.stock, 0), [depotProducts]);
    const lowStockCount = useMemo(() => depotProducts.filter(p => p.stock <= p.alertThreshold).length, [depotProducts]);
    const top5Products = useMemo(() => [...depotProducts].sort((a,b) => b.stock - a.stock).slice(0, 5), [depotProducts]);
    const maxValue = top5Products[0]?.stock || 0;
    
    const handleDownloadStockSheet = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Code,Désignation,CAS,Formule,Stock,Unité,Seuil Alerte,Date Expiration\n";
        depotProducts.forEach(p => {
            const row = [p.code, `"${p.name.replace(/"/g, '""')}"`, p.cas, p.formula, p.stock, p.unit, p.alertThreshold, p.expiryDate].join(',');
            csvContent += row + "\r\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `fiche_de_stock_${depotName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
                 <div className="p-4 bg-white rounded-lg shadow-md border"><p className="text-gray-600">Produits Uniques</p><p className="text-3xl font-bold text-ipt-blue">{depotProducts.length}</p></div>
                 <div className="p-4 bg-white rounded-lg shadow-md border"><p className="text-gray-600">Quantité Totale en Stock</p><p className="text-3xl font-bold text-ipt-blue">{totalStock.toLocaleString()}</p></div>
                 <div className="p-4 bg-white rounded-lg shadow-md border"><p className="text-gray-600">Produits en Alerte</p><p className="text-3xl font-bold text-red-500">{lowStockCount}</p></div>
                 <button onClick={handleDownloadStockSheet} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition shadow">
                    <DocumentArrowDownIcon className="h-5 w-5"/> Télécharger la Fiche de Stock (CSV)
                </button>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md border">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 des Produits en Stock</h3>
                <div className="space-y-3">
                {top5Products.map(item => (
                    <div key={item.id}><span className="text-sm text-gray-600">{item.name}</span>
                        <div className="bg-gray-200 rounded-full h-5 mt-1">
                            <div className="bg-ipt-blue h-5 rounded-full text-white text-xs flex items-center justify-end pr-2" style={{ width: `${maxValue > 0 ? (item.stock / maxValue) * 100 : 0}%` }}>{item.stock}</div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
};

const HistoryTab: React.FC<{
    depotSubmissions: InventorySubmission[];
    onViewDetails: (submission: InventorySubmission) => void;
}> = ({ depotSubmissions, onViewDetails }) => {
    const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    return (
        <div className="bg-white p-4 rounded-lg shadow-md border">
             <div className="overflow-x-auto border rounded-lg max-h-[70vh]">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 sticky top-0"><tr className="border-b"><th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold">Articles</th><th className="p-3 font-semibold">Statut</th><th className="p-3 font-semibold">Action</th></tr></thead>
                    <tbody>
                        {depotSubmissions.length > 0 ? depotSubmissions.map((s, i) => (
                             <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="p-3">{new Date(s.created_at).toLocaleString()}</td>
                                <td className="p-3">{s.items.length}</td>
                                <td className="p-3"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(s.status)}`}>{s.status === 'pending' ? 'En attente' : s.status === 'approved' ? 'Approuvé' : 'Rejeté'}</span></td>
                                <td className="p-3"><button onClick={() => onViewDetails(s)} className="text-ipt-blue hover:underline text-sm font-medium">Détails</button></td>
                            </tr>
                        )) : <tr><td colSpan={4} className="text-center p-8 text-gray-500">Aucun historique de soumission.</td></tr>}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

const SupportTab: React.FC<{ currentUser: User; conversationId: string }> = ({ currentUser, conversationId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages(conversationId).then(({ messages }) => setMessages(messages || []));
        const subscription = subscribeToMessages(conversationId, (newMsg) => {
            setMessages(prev => [...prev, newMsg]);
        });
        return () => subscription.unsubscribe();
    }, [conversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        await sendMessage(currentUser.email, currentUser.firstName, conversationId, newMessage);
        setNewMessage('');
    };

    return (
        <div className="bg-white rounded-lg shadow-md border h-[75vh] flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === currentUser.email ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col max-w-lg ${msg.sender_id === currentUser.email ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl ${msg.sender_id === currentUser.email ? 'bg-ipt-blue text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                            {msg.sender_id !== currentUser.email && <p className="font-bold text-sm text-ipt-light-blue">{msg.sender_name}</p>}
                            <p className="text-base whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 px-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            ))}
             <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50 flex items-center gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Écrivez votre message..." className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-ipt-blue" />
                <button type="submit" className="p-3 bg-ipt-blue text-white rounded-full hover:bg-ipt-light-blue transition disabled:bg-gray-400" disabled={!newMessage.trim()}><SendIcon className="h-5 w-5" /></button>
            </form>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface DepotInventoryProps {
    currentUser: User;
    allProducts: Product[];
    allSubmissions: InventorySubmission[];
}

const DepotInventory: React.FC<DepotInventoryProps> = ({ currentUser, allProducts, allSubmissions }) => {
    const [stagedItems, setStagedItems] = useState<InventoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<DepotTab>('inventaire');
    const [viewingSubmission, setViewingSubmission] = useState<InventorySubmission | null>(null);
    const { addNotification } = useNotification();

    const depotId = currentUser.email.split('@')[0];

    const depotProducts = useMemo(() => allProducts.filter(p => p.location === currentUser.service), [allProducts, currentUser.service]);
    const depotSubmissions = useMemo(() => allSubmissions.filter(s => s.depotId === depotId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [allSubmissions, depotId]);
    
    const generateAndDownloadCsv = (items: InventoryItem[]) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Code Produit,Désignation,Quantité Soumise,Unité\n";

        items.forEach(item => {
            const productDetails = allProducts.find(p => p.id === item.productId);
            const code = productDetails?.code || 'N/A';
            const name = `"${item.name.replace(/"/g, '""')}"`; // Handle quotes in names
            const quantity = item.quantity;
            const unit = productDetails?.unit || 'N/A';
            csvContent += `${code},${name},${quantity},${unit}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `soumission_inventaire_${currentUser.service.replace(/\s+/g, '_')}_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubmitInventory = async () => {
        if (stagedItems.length === 0) {
            addNotification("Veuillez ajouter au moins un article.", 'error');
            return;
        }
        
        // Generate and download CSV for the user
        generateAndDownloadCsv(stagedItems);
        
        // Submit data to the backend for admin approval
        const { error } = await dataService.addSubmission({
            depotId,
            depotName: currentUser.service,
            items: stagedItems,
            status: 'pending'
        });

        if (error) {
            addNotification("La soumission de l'inventaire a échoué. Le fichier CSV a quand même été téléchargé.", 'error');
        } else {
            const conversationId = `depot_${depotId}`;
            await sendMessage(currentUser.email, currentUser.firstName, conversationId, `Nouvelle soumission d'inventaire avec ${stagedItems.length} article(s) prête pour validation.`);
            addNotification("Inventaire soumis avec succès pour validation. Votre fichier CSV a été téléchargé.", 'success');
            setStagedItems([]);
        }
    };

    const tabs: { id: DepotTab; label: string; icon: React.ReactNode }[] = [
        { id: 'inventaire', label: 'Inventaire', icon: <InventoryIcon className="h-5 w-5" /> },
        { id: 'sortie_stock', label: 'Sortie de Stock', icon: <SendIcon className="h-5 w-5" /> },
        { id: 'statistiques', label: 'Statistiques', icon: <ChartBarIcon className="h-5 w-5" /> },
        { id: 'historique', label: 'Historique', icon: <HistoryIcon className="h-5 w-5" /> },
        { id: 'support', label: 'Support', icon: <ChatBubbleIcon className="h-5 w-5" /> },
    ];
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'inventaire':
                return <InventoryTab allProducts={allProducts} stagedItems={stagedItems} setStagedItems={setStagedItems} handleSubmitInventory={handleSubmitInventory} />;
            case 'sortie_stock':
                return <StockExitTab currentUser={currentUser} depotProducts={depotProducts} />;
            case 'statistiques':
                return <StatisticsTab depotProducts={depotProducts} depotName={currentUser.service} />;
            case 'historique':
                return <HistoryTab depotSubmissions={depotSubmissions} onViewDetails={setViewingSubmission} />;
            case 'support':
                return <SupportTab currentUser={currentUser} conversationId={`depot_${depotId}`} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Tableau de Bord du Dépôt : <span className="text-ipt-blue">{currentUser.service}</span></h2>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${activeTab === tab.id ? 'border-ipt-blue text-ipt-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} group inline-flex items-center py-3 px-1 border-b-2 font-medium text-base transition-colors`}>
                           {tab.icon} <span className="ml-2">{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="animate-fade-in">
                {renderTabContent()}
            </div>

            {viewingSubmission && <SubmissionDetailModal submission={viewingSubmission} onClose={() => setViewingSubmission(null)} />}
        </div>
    );
};

export default DepotInventory;