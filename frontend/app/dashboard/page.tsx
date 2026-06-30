'use client';

import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { SimpleTodo } from '@/components/free/SimpleTodo';
import { PaidDashboard } from '@/components/premium/PaidDashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { isPro, isPlus } = useAuth();

  if (isPro) return <PaidDashboard isPro />;
  if (isPlus) return <PaidDashboard isPro={false} />;
  return <SimpleTodo />;
}
