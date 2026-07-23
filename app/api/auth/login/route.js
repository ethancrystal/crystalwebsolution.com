import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return Response.json(
      { error: 'Missing email or password' },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({
    success: true,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}
