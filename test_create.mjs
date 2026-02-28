import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    'https://pabulcoizmsjlvbwbyrv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnVsY29pem1zamx2YndieXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2Mjc0NiwiZXhwIjoyMDg3ODM4NzQ2fQ.RF86hpm4X5bgIqtbWE6yTBUKHSHEaQMZuRIgte-YnHA',
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testCreate() {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: 'newuser_' + Date.now() + '@example.com',
        password: 'password123',
        email_confirm: true,
    });

    if (error) {
        console.error("CREATE ERROR:", error);
        return;
    }
    console.log("CREATE SUCCESS:", data.user.id);

    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: data.user.id,
            full_name: 'Test Jane',
            role: 'landlord'
        });

    if (profileError) {
        console.error("PROFILE ERROR:", profileError);
    } else {
        console.log("PROFILE SUCCESS");
    }
}

testCreate();
