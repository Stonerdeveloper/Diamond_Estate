export type UserRole = 'landlord' | 'tenant' | 'admin';

export interface Profile {
    id: string;
    full_name: string | null;
    phone: string | null;
    role: UserRole;
    created_at: string;
}

export interface Street {
    id: string;
    name: string;
}

export interface Apartment {
    id: string;
    street_id: string;
    unit_number: string;
}

export interface LevyType {
    id: string;
    name: string;
    description: string | null;
}

export interface LevyRate {
    id: string;
    levy_type_id: string;
    resident_role: UserRole;
    amount: number;
}

export interface LevyBill {
    id: string;
    apartment_id: string;
    levy_type_id: string;
    amount: number;
    billing_period: string;
    status: 'unpaid' | 'partial' | 'paid';
}

export interface Payment {
    id: string;
    bill_id: string;
    resident_id: string;
    amount: number;
    payment_date: string;
    paystack_reference: string;
    status: 'success' | 'failed' | 'pending';
}

export interface Broadcast {
    id: string;
    sender_id: string;
    title: string;
    content: string;
    target_audience: string;
    sent_at: string;
}
