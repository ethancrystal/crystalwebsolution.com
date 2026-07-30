import PortalLoginForm from '@/components/auth/PortalLoginForm';
import { PORTALS } from '@/lib/auth/roles.mjs';

export default function ClientLoginPage() {
  return <PortalLoginForm portal={PORTALS.client} />;
}
