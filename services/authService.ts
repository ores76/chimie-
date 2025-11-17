import { type User, Role, UserStatus, type Depot } from '../types';
import { supabase } from './supabaseClient';
import { type User as AuthUser } from '@supabase/supabase-js';

// --- SERVICE D'AUTHENTIFICATION AVEC SUPABASE ---
// Ce service gère l'authentification des utilisateurs via Supabase.
// Il vérifie l'authentification PUIS récupère le profil utilisateur/dépôt
// directement depuis la base de données pour assurer la cohérence des données.

export interface AuthError {
    title: string;
    message: string;
}

export const getUserProfile = async (sessionUser: AuthUser): Promise<User | null> => {
    // Check if it's a depot user based on email format
    const depotIdMatch = sessionUser.email?.match(/^(\d+)@pasteur\.tn$/);

    if (depotIdMatch) {
        // It's a depot user
        const depotId = depotIdMatch[1];
        const { data: depot, error: depotError } = await supabase
            .from('depots')
            .select('*')
            .eq('id', depotId)
            .single();

        if (depotError || !depot || !depot.active) {
            // Depot not found or inactive, sign out for safety
            await supabase.auth.signOut();
            return null;
        }

        const depotUser: User = {
            id: `user-depot-${depot.id}`,
            firstName: depot.name,
            lastName: 'Utilisateur',
            email: sessionUser.email!,
            service: depot.name,
            phone: '',
            role: Role.Depot,
            status: UserStatus.Active,
        };
        return depotUser;
    } else {
        // It's an admin user
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .ilike('email', sessionUser.email!)
            .single();
        
        if (profileError || !profileData || profileData.role !== Role.Admin || profileData.status !== UserStatus.Active) {
            // Admin profile not found, not an admin, or not active. Sign out.
            await supabase.auth.signOut();
            return null;
        }

        const userProfile: User = {
            id: profileData.id,
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            email: profileData.email,
            service: profileData.service,
            phone: profileData.phone,
            role: profileData.role,
            status: profileData.status,
        };
        return userProfile;
    }
};

export const signInAdminUser = async (email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> => {
    // 1. Authentifier l'utilisateur avec Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        console.warn(`Admin login attempt failed for ${email}:`, authError.message);
        return { user: null, error: {
            title: "Échec de la Connexion",
            message: "L'email ou le mot de passe est incorrect. Assurez-vous que l'utilisateur a bien été créé à la fois dans la section 'Authentication' de Supabase ET dans la table 'users'. Vous pouvez aussi utiliser le lien 'Mot de passe oublié'."
        }};
    }

    if (authData.user) {
        // 2. Si l'authentification réussit, récupérer le profil depuis la table 'users' en utilisant une recherche insensible à la casse.
        const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .ilike('email', authData.user.email!)
            .single();

        // 3. Gérer les erreurs de récupération de profil
        if (profileError || !profileData) {
            await supabase.auth.signOut(); // Sécurité : déconnecter si aucun profil n'est trouvé
            return { user: null, error: {
                title: "Profil administrateur non trouvé",
                message: "Vos identifiants sont corrects, mais aucun profil administrateur correspondant n'a été trouvé. Veuillez contacter le support."
            }};
        }

        // 4. Vérifier si le profil est bien un admin
        if (profileData.role !== Role.Admin) {
            await supabase.auth.signOut();
            return { user: null, error: {
                title: "Accès non autorisé",
                message: "Ce compte n'est pas configuré comme un compte administrateur."
            }};
        }

        // 5. Correction automatique: si un admin se connecte mais que son statut est inactif, le réactiver.
        if (profileData.status !== UserStatus.Active) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ status: UserStatus.Active })
                .eq('id', profileData.id);

            if (updateError) {
                // Si la mise à jour échoue (ex: RLS), alors on échoue la connexion.
                await supabase.auth.signOut();
                console.error("Failed to auto-reactivate admin account:", updateError);
                return { user: null, error: {
                    title: "Erreur de Réactivation",
                    message: "Votre compte est inactif et sa réactivation automatique a échoué. Veuillez contacter le support technique."
                }};
            }
            // Mettre à jour les données locales pour continuer la connexion
            profileData.status = UserStatus.Active;
        }

        // 6. Mapper les données de la BDD (snake_case) vers le type User (camelCase) et renvoyer
        const userProfile: User = {
            id: profileData.id,
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            email: profileData.email,
            service: profileData.service,
            phone: profileData.phone,
            role: profileData.role,
            status: profileData.status,
        };
        
        return { user: userProfile, error: null };
    }
    
    return { user: null, error: {
        title: "Erreur Inattendue",
        message: "Une erreur inattendue s'est produite. Veuillez réessayer."
    }};
};

export const signInDepotUser = async (email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> => {
    // 1. Authentifier l'utilisateur avec Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        console.warn(`Depot login attempt failed for ${email}:`, authError.message);
        return { user: null, error: {
            title: "Échec de la Connexion",
            message: "L'email ou le mot de passe est incorrect. Assurez-vous que le dépôt a bien été créé à la fois dans la section 'Authentication' de Supabase ET dans la table 'depots'. Vous pouvez aussi utiliser le lien 'Mot de passe oublié'."
        }};
    }

    if (authData.user) {
        // 2. Extraire l'ID du dépôt depuis l'email (ex: "43@pasteur.tn" -> "43")
        const depotId = authData.user.email?.split('@')[0];
        if (!depotId) {
            await supabase.auth.signOut();
            return { user: null, error: {
                title: "Format d'email invalide",
                message: "L'email doit être au format 'ID_depot@pasteur.tn'."
            }};
        }
        
        // 3. Récupérer le profil du dépôt depuis la table 'depots'
        const { data: depot, error: depotError } = await supabase
            .from('depots')
            .select('*')
            .eq('id', depotId)
            .single();

        // 4. Gérer les erreurs de récupération de profil
        if (depotError || !depot) {
            await supabase.auth.signOut();
            return { user: null, error: {
                title: "Dépôt/Laboratoire non trouvé",
                message: `Vos identifiants sont corrects, mais aucun dépôt avec l'ID '${depotId}' n'a été trouvé. Contactez l'administrateur.`
            }};
        }

        // 5. Vérifier si le dépôt est actif
        if (!depot.active) {
            await supabase.auth.signOut();
            return { user: null, error: {
                title: "Compte Inactif",
                message: "Ce compte de dépôt est actuellement inactif. Veuillez contacter un administrateur."
            }};
        }

        // 6. Construire un objet User pour le dépôt et le renvoyer
        const depotUser: User = {
            id: `user-depot-${depot.id}`,
            firstName: depot.name,
            lastName: 'Utilisateur',
            email: authData.user.email!,
            service: depot.name,
            phone: '',
            role: Role.Depot,
            status: UserStatus.Active,
        };
        return { user: depotUser, error: null };
    }

    return { user: null, error: {
        title: "Erreur Inattendue",
        message: "Une erreur inattendue s'est produite. Veuillez réessayer."
    }};
};

export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error signing out:", error.message);
    }
};

export const updateUserPassword = async (newPassword: string): Promise<{ error: string | null }> => {
    if (newPassword.length < 6) {
        return { error: 'Le mot de passe doit contenir au moins 6 caractères.' };
    }
    
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
        console.error("Error updating password in Supabase:", updateError.message);
        return { error: "Erreur lors de la mise à jour du mot de passe. Veuillez réessayer." };
    }
    
    return { error: null };
};

export const sendPasswordResetEmail = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });

    if (error) {
        console.error('Supabase password reset error:', error.message);
        return { error: "Une erreur est survenue lors de la demande de réinitialisation." };
    }

    return { error: null };
};
