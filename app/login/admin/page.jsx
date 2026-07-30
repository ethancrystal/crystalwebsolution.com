import PortalLoginForm from '@/components/auth/PortalLoginForm';
import { PORTALS } from '@/lib/auth/roles.mjs';

export default function AdminLoginPage() {
  return <PortalLoginForm portal={PORTALS.admin} />;
}
