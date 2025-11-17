// This file defines the core data structures used throughout the application.

export enum Role {
    Admin = 'admin',
    Depot = 'depot',
}

export enum UserStatus {
    Active = 'active',
    Pending = 'pending',
    Inactive = 'inactive',
    Rejected = 'rejected',
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    service: string;
    phone: string;
    role: Role;
    status: UserStatus;
}

export type Page = 
    | 'dashboard' 
    | 'products' 
    | 'users' 
    | 'depots' 
    | 'ai-analysis'
    | 'statistics'
    | 'alerts'
    | 'movements'
    | 'history' // New page for admins
    | 'depot-management'
    | 'depot-inventory'
    | 'inbox';


export interface StockMovement {
    id: string;
    product_id: string;
    product_name: string;
    user_id: string;
    user_name: string;
    change_type: 'initial' | 'update' | 'correction' | 'import' | 'submission' | 'consumption' | 'admin_entry' | 'admin_exit' | 'inventory_count';
    quantity_change: number;
    old_stock_level: number;
    new_stock_level: number;
    created_at: string;
    transaction_ref: string; // Added for BE/BS traceability
}

export interface Product {
    id: string;
    name: string;
    code: string;
    cas: string;
    formula: string;
    location: string;
    stock: number;
    unit: string;
    alertThreshold: number;
    imageUrl: string | null;
    safetySheetUrl: string | null;
    ghsPictograms: string[];
    created_at: string;
    updated_at: string;
    expiryDate: string;
}

export interface InventoryItem {
    productId: string;
    name: string;
    quantity: number;
}

export interface InventorySubmission {
    id: string;
    depotId: string;
    depotName: string;
    items: InventoryItem[];
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface Depot {
    id: string;
    name: string;
    color: string;
    active: boolean;
    role: Role.Depot;
}

export interface ChatMessage {
    id: string | number;
    created_at: string;
    sender_id: string;
    sender_name: string;
    conversation_id: string;
    content: string;
}

export interface Message {
    id: string;
    from: {
        service: string;
    };
    subject: string;
    body: string;
    timestamp: string;
    isRead: boolean;
}

export interface AlertConfiguration {
    id: string;
    alert_type: 'expiry';
    threshold_days: number;
    emails_to_notify: string[];
    is_active: boolean;
    last_triggered_at?: string;
    created_at: string;
}