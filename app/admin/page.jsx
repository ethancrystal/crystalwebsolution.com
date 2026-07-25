'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    companies: 0,
    contacts: 0,
    deals: 0,
    tasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      try {
        const [companiesRes, contactsRes, dealsRes, tasksRes] = await Promise.all([
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('contacts').select('id', { count: 'exact', head: true }),
          supabase.from('deals').select('id', { count: 'exact', head: true }),
          supabase.from('tasks').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          companies: companiesRes.count || 0,
          contacts: contactsRes.count || 0,
          deals: dealsRes.count || 0,
          tasks: tasksRes.count || 0,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="crm-admin-dashboard">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="crm-admin-dashboard">
      <header className="crm-admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.email}</p>
        </div>
        <Link href="/api/auth/logout" className="crm-logout-btn">
          Sign Out
        </Link>
      </header>

      <div className="crm-admin-content">
        <div className="crm-stats-grid">
          <div className="crm-stat-card">
            <h3>Companies</h3>
            <div className="crm-stat-number">{stats.companies}</div>
            <Link href="/admin/companies">Manage</Link>
          </div>

          <div className="crm-stat-card">
            <h3>Contacts</h3>
            <div className="crm-stat-number">{stats.contacts}</div>
            <Link href="/admin/contacts">Manage</Link>
          </div>

          <div className="crm-stat-card">
            <h3>Deals</h3>
            <div className="crm-stat-number">{stats.deals}</div>
            <Link href="/admin/deals">Manage</Link>
          </div>

          <div className="crm-stat-card">
            <h3>Tasks</h3>
            <div className="crm-stat-number">{stats.tasks}</div>
            <Link href="/admin/tasks">Manage</Link>
          </div>
        </div>

        <section className="crm-quick-actions">
          <h2>Quick Actions</h2>
          <div className="crm-action-buttons">
            <Link href="/admin/companies/new" className="crm-action-btn">
              + New Company
            </Link>
            <Link href="/admin/contacts/new" className="crm-action-btn">
              + New Contact
            </Link>
            <Link href="/admin/deals/new" className="crm-action-btn">
              + New Deal
            </Link>
            <Link href="/admin/tasks/new" className="crm-action-btn">
              + New Task
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .crm-admin-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
        }

        .crm-admin-header {
          background: rgba(30, 35, 60, 0.8);
          border-bottom: 1px solid rgba(100, 200, 255, 0.2);
          padding: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          backdrop-filter: blur(10px);
        }

        .crm-admin-header h1 {
          font-size: 2rem;
          color: #64c8ff;
          margin-bottom: 0.5rem;
        }

        .crm-admin-header p {
          color: #999;
          font-size: 0.9rem;
        }

        .crm-logout-btn {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .crm-logout-btn:hover {
          background: rgba(255, 100, 100, 0.2);
        }

        .crm-admin-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          display: grid;
          gap: 2rem;
        }

        .crm-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .crm-stat-card {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }

        .crm-stat-card:hover {
          border-color: rgba(100, 200, 255, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(100, 200, 255, 0.1);
        }

        .crm-stat-card h3 {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .crm-stat-number {
          font-size: 3rem;
          color: #64c8ff;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .crm-stat-card a {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .crm-stat-card a:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }

        .crm-quick-actions {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 12px;
          padding: 2rem;
          backdrop-filter: blur(10px);
        }

        .crm-quick-actions h2 {
          color: #64c8ff;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .crm-action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .crm-action-btn {
          background: linear-gradient(135deg, rgba(100, 200, 255, 0.1) 0%, rgba(100, 200, 255, 0.05) 100%);
          border: 1px solid rgba(100, 200, 255, 0.2);
          color: #64c8ff;
          padding: 1rem;
          border-radius: 8px;
          text-decoration: none;
          text-align: center;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .crm-action-btn:hover {
          background: linear-gradient(135deg, rgba(100, 200, 255, 0.2) 0%, rgba(100, 200, 255, 0.1) 100%);
          border-color: rgba(100, 200, 255, 0.4);
          transform: translateY(-2px);
        }

        .crm-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: #64c8ff;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}
