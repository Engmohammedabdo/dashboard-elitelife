'use client';

import { Suspense } from 'react';
import Sidebar from './Sidebar';

function SidebarFallback() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-[260px] bg-white border-r border-gray-100 flex flex-col z-40 shadow-sm">
      <div className="p-4 border-b border-gray-100 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </nav>
    </aside>
  );
}

export default function SidebarWrapper() {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <Sidebar />
    </Suspense>
  );
}
