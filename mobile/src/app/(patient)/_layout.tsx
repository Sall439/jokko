import { RoleTabsLayout } from '@/components/layout/RoleTabsLayout';
import { PATIENT_TABS } from '@/constants/role-tabs';

export default function PatientLayout() {
  return <RoleTabsLayout tabs={PATIENT_TABS} />;
}
