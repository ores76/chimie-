import React, { useState } from 'react';
import { SparklesIcon, DocumentArrowUpIcon, ChartBarIcon, HistoryIcon, CloseIcon } from './icons/Icons';
import { type Product, type User, type StockMovement, Role } from '../types';
import { type ExtractedProduct } from '../services/geminiService';
import ProductImportModal from './ProductImportModal';
import ReactMarkdown from 'react-markdown';

import { 
    generateSafetySheet, 
    generatePredictiveAnalysis, 
    generateMovementAnalysis,
    type SafetySheetResult 
} from '../services/geminiService';


// --- MODALS ---

// A generic modal for displaying AI analysis results
const AnalysisResultModal: React.FC<{ title: string; result: string; isLoading: boolean; onClose: () => void; icon: React.ReactNode; }> = ({ title, result, isLoading, onClose, icon }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold text-ipt-blue flex items-center gap-2">{icon} {title}</h3>
                <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto prose max-w-none">
                {isLoading ? (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ipt-blue mx-auto"></div>
                        <p className="mt-4 text-gray-600">L'IA réfléchit...</p>
                    </div>
                ) : (
                    <ReactMarkdown>{result}</ReactMarkdown>
                )}
            </div>
        </div>
    </div>
);

// A specific modal for generating safety sheets from a text input
const SafetySheetGeneratorModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const [productName, setProductName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SafetySheetResult | null>(null);

    const handleGenerate = async () => {
        if (!productName.trim()) return;
        setIsLoading(true);
        setResult(null);
        const aiResult = await generateSafetySheet(productName);
        setResult(aiResult);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-ipt-blue flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-ipt-gold" />Générateur de Fiche de Sécurité</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Entrez un nom de produit chimique (ex: Acétone)"
                            className="flex-grow p-2 border border-gray-300 rounded-md"
                        />
                        <button onClick={handleGenerate} disabled={isLoading || !productName.trim()} className="px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition disabled:bg-gray-400">
                            {isLoading ? 'Génération...' : 'Générer'}
                        </button>
                    </div>
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

interface AiAnalysisProps {
    currentUser: User;
    stockMovements: StockMovement[];
    onImport: (products: ExtractedProduct[]) => Promise<void>;
}

const AiAnalysis: React.FC<AiAnalysisProps> = ({ currentUser, stockMovements, onImport }) => {
    const [activeModal, setActiveModal] = useState<'import' | 'safety' | 'predictive' | 'movement' | null>(null);
    const [analysisResult, setAnalysisResult] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    
    const isAdmin = currentUser.role === Role.Admin;

    const handlePredictiveAnalysis = async () => {
        setActiveModal('predictive');
        setIsAnalysisLoading(true);
        const result = await generatePredictiveAnalysis(stockMovements);
        setAnalysisResult(result);
        setIsAnalysisLoading(false);
    };

    const handleMovementAnalysis = async () => {
        setActiveModal('movement');
        setIsAnalysisLoading(true);
        const result = await generateMovementAnalysis(stockMovements);
        setAnalysisResult(result);
        setIsAnalysisLoading(false);
    };

    const allFeatures = [
        {
            id: 'import',
            title: "Import par Image",
            description: "Extrayez automatiquement les listes de produits depuis une image ou un scan pour accélérer l'encodage.",
            icon: <DocumentArrowUpIcon className="h-8 w-8 text-white" />,
            bgColor: 'bg-green-500',
            action: () => setActiveModal('import'),
            actionText: "Lancer l'outil d'importation",
            adminOnly: true,
        },
        {
            id: 'safety',
            title: "Génération de Fiches de Sécurité",
            description: "Générez des fiches de sécurité (FDS) à jour pour n'importe quel produit en utilisant les dernières informations web.",
            icon: <SparklesIcon className="h-8 w-8 text-white" />,
            bgColor: 'bg-blue-500',
            action: () => setActiveModal('safety'),
            actionText: "Ouvrir le générateur",
            adminOnly: false,
        },
        {
            id: 'predictive',
            title: "Analyse Prédictive des Stocks",
            description: "Anticipez les ruptures de stock et optimisez les commandes en fonction des tendances de consommation.",
            icon: <ChartBarIcon className="h-8 w-8 text-white" />,
            bgColor: 'bg-yellow-500',
            action: handlePredictiveAnalysis,
            actionText: "Lancer l'analyse prédictive",
            adminOnly: true,
        },
        {
            id: 'movement',
            title: "Analyse des Mouvements",
            description: "Détectez des anomalies ou des tendances inhabituelles dans l'historique des mouvements de stock.",
            icon: <HistoryIcon className="h-8 w-8 text-white" />,
            bgColor: 'bg-purple-500',
            action: handleMovementAnalysis,
            actionText: "Lancer l'analyse des mouvements",
            adminOnly: true,
        },
    ];
    
    const availableFeatures = isAdmin ? allFeatures : allFeatures.filter(f => !f.adminOnly);

    const closeModal = () => setActiveModal(null);

    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <SparklesIcon className="h-8 w-8 text-ipt-gold" />
                    Centre d'Analyse IA
                </h2>
                <p className="text-gray-600 mt-2 mb-8">
                    Exploitez l'intelligence artificielle pour obtenir des informations, automatiser les tâches et optimiser la gestion de votre système.
                </p>

                <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                    {availableFeatures.map((feature) => (
                        <div key={feature.id} className="border border-gray-200 rounded-lg p-6 flex flex-col hover:shadow-lg transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">{feature.title}</h3>
                            </div>
                            <p className="text-gray-600 my-4 flex-grow">{feature.description}</p>
                            <button
                                onClick={feature.action}
                                className="w-full mt-auto px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow"
                            >
                                {feature.actionText}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {activeModal === 'import' && isAdmin && <ProductImportModal onClose={closeModal} onImport={onImport} currentUser={currentUser} />}
            {activeModal === 'safety' && <SafetySheetGeneratorModal onClose={closeModal} />}
            {activeModal === 'predictive' && isAdmin && (
                <AnalysisResultModal 
                    title="Analyse Prédictive des Stocks" 
                    result={analysisResult} 
                    isLoading={isAnalysisLoading}
                    onClose={closeModal}
                    icon={<ChartBarIcon className="h-6 w-6" />}
                />
            )}
             {activeModal === 'movement' && isAdmin && (
                <AnalysisResultModal 
                    title="Analyse des Mouvements de Stock" 
                    result={analysisResult} 
                    isLoading={isAnalysisLoading}
                    onClose={closeModal}
                    icon={<HistoryIcon className="h-6 w-6" />}
                />
            )}
        </>
    );
};

export default AiAnalysis;