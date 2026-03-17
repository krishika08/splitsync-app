export default function DashboardPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome to Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          You are successfully logged in.
        </p>

        <button
          type="button"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-2"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
