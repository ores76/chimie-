import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from './icons/Icons';

const DatabaseSetupError: React.FC<{ error: Error | null }> = ({ error }) => {
    const [isCopied, setIsCopied] = useState(false);

    // Specific check for the missing 'product_requests' table
    const isMissingProductRequestsTable = error?.message.includes("Could not find the table 'public.product_requests'");

    const sqlScript = `
-- 1. Create the table for product requests
CREATE TABLE public.product_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    depot_id character varying NOT NULL,
    depot_name character varying NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying NOT NULL,
    quantity_requested integer NOT NULL,
    status character varying NOT NULL DEFAULT 'pending'::character varying,
    requested_by_id character varying NOT NULL,
    requested_by_name character varying NOT NULL,
    handled_by_id character varying,
    handled_by_name character varying,
    handled_at timestamp with time zone,
    CONSTRAINT product_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);

-- 2. Enable Row Level Security (Important!)
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for access
-- This policy allows any authenticated user to see all requests.
CREATE POLICY "Enable read access for all authenticated users"
ON public.product_requests FOR SELECT TO authenticated USING (true);

-- This policy allows any authenticated user to create a request.
CREATE POLICY "Enable insert for all authenticated users"
ON public.product_requests FOR INSERT TO authenticated WITH CHECK (true);

-- This policy allows admins to update requests (approve/reject).
CREATE POLICY "Enable update for admins"
ON public.product_requests FOR UPDATE TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
    `;

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlScript.trim());
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const renderCustomError = () => (
        <>
            <h1 className="text-2xl font-bold text-ipt-blue mb-4">Mise à Jour de la Base de Données Requise</h1>
            <p className="text-gray-700 mb-4">
                Une nouvelle fonctionnalité a été ajoutée qui nécessite une mise à jour de votre base de données. La table <code className="bg-gray-200 p-1 rounded-md text-sm font-mono">product_requests</code> est manquante.
            </p>
            <div className="mt-4 text-left">
                <p className="font-semibold text-gray-800 mb-2">Pour résoudre ce problème, veuillez exécuter le script SQL suivant dans votre éditeur SQL Supabase :</p>
                <div className="relative">
                    <pre className="mt-2 p-4 bg-gray-900 text-white text-sm rounded-lg overflow-x-auto">
                        <code>{sqlScript.trim()}</code>
                    </pre>
                    <button onClick={handleCopy} className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition">
                        {isCopied ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
                    </button>
                </div>
                 <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md">
                    <p className="font-bold text-blue-800">Comment faire :</p>
                    <ol className="list-decimal list-inside text-blue-700 text-sm mt-1">
                        <li>Allez sur le <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-semibold underline">tableau de bord de votre projet Supabase</a>.</li>
                        <li>Naviguez vers la section "SQL Editor".</li>
                        <li>Cliquez sur "+ New query" et collez le script ci-dessus.</li>
                        <li>Cliquez sur "RUN" pour créer la table.</li>
                        <li>Une fois terminé, rafraîchissez cette page.</li>
                    </ol>
                </div>
            </div>
        </>
    );

    const renderGenericError = () => (
        <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur de Connexion à la Base de Données</h1>
            <p className="text-gray-700 mb-2">
                L'application n'a pas pu se connecter à la base de données ou charger les données initiales.
            </p>
            <p className="text-gray-600 mb-4">
                Veuillez vérifier que les informations de connexion Supabase dans le fichier <code>src/services/supabaseClient.ts</code> sont correctes et que les tables de la base de données ont été correctement initialisées.
            </p>
            {error && (
                <div className="mt-4 text-left">
                     <p className="font-semibold text-gray-800">Détail de l'erreur :</p>
                    <pre className="mt-2 p-3 bg-gray-100 text-sm text-red-700 rounded overflow-x-auto">
                        <code>{error.message}</code>
                    </pre>
                </div>
            )}
             <div className="mt-6">
                <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer" className="text-ipt-blue hover:underline">
                    Consulter la documentation Supabase
                </a>
            </div>
        </>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="p-8 bg-white shadow-lg rounded-lg max-w-3xl text-center border-t-4 border-ipt-blue">
                {isMissingProductRequestsTable ? renderCustomError() : renderGenericError()}
            </div>
        </div>
    );
};

export default DatabaseSetupError;
