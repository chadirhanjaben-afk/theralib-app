export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-brand-blue-gray text-sm">Chargement...</p>
      </div>
    </div>
  );
}
