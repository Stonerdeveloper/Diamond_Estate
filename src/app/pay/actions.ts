'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function recordPaymentAction(data: {
    residentName: string;
    residentEmail: string;
    residentPhone: string;
    streetName: string;
    apartmentUnit: string;
    levyTypeId: string;
    levyName: string;
    amount: number;
    paystackReference: string;
}) {
    const { data: paymentData, error } = await supabaseAdmin
        .from('payments')
        .insert({
            resident_name: data.residentName,
            resident_email: data.residentEmail,
            resident_phone: data.residentPhone || null,
            street_name: data.streetName,
            apartment_unit: data.apartmentUnit,
            levy_type_id: data.levyTypeId,
            amount: data.amount,
            paystack_reference: data.paystackReference,
            status: 'success',
            payment_date: new Date().toISOString(),
        })
        .select('id, receipt_number, payment_date, amount')
        .single();

    if (error) {
        console.error('Payment record error:', error);
        return { error: 'Failed to record payment' };
    }

    return {
        success: true,
        receipt: {
            receiptNumber: paymentData.receipt_number,
            paymentDate: paymentData.payment_date,
            amount: paymentData.amount,
            id: paymentData.id,
        },
    };
}
