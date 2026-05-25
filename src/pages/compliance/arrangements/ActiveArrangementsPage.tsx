import ArrangementListPage from './ArrangementListPage';
export default function ActiveArrangementsPage() {
  return <ArrangementListPage title="Active Arrangements" subtitle="Currently active payment plans."
    statuses={['ACTIVE']} featureKey="arrangements.active" />;
}
