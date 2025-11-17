import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Users from './components/Users';
import Depots from './components/Depots';
import AiAnalysis from './components/AiAnalysis';
import Statistics from './components/Statistics';
import Alerts from './components/Alerts';
import DepotInventory from './components/DepotInventory';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import Chat from './components/Chat';
import Notification from './components/Notification';
import { useNotification } from './context/NotificationContext';
import { type User, type Page, Role, type Product, type Depot, type InventorySubmission, type StockMovement, type AlertConfiguration } from './types';
import { signOut, getUserProfile } from './services/authService';
import { supabase } from './services/supabaseClient';
import * as dataService from './services/dataService';
import DatabaseSetupError from './components/DatabaseSetupError';
import MovementManager from './components/MovementManager';
import DepotStockManager from './components/DepotStockManager';
import MovementHistory from './components/MovementHistory';


const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [dbError, setDbError] = useState<Error | null>(null);

    // Global state slices
    const [products, setProducts] = useState<Product[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [depots, setDepots] = useState<Depot[]>([]);
    const [submissions, setSubmissions] = useState<InventorySubmission[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [alertConfigs, setAlertConfigs] = useState<AlertConfiguration[]>([]);

    const { notifications, removeNotification } = useNotification();
    
    // Loading states for different data types
    const [isLoading, setIsLoading] = useState({
        products: true,
        users: true,
        depots: true,
        submissions: true,
        movements: true,
        alerts: true,
    });

    // Combined loading state for initial load
    const isAppLoading = Object.values(isLoading).some(Boolean);

     // Session check and auth state listener
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const userProfile = await getUserProfile(session.user);
                if (userProfile) {
                    setUser(userProfile);
                     if (userProfile.role === Role.Depot) {
                        setCurrentPage('depot-inventory');
                    } else {
                        setCurrentPage('dashboard');
                    }
                } else {
                    // Profile not found or invalid, session will be cleared by getUserProfile
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsAuthLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Initial data fetch and subscriptions
    useEffect(() => {
        if (user) {
            const fetchInitialData = async () => {
                try {
                    const [productsData, usersData, depotsData, submissionsData, movementsData, alertsData] = await Promise.all([
                        dataService.getProducts(),
                        dataService.getUsers(),
                        dataService.getDepots(),
                        dataService.getSubmissions(),
                        dataService.getStockMovements(),
                        dataService.getAlerts(),
                    ]);

                    if (productsData.error) throw productsData.error;
                    setProducts(productsData.data || []);
                    
                    if (usersData.error) throw usersData.error;
                    setUsers(usersData.data || []);
                    
                    if (depotsData.error) throw depotsData.error;
                    setDepots(depotsData.data || []);

                    if (submissionsData.error) throw submissionsData.error;
                    setSubmissions(submissionsData.data || []);

                    if (movementsData.error) throw movementsData.error;
                    setStockMovements(movementsData.data || []);

                    if (alertsData.error) throw alertsData.error;
                    setAlertConfigs(alertsData.data || []);

                } catch (error: any) {
                    setDbError(error);
                    console.error("Database fetch error:", error);
                } finally {
                    setIsLoading({
                        products: false,
                        users: false,
                        depots: false,
                        submissions: false,
                        movements: false,
                        alerts: false,
                    });
                }
            };

            fetchInitialData();

            // Define specific callbacks for more efficient real-time updates
            const onProductsChange = async () => {
                const { data, error } = await dataService.getProducts();
                if (error) console.error("Subscription fetch error (products):", error);
                else setProducts(data || []);
            };
             const onUsersChange = async () => {
                const { data, error } = await dataService.getUsers();
                if (error) console.error("Subscription fetch error (users):", error);
                else setUsers(data || []);
            };
            const onDepotsChange = async () => {
                const { data, error } = await dataService.getDepots();
                if (error) console.error("Subscription fetch error (depots):", error);
                else setDepots(data || []);
            };
            const onSubmissionsChange = async () => {
                const { data, error } = await dataService.getSubmissions();
                if (error) console.error("Subscription fetch error (submissions):", error);
                else setSubmissions(data || []);
            };
            const onMovementsChange = async () => {
                const { data, error } = await dataService.getStockMovements();
                if (error) console.error("Subscription fetch error (movements):", error);
                else setStockMovements(data || []);
            };
            const onAlertsChange = async () => {
                const { data, error } = await dataService.getAlerts();
                if (error) console.error("Subscription fetch error (alerts):", error);
                else setAlertConfigs(data || []);
            };


            // Setup subscriptions
            const productsSub = dataService.subscribeToTableChanges('products', onProductsChange);
            const usersSub = dataService.subscribeToTableChanges('users', onUsersChange);
            const depotsSub = dataService.subscribeToTableChanges('depots', onDepotsChange);
            const submissionsSub = dataService.subscribeToTableChanges('inventory_submissions', onSubmissionsChange);
            const movementsSub = dataService.subscribeToTableChanges('stock_movements', onMovementsChange);
            const alertsSub = dataService.subscribeToTableChanges('alert_configurations', onAlertsChange);


            return () => {
                supabase.removeChannel(productsSub);
                supabase.removeChannel(usersSub);
                supabase.removeChannel(depotsSub);
                supabase.removeChannel(submissionsSub);
                supabase.removeChannel(movementsSub);
                supabase.removeChannel(alertsSub);
            };
        }
    }, [user]);
    
    const handleLogin = (loggedInUser: User) => {
        setUser(loggedInUser);
        if (loggedInUser.role === Role.Depot) {
            setCurrentPage('depot-inventory');
        } else {
            setCurrentPage('dashboard');
        }
    };

    const handleLogout = async () => {
        await signOut();
        setUser(null);
    };

    const renderCurrentPage = () => {
        if (!user) return null;
        if (user.role === Role.Admin) {
            switch (currentPage) {
                case 'dashboard':
                    return <Dashboard currentUser={user} products={products} users={users} submissions={submissions} setSubmissions={setSubmissions} isLoading={isLoading} />;
                case 'products':
                    return <Products currentUser={user} products={products} depots={depots} isLoading={isLoading.products} />;
                case 'users':
                    return <Users currentUser={user} users={users} setUsers={setUsers} isLoading={isLoading.users} />;
                case 'depots':
                    return <Depots depots={depots} setDepots={setDepots} isLoading={isLoading.depots} allProducts={products} allSubmissions={submissions} allStockMovements={stockMovements} />;
                 case 'movements':
                    return <MovementManager currentUser={user} depots={depots} products={products} stockMovements={stockMovements} />;
                case 'history':
                    return <MovementHistory stockMovements={stockMovements} allProducts={products} depots={depots} />;
                case 'depot-management':
                    return <DepotStockManager currentUser={user} depots={depots} allProducts={products} />;
                case 'ai-analysis':
                    return <AiAnalysis currentUser={user} stockMovements={stockMovements} onImport={async (products) => { await dataService.handleProductImport(products); }} />;
                case 'statistics':
                    return <Statistics products={products} users={users} depots={depots} submissions={submissions} stockMovements={stockMovements} isLoading={isLoading} />;
                case 'alerts':
                    return <Alerts alertConfigs={alertConfigs} isLoading={isLoading.alerts} />;
                default:
                    return <Dashboard currentUser={user} products={products} users={users} submissions={submissions} setSubmissions={setSubmissions} isLoading={isLoading}/>;
            }
        } else if (user.role === Role.Depot) {
            switch (currentPage) {
                case 'depot-inventory':
                    return <DepotInventory currentUser={user} allProducts={products} allSubmissions={submissions} />;
                case 'ai-analysis':
                    return <AiAnalysis currentUser={user} stockMovements={stockMovements} onImport={async (products) => { await dataService.handleProductImport(products); }} />;
                default:
                    return <DepotInventory currentUser={user} allProducts={products} allSubmissions={submissions} />;
            }
        }
    };
    
     if (isAuthLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-ipt-blue"></div>
            </div>
        );
    }
    
    if (dbError) {
        return <DatabaseSetupError error={dbError} />;
    }

    if (!user) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar 
              user={user} 
              currentPage={currentPage} 
              setCurrentPage={setCurrentPage} 
              isSidebarOpen={isSidebarOpen}
              setSidebarOpen={setSidebarOpen}
              pendingSubmissionsCount={submissions.filter(s => s.status === 'pending').length}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={handleLogout} onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
                   {isAppLoading ? (
                       <div className="flex justify-center items-center h-full">
                           <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-ipt-blue"></div>
                       </div>
                   ) : (
                       renderCurrentPage()
                   )}
                </main>
                <Footer />
            </div>
             <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-3">
                {notifications.map(n => (
                    <Notification key={n.id} {...n} onClose={removeNotification} />
                ))}
            </div>
            <Chat currentUser={user} depots={depots} isLoadingDepots={isLoading.depots} />
        </div>
    );
};

export default App;