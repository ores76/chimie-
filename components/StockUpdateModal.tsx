import React, { useState } from 'react';
import { type Product, type User } from '../types';
import { CloseIcon, DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './icons/Icons';
import { useNotification } from '../context/NotificationContext';
import { updateProduct } from '../services/dataService';

// Définit la structure d'une ligne parsée depuis le CSV pour la prévisualisation
interface ParsedRow {
    rowIndex: number;
    code: string;
    name: string;
    stock: number;
    status: 'ready' | 'not_found' | 'invalid_stock' | 'no_change';
    originalProduct?: Product;
}

const StockUpdateModal: React.FC<{
    onClose: () => void;
    allProducts: Product[];
    currentUser: User;
}> = ({ onClose, allProducts, currentUser }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const { addNotification } = useNotification();

    const handleFileChange = async (selectedFile: File | null) => {
        if (!selectedFile) return;
        if (!selectedFile.name.endsWith('.csv')) {
            addNotification("Veuillez sélectionner un fichier au format CSV.", 'error');
            return;
        }
        setFile(selectedFile);
        setIsLoading(true);
        setParsedData([]);

        try {
            const text = await selectedFile.text();
            // Gère les fins de ligne Windows (\r\n) et Unix (\n)
            const rows = text.split(/\r?\n/).slice(1);
            const processedRows: ParsedRow[] = [];
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row.trim()) continue;

                // Simple parsing, assume no commas in names
                const [code, name, stockStr] = row.split(',').map(s => s.trim().replace(/"/g, ''));
                const stock = parseInt(stockStr, 10);

                const originalProduct = allProducts.find(p => p.code === code);
                let status: ParsedRow['status'] = 'ready';

                if (!originalProduct) {
                    status = 'not_found';
                } else if (isNaN(stock) || stock < 0) {
                    status = 'invalid_stock';
                } else if (originalProduct.stock === stock) {
                    status = 'no_change';
                }

                processedRows.push({
                    rowIndex: i,
                    code,
                    name,
                    stock,
                    status,
                    originalProduct,
                });
            }
            setParsedData(processedRows);

        } catch (error) {
            addNotification("Erreur lors de la lecture du fichier.", 'error');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmUpdate = async () => {
        const rowsToUpdate = parsedData.filter(row => row.status === 'ready');
        if (rowsToUpdate.length === 0) {
            addNotification("Aucune mise à jour valide à effectuer.", 'info');
            return;
        }
        
        setIsUpdating(true);
        let successCount = 0;
        let errorCount = 0;

        for (const row of rowsToUpdate) {
            if (row.originalProduct) {
                const updated = { ...row.originalProduct, stock: row.stock };
                // Utilise la fonction existante qui crée un mouvement de stock
                const { error } = await updateProduct(updated, currentUser);
                if (error) {
                    errorCount++;
                    console.error(`Échec de la mise à jour pour ${row.code}: ${error.message}`);
                } else {
                    successCount++;
                }
            }
        }
        
        addNotification(`${successCount} produit(s) mis à jour avec succès. ${errorCount > 0 ? `${errorCount} erreur(s).` : ''}`, errorCount > 0 ? 'error' : 'success');
        setIsUpdating(false);
        onClose();
    };

    const getStatusIcon = (status: ParsedRow['status']) => {
        const classNames = "h-5 w-5 flex-shrink-0";
        switch (status) {
            case 'ready': return <span title="Prêt pour la mise à jour"><CheckCircleIcon className={`${classNames} text-green-500`} /></span>;
            case 'not_found': return <span title="Code produit non trouvé dans la base de données"><XCircleIcon className={`${classNames} text-red-500`} /></span>;
            case 'invalid_stock': return <span title="La valeur du stock est invalide (doit être un nombre positif)"><XCircleIcon className={`${classNames} text-yellow-500`} /></span>;
            case 'no_change': return <span title="Le stock est identique, aucune mise à jour nécessaire"><InformationCircleIcon className={`${classNames} text-gray-400`} /></span>;
        }
    };

    const readyToUpdateCount = parsedData.filter(r => r.status === 'ready').length;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue flex items-center gap-2">
                        <DocumentArrowUpIcon className="h-6 w-6" /> Mettre à Jour le Stock par Fichier CSV
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg text-gray-800">1. Charger le fichier CSV</h4>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md text-sm text-blue-800">
                            <p className="font-bold">Instructions :</p>
                            <ul className="list-disc list-inside mt-1">
                                <li>Le fichier doit être au format <code className="bg-blue-100 p-0.5 rounded">.csv</code>.</li>
                                <li>La première ligne (en-tête) est ignorée.</li>
                                <li>Les colonnes doivent être dans cet ordre : <code className="bg-blue-100 p-0.5 rounded">code,name,stock</code>.</li>
                            </ul>
                        </div>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg text-gray-800">2. Prévisualiser les changements</h4>
                        <div className="border rounded-lg max-h-80 overflow-y-auto relative">
                            {isLoading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg z-10"><p>Analyse du fichier...</p></div>}
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 w-10">Statut</th>
                                        <th className="p-2 font-medium text-gray-600">Code</th>
                                        <th className="p-2 font-medium text-gray-600">Nom</th>
                                        <th className="p-2 font-medium text-gray-600 text-right">Nouveau Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.length > 0 ? parsedData.map(row => (
                                        <tr key={row.rowIndex} className="border-t">
                                            <td className="p-2 flex justify-center items-center">{getStatusIcon(row.status)}</td>
                                            <td className="p-2">{row.code}</td>
                                            <td className="p-2 font-medium">{row.originalProduct?.name || row.name}</td>
                                            <td className={`p-2 text-right font-semibold ${row.status === 'ready' ? 'text-blue-600' : ''}`}>{!isNaN(row.stock) ? row.stock : 'N/A'}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Chargez un fichier pour voir l'aperçu.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                 <div className="p-4 border-t bg-gray-50 flex justify-end items-center gap-4 rounded-b-lg">
                    <p className="text-sm text-gray-600 mr-auto">
                        {readyToUpdateCount > 0 
                            ? `${readyToUpdateCount} produit(s) seront mis à jour.`
                            : 'Aucune mise à jour valide à effectuer.'
                        }
                    </p>
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annuler</button>
                    <button 
                        type="button" 
                        onClick={handleConfirmUpdate}
                        disabled={readyToUpdateCount === 0 || isUpdating}
                        className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-ipt-light-blue/70"
                    >
                        {isUpdating ? 'Mise à jour en cours...' : `Confirmer la Mise à Jour`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockUpdateModal;