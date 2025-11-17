import React, { useState, useCallback } from 'react';
import { CloseIcon, PhotoIcon, SparklesIcon, DocumentArrowUpIcon } from './icons/Icons';
import { useNotification } from '../context/NotificationContext';
import { extractProductsFromImage, type ExtractedProduct } from '../services/geminiService';
import { User } from '../types';

interface ProductImportModalProps {
    onClose: () => void;
    onImport: (products: ExtractedProduct[]) => Promise<void>;
    currentUser: User;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const ProductImportModal: React.FC<ProductImportModalProps> = ({ onClose, onImport, currentUser }) => {
    const [imageFile, setImageFile] = useState<{ file: File; dataUrl: string } | null>(null);
    const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { addNotification } = useNotification();

    const processImage = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            addNotification("Veuillez sélectionner un fichier image valide.", 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => setImageFile({ file, dataUrl: e.target?.result as string });
        reader.readAsDataURL(file);

        setIsLoading(true);
        setExtractedProducts([]);
        try {
            const base64Data = await fileToBase64(file);
            const result = await extractProductsFromImage(base64Data, file.type);
            if (result.error) throw new Error(result.error);

            if (result.data && result.data.length > 0) {
                setExtractedProducts(result.data);
                addNotification(`${result.data.length} produits extraits avec succès. Veuillez les vérifier.`, 'success');
            } else {
                addNotification("Aucun produit n'a pu être détecté dans l'image.", 'info');
            }
        } catch (err: any) {
            addNotification(err.message || "Une erreur est survenue lors de l'analyse de l'image.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    const handleFileSelect = (files: FileList | null) => {
        if (files && files[0]) {
            processImage(files[0]);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleConfirmImport = async () => {
        setIsImporting(true);
        await onImport(extractedProducts);
        setIsImporting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-2xl font-bold text-ipt-blue flex items-center gap-2">
                        <DocumentArrowUpIcon className="h-6 w-6" /> Importer des Produits depuis une Image
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Upload and Preview */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg text-gray-800">1. Charger l'image de la liste</h4>
                        {!imageFile ? (
                            <div 
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={handleDrop}
                                className={`flex justify-center px-6 py-10 border-2 ${isDragging ? 'border-ipt-blue bg-blue-50' : 'border-gray-300'} border-dashed rounded-md transition-colors`}
                            >
                                <div className="space-y-1 text-center">
                                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="import-file" className="relative cursor-pointer bg-white rounded-md font-medium text-ipt-blue hover:text-ipt-light-blue">
                                            <span>Choisissez un fichier</span>
                                            <input id="import-file" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileSelect(e.target.files)} />
                                        </label>
                                        <p className="pl-1">ou glissez-déposez</p>
                                    </div>
                                    <p className="text-xs text-gray-500">Une image claire de votre tableau (ex: Excel)</p>
                                </div>
                            </div>
                        ) : (
                             <div className="relative">
                                <img src={imageFile.dataUrl} alt="Aperçu de l'import" className="w-full rounded-lg shadow-md border" />
                                <button onClick={() => {setImageFile(null); setExtractedProducts([]);}} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white">
                                    Changer l'image
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Results and Confirmation */}
                    <div className="space-y-4">
                         <h4 className="font-semibold text-lg text-gray-800">2. Vérifier les données extraites</h4>
                        <div className="border rounded-lg max-h-80 overflow-y-auto relative">
                             {isLoading && (
                                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg z-10">
                                    <SparklesIcon className="h-10 w-10 text-ipt-gold animate-spin" />
                                    <p className="mt-4 text-gray-600">L'IA analyse votre image...</p>
                                </div>
                            )}
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left font-medium text-gray-600">Code</th>
                                        <th className="p-2 text-left font-medium text-gray-600">Désignation</th>
                                        <th className="p-2 text-right font-medium text-gray-600">Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {extractedProducts.length > 0 ? extractedProducts.map((p, i) => (
                                        <tr key={i} className="border-t">
                                            <td className="p-2">{p.code}</td>
                                            <td className="p-2 font-medium">{p.name}</td>
                                            <td className="p-2 text-right">{p.stock}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className="text-center p-8 text-gray-500">
                                                { !isLoading && 'Les produits détectés apparaîtront ici.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annuler</button>
                    <button 
                        type="button" 
                        onClick={handleConfirmImport}
                        disabled={extractedProducts.length === 0 || isImporting}
                        className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow disabled:bg-ipt-light-blue/70"
                    >
                        {isImporting ? 'Importation en cours...' : `Confirmer l'import de ${extractedProducts.length} produits`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductImportModal;