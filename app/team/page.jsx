import { signOut } from '@/app/auth/actions';
import { requireRole } from '@/lib/auth/require-role';

export default async function TeamPage() {
  const { user, profile } = await requireRole(['project_manager'], '/login/employee');
  const name = profile.full_name || user.email;

  return (
    <main className="crm-team-page">
      <header className="crm-team-header">
        <div>
          <h1>Employee Portal</h1>
          <p>Welcome, {name}</p>
        </div>
        <form action={signOut}>
          <button type="submit">Sign Out</button>
        </form>
      </header>

      <section className="crm-team-empty" aria-labelledby="assigned-projects-heading">
        <h2 id="assigned-projects-heading">Assigned projects</h2>
        <p>You do not have any assigned projects yet.</p>
      </section>
    </main>
  );
}
