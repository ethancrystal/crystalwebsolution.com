import PortalLoginForm from '@/components/auth/PortalLoginForm';
import { PORTALS } from '@/lib/auth/roles.mjs';

export default function EmployeeLoginPage() {
  return <PortalLoginForm portal={PORTALS.employee} />;
}
