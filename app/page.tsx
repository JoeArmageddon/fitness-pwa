// ============================================================
// DASHBOARD PAGE - Personal Performance Overview
// ============================================================

import { Suspense } from 'react';
import DashboardClient from './dashboard-client';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-4 pt-14 space-y-4">
      <div className="skeleton h-8 w-40 mt-2" />
      <div className="skeleton h-40 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
      </div>
      <div className="skeleton h-36 rounded-2xl" />
    </div>
  );
}