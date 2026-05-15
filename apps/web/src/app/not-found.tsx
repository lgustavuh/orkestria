import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl font-bold text-indigo-200 mb-4">404</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 text-sm mb-6">A página que você procura não existe ou foi movida.</p>
        <Link href="/dashboard" className="btn-primary">
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
