import React, { useState, useMemo, useEffect } from 'react';
import { type Depot, type Product, type InventorySubmission, Role, StockMovement } from '../types';
import { CloseIcon, PencilIcon, InformationCircleIcon, PlusCircleIcon } from './icons/Icons';
import { updateDepot, addDepot } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';

// Modal to edit depot
const DepotModal: React.FC<{ depot: Depot | null; onClose: () => void; onSave: (depot: Depot) => Promise<void> }> = ({ depot, onClose, onSave }) => {
    const [formData, setFormData] = useState<Depot | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(depot);
    }, [depot]);

    if (!depot || !formData) return null;

    const isNew = !depot.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: type === 'checkbox' ? checked : value } as Depot : null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            setIsSaving(true);
            await onSave(formData);
            setIsSaving(false);
        }
    };

    const inputStyle = "mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm";
    const labelStyle = "block text-sm font-medium text-gray-700";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue">{isNew ? 'Créer un Dépôt/Labo' : 'Modifier le Dépôt/Labo'}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    {isNew && (
                        <div>
                            <label htmlFor="id" className={labelStyle}>ID (Code unique, ex: 95)</label>
                            <input type="text" id="id" name="id" value={formData.id} onChange={handleChange} className={inputStyle} required />
                        </div>
                    )}
                    <div>
                        <label htmlFor="name" className={labelStyle}>Nom</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={inputStyle} required />
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <label htmlFor="color" className={labelStyle}>Couleur</label>
                            <input type="color" id="color" name="color" value={formData.color} onChange={handleChange} className="mt-1 h-10 w-14" />
                        </div>
                        <div className="flex items-center pt-6">
                            <input type="checkbox" id="active" name="active" checked={formData.active} onChange={handleChange} className="h-4 w-4 text-ipt-blue border-gray-300 rounded focus:ring-ipt-blue" />
                            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">Actif</label>
                        </div>
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


// Depot Detail Modal
const DepotDetailModal: React.FC<{
    depot: Depot;
    onClose: () => void;
    allProducts: Product[];
    allStockMovements: StockMovement[];
}> = ({ depot, onClose, allProducts, allStockMovements }) => {

    const depotProducts = useMemo(() => {
        return allProducts.filter(p => p.location === depot.name);
    }, [allProducts, depot.name]);
    
    const depotMovements = useMemo(() => {
        // Find all product IDs that are located in this depot
        const depotProductIds = allProducts.filter(p => p.location === depot.name).map(p => p.id);
        
        return allStockMovements
            .filter(m => depotProductIds.includes(m.product_id))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20); // Show last 20 movements
    }, [allStockMovements, allProducts, depot.name]);


    const totalStock = useMemo(() => {
        return depotProducts.reduce((sum, p) => sum + p.stock, 0);
    }, [depotProducts]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue">Détails du Dépôt: <span className="font-normal">{depot.name}</span></h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-600">Produits Uniques</p>
                            <p className="text-3xl font-bold text-blue-800">{depotProducts.length}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-600">Quantité Totale en Stock</p>
                            <p className="text-3xl font-bold text-green-800">{totalStock.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Product List */}
                    <div>
                        <h4 className="font-semibold text-lg text-gray-800 mb-2">Produits en Stock</h4>
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 font-medium">Code</th>
                                        <th className="p-2 font-medium">Nom</th>
                                        <th className="p-2 font-medium text-right">Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {depotProducts.length > 0 ? depotProducts.map(p => (
                                        <tr key={p.id} className="border-t">
                                            <td className="p-2">{p.code}</td>
                                            <td className="p-2 font-semibold">{p.name}</td>
                                            <td className="p-2 text-right font-mono">{p.stock} {p.unit}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="text-center p-4 text-gray-500">Aucun produit trouvé pour ce dépôt.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Movement History */}
                     <div>
                        <h4 className="font-semibold text-lg text-gray-800 mb-2">Historique des Mouvements</h4>
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                           <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 font-medium">Date</th>
                                        <th className="p-2 font-medium">Produit</th>
                                        <th className="p-2 font-medium">Mouvement</th>
                                        <th className="p-2 font-medium">Par</th>
                                        <th className="p-2 font-medium">Réf. Mouvement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {depotMovements.length > 0 ? depotMovements.map(m => (
                                        <tr key={m.id} className="border-t">
                                            <td className="p-2 whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                                            <td className="p-2 font-semibold">{m.product_name}</td>
                                            <td className={`p-2 font-bold ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                                            </td>
                                            <td className="p-2">{m.user_name}</td>
                                            <td className="p-2 font-mono text-xs">{m.transaction_ref}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="text-center p-4 text-gray-500">Aucun mouvement récent.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};


interface DepotsProps {
    depots: Depot[];
    setDepots: (depots: Depot[]) => void;
    isLoading: boolean;
    allProducts: Product[];
    allSubmissions: InventorySubmission[];
    allStockMovements: StockMovement[];
}

const Depots: React.FC<DepotsProps> = ({ depots, setDepots, isLoading, allProducts, allSubmissions, allStockMovements }) => {
    const [filter, setFilter] = useState('');
    const [depotToEdit, setDepotToEdit] = useState<Depot | null>(null);
    const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
    const { addNotification } = useNotification();

    const filteredDepots = useMemo(() => {
        return depots.filter(d => 
            d.name.toLowerCase().includes(filter.toLowerCase()) || 
            d.id.toString().includes(filter)
        );
    }, [depots, filter]);

    const handleCreateClick = () => {
        setDepotToEdit({
            id: '',
            name: '',
            color: '#3498db', // Default color
            active: true,
            role: Role.Depot,
        });
    };

    const handleSave = async (depotData: Depot) => {
        const isNew = !depotToEdit?.id;

        const { error } = isNew ? await addDepot(depotData) : await updateDepot(depotData);

        if (error) {
            addNotification(`Erreur: ${error.message}`, 'error');
        } else {
            addNotification(`Dépôt ${isNew ? 'créé' : 'mis à jour'} avec succès.`, 'success');
            setDepotToEdit(null);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Gestion des Dépôts & Laboratoires</h2>
                <button 
                    onClick={handleCreateClick} 
                    className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow flex items-center gap-2"
                >
                    <PlusCircleIcon className="h-5 w-5" /> Créer un Dépôt
                </button>
            </div>
            <input
                type="text"
                placeholder="Filtrer par nom ou ID..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md mb-4"
            />
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                            <th className="p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-gray-500">
                                    Chargement des dépôts...
                                </td>
                            </tr>
                        ) : filteredDepots.map((d, index) => (
                            <tr key={d.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-ipt-gold/10`}>
                                <td className="p-4 font-medium text-gray-800">
                                    <div className="flex items-center gap-3">
                                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: d.color }}></span>
                                        {d.id}
                                    </div>
                                </td>
                                <td className="p-4 text-gray-700">{d.name}</td>
                                <td className="p-4">
                                     <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${d.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {d.active ? 'Actif' : 'Inactif'}
                                    </span>
                                </td>
                                <td className="p-4 space-x-1 whitespace-nowrap">
                                    <button onClick={() => setSelectedDepot(d)} className="p-2 rounded-full transition-colors text-gray-500 hover:bg-gray-200" title="Voir les détails">
                                        <InformationCircleIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => setDepotToEdit(d)} className="p-2 rounded-full transition-colors text-gray-500 hover:bg-gray-200" title="Modifier">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <DepotModal depot={depotToEdit} onClose={() => setDepotToEdit(null)} onSave={handleSave} />
            {selectedDepot && <DepotDetailModal depot={selectedDepot} onClose={() => setSelectedDepot(null)} allProducts={allProducts} allStockMovements={allStockMovements} />}
        </div>
    );
};

export default Depots;