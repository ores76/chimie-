import { supabase } from './supabaseClient';
import { type Product, type User, type Depot, type InventorySubmission, type StockMovement, type AlertConfiguration } from '../types';
import { type ExtractedProduct } from './geminiService';

// Generic function to subscribe to table changes
export const subscribeToTableChanges = (table: string, callback: () => void) => {
    return supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
            console.log(`Change received on ${table}!`, payload);
            callback();
        })
        .subscribe();
};

const generateTransactionRef = (prefix: string) => {
    return `${prefix.toUpperCase()}-${Date.now()}`;
};


// --- Products ---
export const getProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    // Explicitly map snake_case from DB to object structure defined in types.ts
    const mappedData = data?.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        cas: p.cas,
        formula: p.formula,
        location: p.location,
        stock: p.stock,
        unit: p.unit,
        alertThreshold: p.alert_threshold,
        imageUrl: p.image_url,
        safetySheetUrl: p.safety_sheet_url,
        ghsPictograms: p.ghs_pictograms,
        created_at: p.created_at,
        updated_at: p.updated_at,
        expiryDate: p.expiry_date,
    })) || [];
    return { data: mappedData as Product[], error };
};

export const addProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>, user: User) => {
    const { data, error } = await supabase.from('products').insert({
        name: product.name,
        code: product.code,
        cas: product.cas,
        formula: product.formula,
        location: product.location,
        stock: product.stock,
        unit: product.unit,
        alert_threshold: product.alertThreshold,
        image_url: product.imageUrl,
        safety_sheet_url: product.safetySheetUrl,
        ghs_pictograms: product.ghsPictograms,
        expiry_date: product.expiryDate,
    }).select().single();
    
    if (data && !error) {
        await addStockMovement({
            product_id: data.id,
            product_name: data.name,
            user_id: user.id,
            user_name: `${user.firstName} ${user.lastName}`,
            change_type: 'initial',
            quantity_change: data.stock,
            old_stock_level: 0,
            new_stock_level: data.stock,
            transaction_ref: generateTransactionRef('CRE'),
        });
    }

    return { data, error };
};

export const updateProduct = async (product: Product, user: User) => {
    const { data: originalProduct, error: fetchError } = await supabase.from('products').select('stock').eq('id', product.id).single();
    if(fetchError) return { data: null, error: fetchError };

    const oldStock = originalProduct.stock;
    const quantityChange = product.stock - oldStock;

    const { data, error } = await supabase.from('products').update({
        name: product.name,
        code: product.code,
        cas: product.cas,
        formula: product.formula,
        location: product.location,
        stock: product.stock,
        unit: product.unit,
        alert_threshold: product.alertThreshold,
        image_url: product.imageUrl,
        safety_sheet_url: product.safetySheetUrl,
        ghs_pictograms: product.ghsPictograms,
        expiry_date: product.expiryDate,
        updated_at: new Date().toISOString(),
    }).eq('id', product.id).select().single();
    
    if (data && !error && quantityChange !== 0) {
        await addStockMovement({
            product_id: data.id,
            product_name: data.name,
            user_id: user.id,
            user_name: `${user.firstName} ${user.lastName}`,
            change_type: 'update',
            quantity_change: quantityChange,
            old_stock_level: oldStock,
            new_stock_level: data.stock,
            transaction_ref: generateTransactionRef('MAJ'),
        });
    }

    return { data, error };
};

export const deleteProduct = async (productId: string) => {
    return await supabase.from('products').delete().eq('id', productId);
};

export const handleProductImport = async (products: ExtractedProduct[]) => {
    const productsToAdd = products.map(p => ({
        name: p.name,
        code: p.code,
        stock: p.stock,
        // Default values for other required fields
        cas: '',
        formula: '',
        location: 'Non spécifié',
        unit: 'unité',
        alertThreshold: 0,
        imageUrl: null,
        safetySheetUrl: null,
        ghsPictograms: [],
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // 1 year from now
    }));

    // Using bulk insert
    const { data, error } = await supabase.from('products').insert(productsToAdd);
    // Note: Stock movements for bulk imports might be added here in a future update.
    return { data, error };
};

// --- Users ---
export const getUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    const mappedData = data?.map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        service: u.service,
        phone: u.phone,
        role: u.role,
        status: u.status,
    }))
    return { data: mappedData as User[], error };
};

export const updateUser = async (user: User) => {
    return await supabase.from('users').update({
        first_name: user.firstName,
        last_name: user.lastName,
        service: user.service,
        phone: user.phone,
        role: user.role,
        status: user.status
    }).eq('id', user.id);
};

export const deleteUser = async (userId: string) => {
    // Note: This only deletes the profile. The auth user must be deleted from Supabase UI.
    return await supabase.from('users').delete().eq('id', userId);
};

export const bulkUpdateUsers = async (userIds: string[], updates: { role?: string; status?: string }) => {
    const dbUpdates: any = {};
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.status) dbUpdates.status = updates.status;

    return await supabase.from('users').update(dbUpdates).in('id', userIds);
};

// --- Depots ---
export const getDepots = async () => {
    const { data, error } = await supabase.from('depots').select('*');
    return { data: data as Depot[], error };
};

export const addDepot = async (depot: Depot) => {
    // In a real app, you'd also need to create an auth user for the depot.
    return await supabase.from('depots').insert(depot);
};

export const updateDepot = async (depot: Depot) => {
    return await supabase.from('depots').update({
        name: depot.name,
        color: depot.color,
        active: depot.active
    }).eq('id', depot.id);
};

// --- Submissions ---
export const getSubmissions = async () => {
    const { data, error } = await supabase.from('inventory_submissions').select('*').order('created_at', { ascending: false });
    const mappedData = data?.map(s => ({
        id: s.id,
        depotId: s.depot_id,
        depotName: s.depot_name,
        items: s.items,
        status: s.status,
        created_at: s.created_at,
    }));
    return { data: mappedData as InventorySubmission[], error };
};

export const addSubmission = async (submission: Omit<InventorySubmission, 'id' | 'created_at'>) => {
    return await supabase.from('inventory_submissions').insert({
        depot_id: submission.depotId,
        depot_name: submission.depotName,
        items: submission.items,
        status: submission.status
    });
};

export const updateSubmissionStatus = async (submissionId: string, status: 'approved' | 'rejected' | 'pending') => {
    return await supabase.from('inventory_submissions').update({ status }).eq('id', submissionId);
};

export const approveSubmission = async (submission: InventorySubmission, adminUser: User) => {
    const { error: statusError } = await updateSubmissionStatus(submission.id, 'approved');
    if (statusError) return { error: statusError };
    
    const transaction_ref = generateTransactionRef('INV');

    const updates = submission.items.map(item => 
        supabase.from('products').select('stock').eq('id', item.productId).single().then(res => {
            if (res.error) throw res.error;
            const oldStock = res.data.stock;
            const newStock = item.quantity; // Submissions are full inventory counts, not deltas
            const quantityChange = newStock - oldStock;

            return supabase.from('products').update({ stock: newStock }).eq('id', item.productId).then(updateRes => {
                if (updateRes.error) throw updateRes.error;
                // Log stock movement
                return addStockMovement({
                     product_id: item.productId,
                     product_name: item.name,
                     user_id: adminUser.id,
                     user_name: `${adminUser.firstName} ${adminUser.lastName} (Approbation)`,
                     change_type: 'submission',
                     quantity_change: quantityChange,
                     old_stock_level: oldStock,
                     new_stock_level: newStock,
                     transaction_ref,
                });
            });
        })
    );
    
    try {
        await Promise.all(updates);
        return { error: null };
    } catch (error: any) {
        console.error("Error during transaction for submission approval:", error);
        // Attempt to roll back status
        await updateSubmissionStatus(submission.id, 'pending');
        return { error: { message: "Une erreur est survenue lors de la mise à jour des stocks. La soumission a été remise en attente.", ...error }};
    }
};


// --- Stock Movements ---
export const getStockMovements = async () => {
    const { data, error } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(500);
    return { data: data as StockMovement[], error };
};

export const addStockMovement = async (movement: Omit<StockMovement, 'id' | 'created_at'>) => {
    return await supabase.from('stock_movements').insert(movement);
};

export const depotRecordConsumption = async (product: Product, quantity: number, user: User) => {
    try {
        const oldStock = product.stock;
        const newStock = oldStock - quantity;
        if (newStock < 0) {
            throw new Error("La quantité consommée ne peut pas dépasser le stock disponible.");
        }

        const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
        if (updateError) throw updateError;
        
        await addStockMovement({
            product_id: product.id,
            product_name: product.name,
            user_id: user.id,
            user_name: `${user.firstName} ${user.lastName}`,
            change_type: 'consumption',
            quantity_change: -quantity,
            old_stock_level: oldStock,
            new_stock_level: newStock,
            transaction_ref: generateTransactionRef('CON')
        });
        
        return { error: null };
    } catch (error: any) {
        console.error("Error recording consumption:", error);
        return { error };
    }
};

export const adminCreateMovement = async (productId: string, quantity: number, movementType: 'admin_entry' | 'admin_exit', adminUser: User) => {
     try {
        const { data: product, error: fetchError } = await supabase.from('products').select('*').eq('id', productId).single();
        if (fetchError || !product) throw new Error("Produit introuvable.");

        const oldStock = product.stock;
        const quantityChange = movementType === 'admin_entry' ? quantity : -quantity;
        const newStock = oldStock + quantityChange;

        if (newStock < 0) {
            throw new Error("Le stock ne peut pas être négatif.");
        }

        const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
        if (updateError) throw updateError;
        
        const refPrefix = movementType === 'admin_entry' ? 'ENT' : 'SOR'; // Entrée / Sortie

        await addStockMovement({
            product_id: product.id,
            product_name: product.name,
            user_id: adminUser.id,
            user_name: `${adminUser.firstName} ${adminUser.lastName}`,
            change_type: movementType,
            quantity_change: quantityChange,
            old_stock_level: oldStock,
            new_stock_level: newStock,
            transaction_ref: generateTransactionRef(refPrefix)
        });
        
        return { error: null };
    } catch (error: any) {
        console.error("Error creating admin movement:", error);
        return { error };
    }
}

export const setDepotInventory = async (depotName: string, inventory: { product: Product, newStock: number }[], adminUser: User) => {
    const transaction_ref = generateTransactionRef('INV');
    const allPromises = [];

    for (const item of inventory) {
        const { product, newStock } = item;

        // Find if an instance of this product already exists in the target depot
        const { data: existingProduct, error: findError } = await supabase
            .from('products')
            .select('*')
            .eq('code', product.code) // Assuming 'code' is the unique identifier for a product type
            .eq('location', depotName)
            .single();

        if (findError && findError.code !== 'PGRST116') { // Ignore 'single row not found' error
            console.error('Error finding existing product for inventory set:', findError);
            continue; // Skip this item on error
        }

        if (existingProduct) { // Product already exists in the depot, we update it
            const oldStock = existingProduct.stock;
            if (oldStock !== newStock) {
                const promise = supabase.from('products').update({ stock: newStock }).eq('id', existingProduct.id)
                    .then(() => addStockMovement({
                        product_id: existingProduct.id,
                        product_name: existingProduct.name,
                        user_id: adminUser.id,
                        user_name: `${adminUser.firstName} ${adminUser.lastName}`,
                        change_type: 'inventory_count',
                        quantity_change: newStock - oldStock,
                        old_stock_level: oldStock,
                        new_stock_level: newStock,
                        transaction_ref,
                    }));
                allPromises.push(promise);
            }
        } else if (newStock > 0) { // Product does not exist, we create it
            const newProductData = {
                ...product,
                id: undefined, // Let Supabase generate a new UUID
                created_at: undefined,
                updated_at: undefined,
                location: depotName,
                stock: newStock,
            };
            delete newProductData.id;
            delete (newProductData as any).created_at;
            delete (newProductData as any).updated_at;

            const promise = supabase.from('products').insert({
                name: newProductData.name,
                code: newProductData.code,
                cas: newProductData.cas,
                formula: newProductData.formula,
                location: newProductData.location,
                stock: newProductData.stock,
                unit: newProductData.unit,
                alert_threshold: newProductData.alertThreshold,
                expiry_date: newProductData.expiryDate,
                ghs_pictograms: newProductData.ghsPictograms,
            }).select().single().then(({ data, error }) => {
                if (error || !data) throw error || new Error("Failed to create product");
                return addStockMovement({
                    product_id: data.id,
                    product_name: data.name,
                    user_id: adminUser.id,
                    user_name: `${adminUser.firstName} ${adminUser.lastName}`,
                    change_type: 'initial',
                    quantity_change: newStock,
                    old_stock_level: 0,
                    new_stock_level: newStock,
                    transaction_ref,
                });
            });
            allPromises.push(promise);
        }
    }

    try {
        await Promise.all(allPromises);
        return { error: null };
    } catch (error: any) {
        console.error("Error during batch inventory update:", error);
        return { error };
    }
};


// --- Alerts ---
export const getAlerts = async () => {
    const { data, error } = await supabase.from('alert_configurations').select('*');
    return { data: data as AlertConfiguration[], error };
};

export const addAlert = async (alert: Partial<AlertConfiguration>) => {
    return await supabase.from('alert_configurations').insert(alert);
};

export const updateAlert = async (alert: AlertConfiguration) => {
    return await supabase.from('alert_configurations').update(alert).eq('id', alert.id);
};

export const deleteAlert = async (alertId: string) => {
    return await supabase.from('alert_configurations').delete().eq('id', alertId);
};