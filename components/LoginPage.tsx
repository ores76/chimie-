import React, { useState } from 'react';
import { type User } from '../types';
import { IPT_LOGO_MODERN_B64 } from '../constants';
import { signInDepotUser, signInAdminUser, sendPasswordResetEmail, type AuthError } from '../services/authService';
import { CloseIcon, KeyIcon } from './icons/Icons';
import FeatureSlider from './FeatureSlider';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const ForgotPasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!email) {
            setError("Veuillez entrer une adresse e-mail.");
            return;
        }
        setIsSubmitting(true);

        const { error: resetError } = await sendPasswordResetEmail(email);

        setIsSubmitting(false);

        if (resetError) {
            setError(resetError);
        } else {
            // Don't clear email so user can see what they entered
            setMessage("Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-ipt-blue flex items-center gap-2">
                        <KeyIcon className="h-6 w-6"/>
                        Réinitialiser le mot de passe
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                    </p>
                    <div>
                        <label htmlFor="email-reset" className="block text-sm font-medium text-gray-700">
                            Email
                        </label>
                        <input
                            id="email-reset"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue sm:text-sm"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting || !!message}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-ipt-blue hover:bg-ipt-light-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ipt-light-blue transition-colors disabled:bg-ipt-light-blue/70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [loginType, setLoginType] = useState<'admin' | 'depot'>('admin');
    
    // Admin state
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // Depot state
    const [depotEmail, setDepotEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [error, setError] = useState<AuthError | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (loginType === 'admin') {
            const { user, error: authError } = await signInAdminUser(adminEmail, adminPassword);
             if (authError) {
                setError(authError);
            } else if (user) {
                onLogin(user);
            } else {
                 setError({ title: "Erreur Inattendue", message: "Une erreur inattendue s'est produite lors de la connexion."});
            }
        } else { // depot login
            const { user, error: authError } = await signInDepotUser(depotEmail, password);
            if (authError) {
                setError(authError);
            } else if (user) {
                onLogin(user);
            } else {
                 setError({ title: "Erreur Inattendue", message: "Une erreur inattendue s'est produite lors de la connexion."});
            }
        }
        setIsLoading(false);
    };
    
    return (
        <>
            <div className="min-h-screen bg-white flex flex-col lg:flex-row">
                {/* Slider Section */}
                <div className="relative hidden lg:flex w-full lg:w-1/2 xl:w-3/5">
                    <FeatureSlider />
                </div>
                
                {/* Form Section */}
                <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col items-center justify-center p-6 sm:p-12 animate-fade-in">
                    <div className="w-full max-w-md">
                        <div className="text-center">
                            <img src={IPT_LOGO_MODERN_B64} alt="IPT Logo" className="mx-auto h-16 w-16" />
                            <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
                                IPT Gestion de Stock
                            </h2>
                            <p className="mt-2 text-sm text-gray-600">
                                Connectez-vous à votre compte
                            </p>
                        </div>

                        <div className="mt-8">
                            <div className="flex border-b border-gray-200">
                                <button
                                    onClick={() => setLoginType('admin')}
                                    className={`w-1/2 py-3 text-sm font-medium transition-colors ${loginType === 'admin' ? 'text-ipt-blue border-b-2 border-ipt-blue' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Administrateur
                                </button>
                                <button
                                    onClick={() => setLoginType('depot')}
                                    className={`w-1/2 py-3 text-sm font-medium transition-colors ${loginType === 'depot' ? 'text-ipt-blue border-b-2 border-ipt-blue' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Dépôt / Laboratoire
                                </button>
                            </div>
                        </div>

                        <form className="mt-6 space-y-6" onSubmit={handleLogin}>
                            {loginType === 'admin' ? (
                                <>
                                <div>
                                        <label htmlFor="email-admin" className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            id="email-admin"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            placeholder="Rym.Soltani@pasteur.tn"
                                            className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password-admin" className="block text-sm font-medium text-gray-700">
                                            Mot de passe
                                        </label>
                                        <input
                                            id="password-admin"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue sm:text-sm"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                <div>
                                        <label htmlFor="email-depot" className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <input
                                            id="email-depot"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={depotEmail}
                                            onChange={(e) => setDepotEmail(e.target.value)}
                                            placeholder="Ex: 43@pasteur.tn"
                                            className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password-depot" className="block text-sm font-medium text-gray-700">
                                            Mot de passe
                                        </label>
                                        <input
                                            id="password-depot"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-ipt-blue focus:border-ipt-blue sm:text-sm"
                                        />
                                    </div>
                                </>
                            )}
                            
                            <div className="flex items-center justify-end">
                                <div className="text-sm">
                                    <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPasswordOpen(true); }} className="font-medium text-ipt-blue hover:text-ipt-light-blue">
                                        Mot de passe oublié ?
                                    </a>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md">
                                    <h3 className="text-sm font-bold text-red-800">{error.title}</h3>
                                    <p className="mt-1 text-sm text-red-700">{error.message}</p>
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-ipt-blue hover:bg-ipt-light-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ipt-light-blue transition-colors disabled:bg-ipt-light-blue/70"
                                >
                                    {isLoading ? 'Connexion...' : 'Se connecter'}
                                </button>
                            </div>
                        </form>
                        
                        <div className="mt-10 text-center">
                            <p className="text-sm font-semibold text-ipt-blue">
                                ©2026 l'Institut Pasteur de Tunis. Tous droits réservés. N.AMARA
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {isForgotPasswordOpen && <ForgotPasswordModal onClose={() => setIsForgotPasswordOpen(false)} />}
        </>
    );
};

export default LoginPage;