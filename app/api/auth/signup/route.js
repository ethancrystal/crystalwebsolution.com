import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function POST(request) {
  const { email, password, fullName } = await request.json();

  if (!email || !password || !fullName) {
    return Response.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // NOTE: role MUST NOT be set in raw_user_meta_data
        // Roles are only set via service role API in raw_app_meta_data
      },
    },
  });

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 });
  }

  return Response.json({
    success: true,
    message: 'Signup successful. Please check your email to confirm.',
    userId: authData.user?.id,
  });
}
