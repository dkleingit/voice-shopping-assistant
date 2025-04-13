import RealtimeSession from '@/components/RealtimeSession';

export default function Page() {
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Voice-Enabled Shopping Assistant
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
        Explore our product catalog hands-free! Try asking things like:
        <span className="italic"> "What colors does the smartwatch come in?"</span> or <span className="italic">"What tech products are currently available?"</span>
        </p>
      </header>

      <section className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <RealtimeSession/>
      </section>
    </main>
  );
}
