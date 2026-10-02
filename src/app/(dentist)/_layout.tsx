import { RoleTabsLayout } from '@/components/layout/RoleTabsLayout';
import { DENTIST_TABS } from '@/constants/role-tabs';

export default function DentistLayout() {
  return <RoleTabsLayout tabs={DENTIST_TABS} />;
}
