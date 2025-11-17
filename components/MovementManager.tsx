import React, { useState, useMemo, useEffect } from 'react';
import { type User, type Depot, type Product, type StockMovement } from '../types';
import { useNotification } from '../context/NotificationContext';
import * as dataService from '../services/dataService';
import { ArrowDownIcon, ArrowUpIcon, HistoryIcon, SendIcon } from './icons/Icons';

const MovementManager: React.FC<{
    currentUser: User;
    depots: Depot[];
    products: Product[];
    stockMovements: StockMovement[];
}> = ({ currentUser, depots, products, stockMovements }) => {
    const [selectedDepotId, setSelectedDepotId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<number | string>('');
    const [movementType, setMovementType] = useState<'admin_entry' | 'admin_exit'>('admin_entry');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addNotification } = useNotification();

    const activeDepots = useMemo(() => depots.filter(d => d.active).sort((a, b) => a.name.localeCompare(b.name)), [depots]);
    
    const selectedDepotName = useMemo(() => {
        return depots.find(d => String(d.id) === selectedDepotId)?.name;
    }, [depots, selectedDepotId]);

    const depotProducts = useMemo(() => {
        if (!selectedDepotName) return [];
        
        // Use a robust, case-insensitive, and trim-safe comparison on the depot name
        return products.filter(p => 
            p.location && p.location.trim().toLowerCase() === selectedDepotName.trim().toLowerCase()
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [products, selectedDepotName]);

    const depotMovements = useMemo(() => {
        if (!selectedDepotId) return [];
        const depotProductIds = depotProducts.map(p => p.id);
        return stockMovements
            .filter(m => depotProductIds.includes(m.product_id))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 15);
    }, [stockMovements, selectedDepotId, depotProducts]);

    useEffect(() => {
        // Reset product selection when depot changes
        setSelectedProductId('');
        setQuantity('');
    }, [selectedDepotId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDepotId || !selectedProductId || !quantity || Number(quantity) <= 0) {
            addNotification("Veuillez remplir tous les champs avec une quantité valide.", 'error');
            return;
        }

        setIsSubmitting(true);
        const { error } = await dataService.adminCreateMovement(selectedProductId, Number(quantity), movementType, currentUser);
        
        if (error) {
            addNotification(`Erreur: ${error.message}`, 'error');
        } else {
            addNotification("Mouvement de stock enregistré avec succès.", 'success');
            // Reset form
            setSelectedProductId('');
            setQuantity('');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestion des Mouvements de Stock</h2>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Depot Selector */}
                    <div className="lg:col-span-1">
                        <label htmlFor="depot-select" className="block text-sm font-medium text-gray-700">1. Sélectionner un Dépôt</label>
                        <select
                            id="depot-select"
                            value={selectedDepotId}
                            onChange={e => setSelectedDepotId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue sm:text-sm rounded-md"
                        >
                            <option value="">-- Choisissez un dépôt --</option>
                            {activeDepots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    {/* Product Selector */}
                    <div className="lg:col-span-1">
                        <label htmlFor="product-select" className="block text-sm font-medium text-gray-700">2. Sélectionner un Produit</label>
                        <select
                            id="product-select"
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                            disabled={!selectedDepotId}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue sm:text-sm rounded-md disabled:bg-gray-100"
                        >
                            <option value="">{selectedDepotId ? '-- Choisissez un produit --' : 'Sélectionnez un dépôt'}</option>
                            {depotProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                             {selectedDepotId && depotProducts.length === 0 && (
                                <option value="" disabled>Aucun produit trouvé pour ce dépôt</option>
                            )}
                        </select>
                    </div>

                    {/* Quantity and Type */}
                    <div className="lg:col-span-1">
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">3. Quantité & Type</label>
                        <div className="mt-1 flex items-center">
                             <input 
                                id="quantity"
                                type="number" 
                                min="1"
                                placeholder="Qté" 
                                value={quantity} 
                                onChange={(e) => setQuantity(e.target.value)} 
                                className="w-24 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue"
                                disabled={!selectedProductId}
                            />
                            <div className="flex">
                                <button type="button" onClick={() => setMovementType('admin_entry')} className={`px-3 py-2 flex items-center gap-1 border-t border-b border-gray-300 ${movementType === 'admin_entry' ? 'bg-green-100 text-green-700 z-10 ring-1 ring-green-300' : 'bg-white hover:bg-gray-50'}`} title="Entrée (BE)">
                                    <ArrowUpIcon className="h-4 w-4"/> BE
                                </button>
                                <button type="button" onClick={() => setMovementType('admin_exit')} className={`px-3 py-2 flex items-center gap-1 -ml-px border border-gray-300 rounded-r-md ${movementType === 'admin_exit' ? 'bg-red-100 text-red-700 z-10 ring-1 ring-red-300' : 'bg-white hover:bg-gray-50'}`} title="Sortie (BS)">
                                    <ArrowDownIcon className="h-4 w-4"/> BS
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Submit Button */}
                    <div className="lg:col-span-1">
                         <button type="submit" className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-gray-400" disabled={isSubmitting || !selectedProductId || !quantity}>
                            {isSubmitting ? 'Enregistrement...' : <> <SendIcon className="h-5 w-5"/> Valider Mouvement </>}
                        </button>
                    </div>
                </form>
            </div>

            {selectedDepotId && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <HistoryIcon className="h-6 w-6"/> Historique Récent pour: <span className="text-ipt-blue">{selectedDepotName}</span>
                    </h3>
                     <div className="overflow-x-auto border rounded-lg max-h-96">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Produit</th>
                                    <th className="p-2">Mouvement</th>
                                    <th className="p-2">Par</th>
                                    <th className="p-2">Nouveau Stock</th>
                                    <th className="p-2">Référence (BE/BS)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {depotMovements.length > 0 ? depotMovements.map(m => (
                                    <tr key={m.id} className="border-t">
                                        <td className="p-2 whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                                        <td className="p-2 font-medium">{m.product_name}</td>
                                        <td className={`p-2 font-bold ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                                        </td>
                                        <td className="p-2 text-gray-600">{m.user_name}</td>
                                        <td className="p-2 font-semibold">{m.new_stock_level}</td>
                                        <td className="p-2 font-mono text-xs text-gray-500">{m.transaction_ref}</td>
                                    </tr>
                                )) : <tr><td colSpan={6} className="p-4 text-center text-gray-500">Aucun mouvement récent pour ce dépôt.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovementManager;
