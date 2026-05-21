import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center
                     justify-center px-6">
      <span className="text-6xl mb-6">🔍</span>
      <h1 className="text-2xl font-bold mb-3">Repo introuvable</h1>
      <p className="text-gray-400 text-sm mb-8 text-center max-w-sm">
        Ce repo GitHub n'existe pas ou l'analyse a échoué.
        Vérifiez l'URL et réessayez.
      </p>
      <Link
        href="/"
        className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-semibold
                   px-6 py-3 rounded-lg transition-colors text-sm"
      >
        ← Retour à l'accueil
      </Link>
    </main>
  );
}
