'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);

        // Load companies if user is staff
        if (profileData?.role === 'admin' || profileData?.role === 'staff') {
          const { data: companiesData } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          setCompanies(companiesData || []);
        }
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  const isStaff = profile?.role === 'admin' || profile?.role === 'staff';

  if (isLoading) {
    return (
      <div className="crm-dashboard">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="crm-dashboard">
      <header className="crm-dashboard-header">
        <div className="crm-header-content">
          <h1>CRM Dashboard</h1>
          <p>Welcome, {profile?.full_name || user?.email}</p>
        </div>
        <Link href="/api/auth/logout" className="crm-logout-btn">
          Sign Out
        </Link>
      </header>

      <div className="crm-dashboard-content">
        <section className="crm-dashboard-section">
          <h2>Profile</h2>
          <div className="crm-profile-card">
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Name:</strong> {profile?.full_name || 'Not set'}
            </p>
            <p>
              <strong>Role:</strong> {profile?.role}
            </p>
          </div>
        </section>

        {isStaff && (
          <>
            <section className="crm-dashboard-section">
              <div className="crm-section-header">
                <h2>Recent Companies</h2>
                <Link href="/admin/companies" className="crm-view-all">
                  View All
                </Link>
              </div>
              {companies.length > 0 ? (
                <div className="crm-companies-grid">
                  {companies.map((company) => (
                    <div key={company.id} className="crm-company-card">
                      <h3>{company.name}</h3>
                      <p>{company.email}</p>
                      {company.phone && <p>{company.phone}</p>}
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="crm-card-link"
                      >
                        View Details →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="crm-empty-state">
                  No companies yet.{' '}
                  <Link href="/admin/companies/new">Create one</Link>
                </p>
              )}
            </section>

            <section className="crm-dashboard-section">
              <h2>Admin Area</h2>
              <div className="crm-admin-links">
                <Link href="/admin/companies" className="crm-admin-link">
                  Manage Companies
                </Link>
                <Link href="/admin/contacts" className="crm-admin-link">
                  Manage Contacts
                </Link>
                <Link href="/admin/deals" className="crm-admin-link">
                  Manage Deals
                </Link>
                <Link href="/admin/tasks" className="crm-admin-link">
                  Manage Tasks
                </Link>
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx>{`
        .crm-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
        }

        .crm-dashboard-header {
          background: rgba(30, 35, 60, 0.8);
          border-bottom: 1px solid rgba(100, 200, 255, 0.2);
          padding: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          backdrop-filter: blur(10px);
        }

        .crm-header-content h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #64c8ff;
        }

        .crm-header-content p {
          color: #999;
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

        .crm-dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          display: grid;
          gap: 2rem;
        }

        .crm-dashboard-section {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .crm-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .crm-dashboard-section h2 {
          font-size: 1.5rem;
          color: #64c8ff;
          margin-bottom: 1rem;
        }

        .crm-view-all {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .crm-view-all:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }

        .crm-profile-card {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
        }

        .crm-profile-card p {
          margin-bottom: 0.75rem;
          color: #ccc;
        }

        .crm-companies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .crm-company-card {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .crm-company-card:hover {
          border-color: rgba(100, 200, 255, 0.3);
          transform: translateY(-2px);
        }

        .crm-company-card h3 {
          color: #64c8ff;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .crm-company-card p {
          color: #999;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .crm-card-link {
          color: #64c8ff;
          text-decoration: none;
          font-size: 0.9rem;
          display: inline-block;
          margin-top: 1rem;
          transition: color 0.2s ease;
        }

        .crm-card-link:hover {
          color: #5bb8ff;
          text-decoration: underline;
        }

        .crm-empty-state {
          color: #999;
          text-align: center;
          padding: 2rem;
        }

        .crm-empty-state a {
          color: #64c8ff;
          text-decoration: none;
        }

        .crm-empty-state a:hover {
          text-decoration: underline;
        }

        .crm-admin-links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .crm-admin-link {
          background: linear-gradient(135deg, rgba(100, 200, 255, 0.1) 0%, rgba(100, 200, 255, 0.05) 100%);
          border: 1px solid rgba(100, 200, 255, 0.2);
          color: #64c8ff;
          padding: 1rem;
          border-radius: 8px;
          text-decoration: none;
          text-align: center;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .crm-admin-link:hover {
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
