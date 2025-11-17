import React, { useState, useMemo, useEffect } from 'react';
import { type User, type Depot, type Product } from '../types';
import { useNotification } from '../context/NotificationContext';
import { setDepotInventory } from '../services/dataService';
import { InventoryIcon, SendIcon } from './icons/Icons';

interface InventoryRow {
    product: Product;
    currentStock: number;
    newStock: string;
}

const DepotStockManager: React.FC<{
    currentUser: User;
    depots: Depot[];
    allProducts: Product[];
}> = ({ currentUser, depots, allProducts }) => {
    const [selectedDepotId, setSelectedDepotId] = useState<string>('');
    const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addNotification } = useNotification();

    const activeDepots = useMemo(() => depots.filter(d => d.active).sort((a, b) => a.name.localeCompare(b.name)), [depots]);

    useEffect(() => {
        if (!selectedDepotId) {
            setInventoryRows([]);
            return;
        }

        const selectedDepot = depots.find(d => d.id === selectedDepotId);
        if (!selectedDepot) return;

        // Create a unique list of products based on their code (the true identifier of a product type)
        const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.code, p])).values())
            .sort((a: Product, b: Product) => a.name.localeCompare(b.name));
        
        const rows = uniqueProducts.map((masterProduct: Product) => {
            const productInDepot = allProducts.find(p => p.code === masterProduct.code && p.location === selectedDepot.name);
            const currentStock = productInDepot?.stock ?? 0;
            return {
                product: masterProduct,
                currentStock,
                newStock: String(currentStock),
            };
        });

        setInventoryRows(rows);
    }, [selectedDepotId, allProducts, depots]);

    const handleStockChange = (productCode: string, value: string) => {
        setInventoryRows(prevRows => 
            prevRows.map(row => 
                row.product.code === productCode ? { ...row, newStock: value } : row
            )
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedDepot = depots.find(d => d.id === selectedDepotId);
        if (!selectedDepot) {
            addNotification("Veuillez sélectionner un dépôt valide.", 'error');
            return;
        }

        const itemsToUpdate = inventoryRows
            .filter(row => row.currentStock !== Number(row.newStock))
            .map(row => ({
                product: row.product,
                newStock: Number(row.newStock),
            }))
            .filter(item => !isNaN(item.newStock) && item.newStock >= 0);

        if (itemsToUpdate.length === 0) {
            addNotification("Aucun changement de stock n'a été détecté.", 'info');
            return;
        }

        setIsSubmitting(true);
        const { error } = await setDepotInventory(selectedDepot.name, itemsToUpdate, currentUser);
        
        if (error) {
            addNotification(`Erreur lors de la mise à jour de l'inventaire: ${error.message}`, 'error');
        } else {
            addNotification(`L'inventaire pour ${selectedDepot.name} a été mis à jour avec succès pour ${itemsToUpdate.length} produit(s).`, 'success');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <InventoryIcon className="h-7 w-7 text-ipt-blue"/>
                Gestion de l'Inventaire des Dépôts
            </h2>
            <p className="text-gray-600 mb-6">
                Sélectionnez un dépôt pour définir son inventaire. Cette action remplacera les quantités existantes et créera de nouvelles fiches produits si nécessaire.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end md:gap-4 space-y-4 md:space-y-0">
                    <div className="flex-grow">
                        <label htmlFor="depot-select" className="block text-sm font-medium text-gray-700">Sélectionner un Dépôt</label>
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
                     <button type="submit" className="w-full md:w-auto flex justify-center items-center gap-2 px-6 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-gray-400" disabled={isSubmitting || !selectedDepotId}>
                        {isSubmitting ? 'Enregistrement...' : <> <SendIcon className="h-5 w-5"/> Mettre à Jour l'Inventaire </>}
                    </button>
                </div>

                {selectedDepotId && (
                    <div className="overflow-x-auto border rounded-lg max-h-[60vh]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2">Produit</th>
                                    <th className="p-2">Stock Actuel</th>
                                    <th className="p-2 w-32">Nouveau Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryRows.map(row => (
                                    <tr key={row.product.id} className="border-t">
                                        <td className="p-2 font-medium">{row.product.name} <span className="text-gray-400 font-normal">({row.product.code})</span></td>
                                        <td className="p-2 text-gray-600">{row.currentStock} {row.product.unit}</td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={row.newStock}
                                                onChange={(e) => handleStockChange(row.product.code, e.target.value)}
                                                className={`w-full p-1 border rounded-md ${Number(row.newStock) !== row.currentStock ? 'border-ipt-blue bg-blue-50' : 'border-gray-300'}`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </form>
        </div>
    );
};

export default DepotStockManager;
