import React, { useState, useMemo } from 'react';
import { type StockMovement, type Product, type Depot } from '../types';
import { HistoryIcon, DocumentArrowDownIcon, ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';

interface MovementHistoryProps {
    stockMovements: StockMovement[];
    allProducts: Product[];
    depots: Depot[];
}

const movementTypeLabels: Record<string, string> = {
    initial: 'Stock Initial',
    update: 'Mise à jour manuelle',
    correction: 'Correction',
    import: 'Import CSV',
    submission: 'Soumission Dépôt',
    consumption: 'Sortie Dépôt',
    admin_entry: 'Entrée Admin',
    admin_exit: 'Sortie Admin',
    inventory_count: 'Inventaire Admin'
};

const convertToCSV = (data: Record<string, any>[], columnHeaders: string[]) => {
    const headerRow = columnHeaders.join(',');
    const rows = data.map(row =>
        columnHeaders.map(header => {
            const key = Object.keys(row).find(k => k.toLowerCase().replace(/[\s\W]/g, '') === header.toLowerCase().replace(/[\s\W]/g, ''));
            const value = key ? String(row[key] ?? '') : '';
            return `"${value.replace(/"/g, '""')}"`;
        }).join(',')
    );
    return [headerRow, ...rows].join('\n');
};


const MovementHistory: React.FC<MovementHistoryProps> = ({ stockMovements, allProducts, depots }) => {
    const [filterDepot, setFilterDepot] = useState('');
    const [filterType, setFilterType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    const productMap = useMemo(() => new Map(allProducts.map(p => [p.id, p])), [allProducts]);
    const enrichedMovements = useMemo(() => {
        return stockMovements.map(movement => ({
            ...movement,
            location: productMap.get(movement.product_id)?.location || 'Inconnu',
        }));
    }, [stockMovements, productMap]);

    const filteredMovements = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        return enrichedMovements.filter(m => {
            const depotMatch = !filterDepot || m.location === filterDepot;
            const typeMatch = !filterType || m.change_type === filterType;
            const searchMatch = !searchTerm ||
                m.product_name.toLowerCase().includes(lowercasedSearchTerm) ||
                m.transaction_ref.toLowerCase().includes(lowercasedSearchTerm);
            return depotMatch && typeMatch && searchMatch;
        });
    }, [enrichedMovements, filterDepot, filterType, searchTerm]);

    const totalPages = Math.ceil(filteredMovements.length / ITEMS_PER_PAGE);
    const paginatedMovements = filteredMovements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleExportCSV = () => {
        const headers = ['Date', 'Depot', 'Produit', 'Type Mouvement', 'Quantite', 'Par', 'Nouveau Stock', 'Reference'];
        const dataToExport = filteredMovements.map(m => ({
            'Date': new Date(m.created_at).toLocaleString(),
            'Depot': m.location,
            'Produit': m.product_name,
            'Type Mouvement': movementTypeLabels[m.change_type] || m.change_type,
            'Quantite': m.quantity_change,
            'Par': m.user_name,
            'Nouveau Stock': m.new_stock_level,
            'Reference': m.transaction_ref
        }));
        
        const csv = convertToCSV(dataToExport, headers);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `historique_mouvements_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const uniqueMovementTypes = [...new Set(stockMovements.map(m => m.change_type))];

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <HistoryIcon className="h-7 w-7 text-ipt-blue"/> Historique des Mouvements
                </h2>
                <button
                    onClick={handleExportCSV}
                    disabled={filteredMovements.length === 0}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition shadow flex items-center gap-2 disabled:bg-gray-400"
                >
                    <DocumentArrowDownIcon className="h-5 w-5" /> Télécharger en CSV
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                    <label htmlFor="depot-filter" className="block text-sm font-medium text-gray-700">Filtrer par Dépôt</label>
                    <select id="depot-filter" value={filterDepot} onChange={e => { setFilterDepot(e.target.value); setCurrentPage(1); }} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                        <option value="">Tous les dépôts</option>
                        {depots.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">Filtrer par Type</label>
                    <select id="type-filter" value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
                        <option value="">Tous les types</option>
                        {uniqueMovementTypes.map(type => <option key={type} value={type}>{movementTypeLabels[type] || type}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700">Rechercher</label>
                    <input
                        id="search-filter"
                        type="text"
                        placeholder="Produit, référence..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"
                    />
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600">Date</th>
                            <th className="p-3 font-semibold text-gray-600">Dépôt/Labo</th>
                            <th className="p-3 font-semibold text-gray-600">Produit</th>
                            <th className="p-3 font-semibold text-gray-600">Mouvement</th>
                            <th className="p-3 font-semibold text-gray-600">Quantité</th>
                            <th className="p-3 font-semibold text-gray-600">Par</th>
                            <th className="p-3 font-semibold text-gray-600">Nouveau Stock</th>
                            <th className="p-3 font-semibold text-gray-600">Réf. Mouvement</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedMovements.length > 0 ? paginatedMovements.map(m => (
                             <tr key={m.id} className="border-t hover:bg-gray-50">
                                <td className="p-2 whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                                <td className="p-2 text-gray-600">{m.location}</td>
                                <td className="p-2 font-medium">{m.product_name}</td>
                                <td className="p-2">{movementTypeLabels[m.change_type] || m.change_type}</td>
                                <td className={`p-2 font-bold ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                                </td>
                                <td className="p-2 text-gray-600">{m.user_name}</td>
                                <td className="p-2 font-semibold">{m.new_stock_level}</td>
                                <td className="p-2 font-mono text-xs">{m.transaction_ref}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="text-center p-8 text-gray-500">Aucun mouvement ne correspond à vos critères.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-700">
                    Page {currentPage} sur {totalPages > 0 ? totalPages : 1} ({filteredMovements.length} résultats)
                </span>
                <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100">
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-md disabled:opacity-50 hover:bg-gray-100">
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MovementHistory;
