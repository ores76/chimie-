import React, { useState } from 'react';
import { type Product, type User, type Depot, type InventorySubmission, type StockMovement } from '../types';
import { ChartBarIcon, FlaskIcon, UsersIcon, ArchiveIcon, ArrowDownIcon, ArrowUpIcon, SparklesIcon, HistoryIcon, CloseIcon } from './icons/Icons';
import { generatePredictiveAnalysis, generateMovementAnalysis } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface StatisticsProps {
    products: Product[];
    users: User[];
    depots: Depot[];
    submissions: InventorySubmission[];
    stockMovements: StockMovement[];
    isLoading: {
        products: boolean;
        users: boolean;
        depots: boolean;
        submissions: boolean;
        movements: boolean;
    };
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; isLoading?: boolean }> = ({ title, value, icon, isLoading }) => (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-center gap-4 border border-gray-200">
        <div className="p-3 rounded-full bg-ipt-blue/10 text-ipt-blue">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {isLoading ? (
                <div className="mt-1 h-7 w-20 bg-gray-200 rounded animate-pulse"></div>
            ) : (
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            )}
        </div>
    </div>
);

const BarChart: React.FC<{ title: string; data: { label: string; value: number; color?: string }[]; defaultColor: string }> = ({ title, data, defaultColor }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4 shrink-0">{title}</h3>
            <div className="space-y-3 overflow-y-auto pr-2 flex-grow min-h-0">
                {data.length > 0 ? data.map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-1/3 truncate" title={item.label}>{item.label}</span>
                        <div className="w-2/3 bg-gray-200 rounded-full h-5">
                            <div
                                className="h-5 rounded-full text-white text-xs flex items-center justify-end pr-2 transition-all duration-300"
                                style={{ 
                                    width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`, 
                                    backgroundColor: item.color || defaultColor 
                                }}
                            >
                                {item.value}
                            </div>
                        </div>
                    </div>
                )) : <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible.</p>}
            </div>
        </div>
    );
};

const PieChart: React.FC<{ title: string; data: { label: string; value: number; color: string }[] }> = ({ title, data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
                <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible.</p>
            </div>
        );
    }

    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    let cumulativePercentage = 0;
    const gradientStops = data.map(item => {
        const percentage = total > 0 ? ((item.value || 0) / total) * 100 : 0;
        const stop = `${item.color} ${cumulativePercentage}% ${cumulativePercentage + percentage}%`;
        cumulativePercentage += percentage;
        return stop;
    }).join(', ');

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
            <div className="flex flex-col md:flex-row items-center gap-6 flex-grow">
                <div 
                    className="w-40 h-40 rounded-full flex-shrink-0"
                    style={{ background: `conic-gradient(${gradientStops})` }}
                    role="img"
                    aria-label={title}
                ></div>
                <ul className="space-y-2 text-sm w-full overflow-y-auto max-h-48">
                    {data.map(item => (
                        <li key={item.label} className="flex items-center justify-between">
                            <div className="flex items-center truncate">
                                <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                                <span className="text-gray-700 truncate" title={item.label}>{item.label}</span>
                            </div>
                            <span className="font-semibold text-gray-800 whitespace-nowrap pl-2">
                                {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'}%)
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// --- MODAL SUB-COMPONENT ---
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


const Statistics: React.FC<StatisticsProps> = ({ products, users, depots, submissions, stockMovements, isLoading }) => {
    const [activeAnalysisModal, setActiveAnalysisModal] = useState<'predictive' | 'movement' | null>(null);
    const [analysisResult, setAnalysisResult] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    const handlePredictiveAnalysis = async () => {
        setActiveAnalysisModal('predictive');
        setIsAnalysisLoading(true);
        setAnalysisResult('');
        const result = await generatePredictiveAnalysis(stockMovements);
        setAnalysisResult(result);
        setIsAnalysisLoading(false);
    };

    const handleMovementAnalysis = async () => {
        setActiveAnalysisModal('movement');
        setIsAnalysisLoading(true);
        setAnalysisResult('');
        const result = await generateMovementAnalysis(stockMovements);
        setAnalysisResult(result);
        setIsAnalysisLoading(false);
    };

    const closeModal = () => setActiveAnalysisModal(null);

    // Memoized calculations
    const top5ProductsByStock = React.useMemo(() => {
        return [...products]
            // Fix for error on line 188: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            // Fix for error on line 188: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            // FIX: Simplified the sort function to prevent type errors.
            .sort((a: Product, b: Product) => (b.stock || 0) - (a.stock || 0))
            .slice(0, 5)
            .map((p, i) => {
                const colors = ['#003366', '#005a9c', '#c7a469', '#6b7280', '#9ca3af'];
                return { label: p.name, value: p.stock || 0, color: colors[i] };
            });
    }, [products]);
    
    const stockByDepot = React.useMemo(() => {
        const depotStocks = products.reduce((acc: Record<string, number>, p) => {
            if (p.location) {
                acc[p.location] = (acc[p.location] || 0) + (p.stock || 0);
            }
            return acc;
        }, {});

        return Object.entries(depotStocks)
            .map(([depotName, stockValue]) => {
                const depotInfo = depots.find(d => d.name === depotName);
                return {
                    label: depotName,
                    value: stockValue,
                    color: depotInfo?.color || '#cccccc' // fallback color
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [products, depots]);

    const productsNearExpiry = React.useMemo(() => {
        const today = new Date();
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(today.getDate() + 90);
        
        return products
            .filter(p => p.expiryDate && new Date(p.expiryDate) <= ninetyDaysFromNow && new Date(p.expiryDate) >= today)
            // Fix for error on line 230: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            // Fix for error on line 230: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            // FIX: Simplified the sort function. The filter ensures expiryDate is valid.
            .sort((a: Product, b: Product) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    }, [products]);

    const lowStockProducts = React.useMemo(() => {
        return products.filter(p => (p.stock || 0) <= (p.alertThreshold || 0)).sort((a,b) => (a.stock || 0) - (b.stock || 0));
    }, [products]);
    
    const movementTypeDistribution = React.useMemo(() => {
        const typeColors: Record<string, string> = {
            initial: '#3498db',
            update: '#f1c40f',
            correction: '#e74c3c',
            import: '#9b59b6',
            submission: '#2ecc71',
        };
         const typeLabels: Record<string, string> = {
            initial: 'Initial',
            update: 'Mise à jour',
            correction: 'Correction',
            import: 'Importation',
            submission: 'Soumission',
        };

        const counts = stockMovements.reduce((acc, mov) => {
            acc[mov.change_type] = (acc[mov.change_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([type, count]) => ({
            label: typeLabels[type] || type,
            value: count,
            color: typeColors[type] || '#7f8c8d'
        })).sort((a,b) => b.value - a.value);
    }, [stockMovements]);

    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800">Statistiques et Notifications</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Produits Uniques" value={products.length} icon={<FlaskIcon className="h-7 w-7"/>} isLoading={isLoading.products} />
                <StatCard title="Quantité Totale en Stock" value={totalStock.toLocaleString()} icon={<ArchiveIcon className="h-7 w-7"/>} isLoading={isLoading.products} />
                <StatCard title="Nombre de Dépôts/Labos" value={depots.length} icon={<UsersIcon className="h-7 w-7"/>} isLoading={isLoading.depots} />
                <StatCard title="Soumissions d'Inventaire" value={submissions.length} icon={<ChartBarIcon className="h-7 w-7"/>} isLoading={isLoading.submissions} />
            </div>

            {/* New Pie Charts & Bar Chart */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1">
                    <PieChart title="Répartition du Stock par Dépôt" data={stockByDepot} />
                </div>
                 <div className="lg:col-span-2">
                    <BarChart title="Top 5 Produits par Stock" data={top5ProductsByStock} defaultColor="#3498db" />
                 </div>
            </div>
            
            {/* AI Analysis Section */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                    <SparklesIcon className="h-7 w-7 text-ipt-gold" />
                    Analyse IA des Tendances de Stock
                </h3>
                <p className="text-gray-600 mb-6">
                    Utilisez l'intelligence artificielle pour obtenir des aperçus et des alertes proactives sur votre inventaire.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 rounded-lg p-5 flex flex-col items-start hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-yellow-100 text-yellow-600">
                                <ChartBarIcon className="h-6 w-6" />
                            </div>
                            <h4 className="font-bold text-lg text-gray-800">Analyse Prédictive des Stocks</h4>
                        </div>
                        <p className="text-gray-600 my-3 flex-grow">
                            L'IA analyse les mouvements récents pour identifier les produits qui risquent une rupture de stock et propose des recommandations.
                        </p>
                        <button 
                            onClick={handlePredictiveAnalysis}
                            className="w-full mt-auto px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow"
                        >
                            Lancer l'analyse
                        </button>
                    </div>
                     <div className="border border-gray-200 rounded-lg p-5 flex flex-col items-start hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                                <HistoryIcon className="h-6 w-6" />
                            </div>
                            <h4 className="font-bold text-lg text-gray-800">Détection d'Anomalies</h4>
                        </div>
                        <p className="text-gray-600 my-3 flex-grow">
                            Détectez des schémas inhabituels (ajustements importants, corrections fréquentes) dans vos mouvements de stock.
                        </p>
                        <button 
                             onClick={handleMovementAnalysis}
                            className="w-full mt-auto px-4 py-2 bg-ipt-blue text-white font-semibold rounded-md hover:bg-ipt-light-blue transition shadow"
                        >
                            Rechercher des anomalies
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-lg font-bold text-yellow-600 mb-4 flex items-center gap-2"><ArrowDownIcon className="h-5 w-5"/> Produits en Alerte de Stock Bas</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded-md">
                                <span className="font-medium text-yellow-800">{p.name}</span>
                                <span className="text-sm font-bold text-yellow-900">{p.stock} / {p.alertThreshold} {p.unit}</span>
                            </div>
                        )) : <p className="text-sm text-gray-500 text-center py-4">Aucun produit en alerte.</p>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2"><ArrowUpIcon className="h-5 w-5 transform rotate-180"/> Produits Proches de l'Expiration (90j)</h3>
                     <div className="space-y-2 max-h-60 overflow-y-auto">
                        {productsNearExpiry.length > 0 ? productsNearExpiry.map(p => {
                            const expiry = new Date(p.expiryDate);
                            const today = new Date();
                            const diffTime = expiry.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const daysText = diffDays <= 1 ? `${diffDays} jour` : `${diffDays} jours`;

                            return (
                                <div key={p.id} className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                                    <span className="font-medium text-red-800">{p.name}</span>
                                    <span className="text-sm font-bold text-red-900">Expire dans {daysText}</span>
                                </div>
                            );
                        }) : <p className="text-sm text-gray-500 text-center py-4">Aucun produit n'expire bientôt.</p>}
                    </div>
                </div>
            </div>

            {/* Render Modals */}
            {activeAnalysisModal === 'predictive' && (
                <AnalysisResultModal 
                    title="Analyse Prédictive des Stocks" 
                    result={analysisResult} 
                    isLoading={isAnalysisLoading}
                    onClose={closeModal}
                    icon={<ChartBarIcon className="h-6 w-6 text-yellow-600" />}
                />
            )}
            {activeAnalysisModal === 'movement' && (
                <AnalysisResultModal 
                    title="Analyse des Mouvements de Stock" 
                    result={analysisResult} 
                    isLoading={isAnalysisLoading}
                    onClose={closeModal}
                    icon={<HistoryIcon className="h-6 w-6 text-purple-600" />}
                />
            )}
        </div>
    );
};

export default Statistics;
