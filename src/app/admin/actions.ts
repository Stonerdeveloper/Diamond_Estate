'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function addResidentAction(formData: FormData) {
    const fullName = formData.get('full_name') as string;
    const role = formData.get('role') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const streetId = formData.get('street_id') as string;
    const apartmentUnit = formData.get('apartment_unit') as string;
    const levyTypeId = formData.get('levy_type_id') as string;
    const monthlyAmount = formData.get('monthly_amount') as string;

    if (!fullName || !role) {
        return { error: 'Full name and role are required' };
    }

    const { data, error } = await supabaseAdmin
        .from('residents')
        .insert({
            full_name: fullName,
            email: email || null,
            phone: phone || null,
            role: role.toLowerCase(),
            street_id: streetId || null,
            apartment_unit: apartmentUnit || null,
            levy_type_id: levyTypeId || null,
            monthly_amount: monthlyAmount ? Number(monthlyAmount) : 0,
            credit_balance: 0,
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to add resident:', error);
        return { error: 'Failed to add resident: ' + error.message };
    }

    return {
        success: true,
        user: {
            id: data.id,
            name: data.full_name,
            email: data.email,
            phone: data.phone,
            role: data.role.charAt(0).toUpperCase() + data.role.slice(1),
            streetId: data.street_id,
            apartmentUnit: data.apartment_unit || 'N/A',
            levyTypeId: data.levy_type_id,
            monthlyAmount: data.monthly_amount,
            creditBalance: data.credit_balance,
            status: 'Active',
        },
    };
}

export async function removeResidentAction(userId: string) {
    if (!userId) return { error: 'User ID is required' };
    const { error } = await supabaseAdmin.from('residents').delete().eq('id', userId);
    if (error) return { error: error.message };
    return { success: true };
}

export async function updateResidentAction(userId: string, formData: FormData) {
    const fullName = formData.get('full_name') as string;
    const role = formData.get('role') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const streetId = formData.get('street_id') as string;
    const apartmentUnit = formData.get('apartment_unit') as string;
    const levyTypeId = formData.get('levy_type_id') as string;
    const monthlyAmount = formData.get('monthly_amount') as string;

    if (!userId || !fullName || !role) return { error: 'Missing required fields' };

    const { error } = await supabaseAdmin
        .from('residents')
        .update({
            full_name: fullName,
            email: email || null,
            phone: phone || null,
            role: role.toLowerCase(),
            street_id: streetId || null,
            apartment_unit: apartmentUnit || null,
            levy_type_id: levyTypeId || null,
            monthly_amount: monthlyAmount ? Number(monthlyAmount) : 0,
        })
        .eq('id', userId);

    if (error) return { error: 'Failed to update resident profile' };

    return {
        success: true,
        user: {
            name: fullName,
            role: role.charAt(0).toUpperCase() + role.slice(1),
            apartmentUnit: apartmentUnit || 'N/A',
            monthlyAmount: Number(monthlyAmount) || 0,
        },
    };
}

export async function recordAdminPaymentAction(data: {
    residentId: string;
    residentName: string;
    amountReceived: number;
    monthsToMark: string[];    // e.g. ['2026-02', '2026-03']
    amountDuePerMonth: number;
    currentCredit: number;
    notes: string;
    recordedBy: string;
    paymentMethod: string;
}) {
    const {
        residentId, residentName, amountReceived, monthsToMark,
        amountDuePerMonth, currentCredit, notes, recordedBy, paymentMethod
    } = data;

    let runningPool = amountReceived + currentCredit; // total available funds
    let newCreditBalance = 0;

    const billInserts: any[] = [];

    for (const monthYear of monthsToMark) {
        if (runningPool <= 0) break;

        const applied = Math.min(runningPool, amountDuePerMonth);
        const status = applied >= amountDuePerMonth ? 'paid' : applied > 0 ? 'partial' : 'unpaid';
        const creditApplied = Math.min(currentCredit, applied);

        billInserts.push({
            resident_id: residentId,
            month_year: monthYear,
            amount_due: amountDuePerMonth,
            amount_paid: applied,
            credit_applied: creditApplied > 0 ? creditApplied : 0,
            months_covered: 1,
            status,
            notes,
            recorded_by: recordedBy,
            payment_method: paymentMethod,
            paid_at: status !== 'unpaid' ? new Date().toISOString() : null,
        });

        runningPool -= amountDuePerMonth;
    }

    // Any remaining in pool is surplus credit
    if (runningPool > 0) {
        newCreditBalance = runningPool;
    }

    // Upsert all bill records
    const { error: billError } = await supabaseAdmin
        .from('monthly_bills')
        .upsert(billInserts, { onConflict: 'resident_id,month_year' });

    if (billError) {
        console.error('Bill insert error:', billError);
        return { error: 'Failed to record payment: ' + billError.message };
    }

    // Update resident credit balance
    await supabaseAdmin
        .from('residents')
        .update({ credit_balance: newCreditBalance })
        .eq('id', residentId);

    return {
        success: true,
        newCreditBalance,
        billsCreated: billInserts.length,
    };
}
