export default function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
      {message}
    </div>
  );
}
