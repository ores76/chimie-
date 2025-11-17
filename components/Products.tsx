import React, { useState, useMemo, useEffect } from 'react';
import { type Product, type Depot, type User, Role } from '../types';
import { CloseIcon, PencilIcon, TrashIcon, PlusCircleIcon, SparklesIcon, DocumentArrowUpIcon, ExternalLinkIcon } from './icons/Icons';
import { addProduct, updateProduct, deleteProduct } from '../services/dataService';
import { getProductInfoFromAI, generateSafetySheet, SafetySheetResult } from '../services/geminiService';
import { useNotification } from '../context/NotificationContext';
import StockUpdateModal from './StockUpdateModal';
import ReactMarkdown from 'react-markdown';

// --- MODALS ---

const ProductModal: React.FC<{ 
    product: Partial<Product> | null; 
    onClose: () => void; 
    onSave: (product: Product | Partial<Product>) => Promise<void>;
    depots: Depot[];
}> = ({ product, onClose, onSave, depots }) => {
    const [formData, setFormData] = useState<Partial<Product> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const { addNotification } = useNotification();

    useEffect(() => {
        setFormData(product);
    }, [product]);

    if (!product || !formData) return null;
    
    const isNew = !product.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numValue = ['stock', 'alertThreshold'].includes(name) ? parseInt(value, 10) || 0 : value;
        setFormData(prev => prev ? { ...prev, [name]: numValue } : null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            setIsSaving(true);
            await onSave(formData);
            setIsSaving(false);
        }
    };
    
    const fetchInfoFromAI = async () => {
        if (!formData.name) {
            addNotification("Veuillez d'abord entrer un nom de produit.", 'error');
            return;
        }
        setIsAiLoading(true);
        const result = await getProductInfoFromAI(formData.name);
        if (result.error) {
            addNotification(result.error, 'error');
        } else if (result.data) {
            setFormData(prev => prev ? { ...prev, ...result.data } : null);
            addNotification("Informations récupérées par l'IA.", 'success');
        }
        setIsAiLoading(false);
    };
    
    const inputClass = "mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ipt-light-blue sm:text-sm";
    const labelClass = "block text-sm font-medium text-gray-700";

    return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue">{isNew ? 'Ajouter un Produit' : 'Modifier le Produit'}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="relative">
                        <label htmlFor="name" className={labelClass}>Nom du Produit</label>
                        <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleChange} className={inputClass} required />
                        <button type="button" onClick={fetchInfoFromAI} disabled={isAiLoading} className="absolute top-6 right-2 p-2 rounded-full text-ipt-gold hover:bg-yellow-100 disabled:opacity-50">
                            {isAiLoading ? <div className="h-5 w-5 border-2 border-t-transparent border-ipt-gold rounded-full animate-spin"></div> : <SparklesIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label htmlFor="code" className={labelClass}>Code Article</label><input type="text" name="code" id="code" value={formData.code || ''} onChange={handleChange} className={inputClass} /></div>
                         <div><label htmlFor="cas" className={labelClass}>N° CAS</label><input type="text" name="cas" id="cas" value={formData.cas || ''} onChange={handleChange} className={inputClass} /></div>
                    </div>
                     <div><label htmlFor="formula" className={labelClass}>Formule Chimique</label><input type="text" name="formula" id="formula" value={formData.formula || ''} onChange={handleChange} className={inputClass} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label htmlFor="stock" className={labelClass}>Stock</label><input type="number" name="stock" id="stock" value={formData.stock || 0} onChange={handleChange} className={inputClass} /></div>
                        <div><label htmlFor="unit" className={labelClass}>Unité</label><input type="text" name="unit" id="unit" value={formData.unit || ''} onChange={handleChange} className={inputClass} /></div>
                        <div><label htmlFor="alertThreshold" className={labelClass}>Seuil d'Alerte</label><input type="number" name="alertThreshold" id="alertThreshold" value={formData.alertThreshold || 0} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div>
                        <label htmlFor="location" className={labelClass}>Dépôt/Labo</label>
                        <select name="location" id="location" value={formData.location || ''} onChange={handleChange} className={inputClass} required>
                            <option value="">Sélectionner un emplacement</option>
                            {depots.filter(d => d.active).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                    <div><label htmlFor="expiryDate" className={labelClass}>Date d'Expiration</label><input type="date" name="expiryDate" id="expiryDate" value={formData.expiryDate?.split('T')[0] || ''} onChange={handleChange} className={inputClass} /></div>
                    
                    <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annuler</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-ipt-light-blue/70">{isSaving ? 'Enregistrement...' : 'Enregistrer'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SafetySheetModal: React.FC<{ product: Product; onClose: () => void }> = ({ product, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<SafetySheetResult | null>(null);

    useEffect(() => {
        const generate = async () => {
            setIsLoading(true);
            const aiResult = await generateSafetySheet(product.name, product.formula);
            setResult(aiResult);
            setIsLoading(false);
        };
        generate();
    }, [product]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-ipt-blue flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-ipt-gold" />Fiche de Sécurité (IA) pour {product.name}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 border-t overflow-y-auto prose max-w-none flex-grow">
                     {isLoading && <div className="text-center py-10"><p>Génération en cours...</p></div>}
                     {result && (
                        <div>
                             <ReactMarkdown>{result.content}</ReactMarkdown>
                            {result.sources && result.sources.length > 0 && (
                                <div className="mt-6 border-t pt-3">
                                    <h4 className="font-bold">Sources:</h4>
                                    <ul className="list-disc pl-5 text-sm">
                                        {result.sources.map((source: any, index: number) => (
                                            <li key={index}>
                                                <a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{source.web?.title || source.web?.uri}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface ProductsProps {
    currentUser: User;
    products: Product[];
    depots: Depot[];
    isLoading: boolean;
}

const Products: React.FC<ProductsProps> = ({ currentUser, products, depots, isLoading }) => {
    const [filter, setFilter] = useState('');
    const [productToEdit, setProductToEdit] = useState<Partial<Product> | null>(null);
    const [productForFDS, setProductForFDS] = useState<Product | null>(null);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const { addNotification } = useNotification();

    const isAdmin = currentUser.role === Role.Admin;

    const filteredProducts = useMemo(() => {
        const searchTerm = filter.toLowerCase();
        if (!searchTerm) return products;
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.code?.toLowerCase().includes(searchTerm) ||
            p.cas?.toLowerCase().includes(searchTerm) ||
            p.location?.toLowerCase().includes(searchTerm)
        );
    }, [products, filter]);

    const handleSaveProduct = async (productData: Product | Partial<Product>) => {
        const isNew = !productData.id;
        const promise = isNew ? addProduct(productData as any, currentUser) : updateProduct(productData as Product, currentUser);
        const { error } = await promise;

        if (error) {
            addNotification(`Erreur: ${error.message}`, 'error');
        } else {
            addNotification(`Produit ${isNew ? 'ajouté' : 'mis à jour'} avec succès.`, 'success');
            setProductToEdit(null);
        }
    };
    
    const handleDeleteProduct = async (product: Product) => {
         if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${product.name} ? Cette action est irréversible.`)) {
            const { error } = await deleteProduct(product.id);
            if (error) {
                addNotification(`Erreur: ${error.message}`, 'error');
            } else {
                addNotification(`Produit ${product.name} supprimé.`, 'info');
            }
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Gestion des Produits Chimiques</h2>
                {isAdmin && (
                    <div className="flex gap-2">
                        <button onClick={() => setIsUpdateModalOpen(true)} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition shadow flex items-center gap-2"><DocumentArrowUpIcon className="h-5 w-5" />Mise à jour par CSV</button>
                        <button onClick={() => setProductToEdit({})} className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow flex items-center gap-2"><PlusCircleIcon className="h-5 w-5" /> Ajouter un Produit</button>
                    </div>
                )}
            </div>
            <input
                type="text"
                placeholder="Filtrer par nom, code, CAS, emplacement..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md mb-4"
            />
             <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b border-gray-200"><tr className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        <th className="p-4">Produit</th><th className="p-4">Code/CAS</th><th className="p-4">Emplacement</th><th className="p-4">Stock</th><th className="p-4">Actions</th>
                    </tr></thead>
                    <tbody>
                        {isLoading ? (<tr><td colSpan={5} className="text-center p-8">Chargement...</td></tr>) 
                        : filteredProducts.map((p, index) => (
                            <tr key={p.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-ipt-gold/10`}>
                                <td className="p-4 font-medium text-gray-800">{p.name}</td>
                                <td className="p-4 text-gray-600 font-mono text-sm"><div>{p.code}</div><div className="text-gray-400">{p.cas}</div></td>
                                <td className="p-4 text-gray-600">{p.location}</td>
                                <td className={`p-4 font-bold ${p.stock <= p.alertThreshold ? 'text-red-600' : 'text-gray-800'}`}>{p.stock} {p.unit}</td>
                                <td className="p-4 space-x-1 whitespace-nowrap">
                                    <button onClick={() => setProductForFDS(p)} className="p-2 rounded-full text-gray-500 hover:bg-yellow-100 hover:text-yellow-600" title="Générer Fiche de Sécurité (IA)"><SparklesIcon className="h-5 w-5" /></button>
                                    {isAdmin && (<>
                                        <button onClick={() => setProductToEdit(p)} className="p-2 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-600" title="Modifier"><PencilIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDeleteProduct(p)} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600" title="Supprimer"><TrashIcon className="h-5 w-5" /></button>
                                    </>)}
                                    {p.safetySheetUrl && <a href={p.safetySheetUrl} target="_blank" rel="noopener noreferrer" className="inline-block p-2 rounded-full text-gray-500 hover:bg-gray-200" title="Voir FDS officielle"><ExternalLinkIcon className="h-5 w-5"/></a>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {productToEdit && <ProductModal product={productToEdit} onClose={() => setProductToEdit(null)} onSave={handleSaveProduct} depots={depots} />}
             {productForFDS && <SafetySheetModal product={productForFDS} onClose={() => setProductForFDS(null)} />}
             {isUpdateModalOpen && isAdmin && <StockUpdateModal onClose={() => setIsUpdateModalOpen(false)} allProducts={products} currentUser={currentUser} />}
        </div>
    );
};

export default Products;
