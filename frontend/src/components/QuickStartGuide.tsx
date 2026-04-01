// Quick visual instruction component for the app
// Add this to CheckRoute.tsx in the page header if needed

const QuickStartGuide = () => {
  return (
    <div className="bg-gradient-to-r from-brand-purple/20 to-brand-teal/20 border border-brand-teal/50 rounded-2xl p-6 mb-8 max-w-4xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-white mb-4">🛡️ How to Stay Safe (3 Simple Steps)</h2>
      
      <div className="grid md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <div className="text-3xl mb-2">1️⃣</div>
          <h3 className="font-bold text-white mb-2">Add Your People</h3>
          <p className="text-sm text-white/70">Add phone numbers of people who care about you. When you press SOS, they get a message.</p>
        </div>

        {/* Step 2 */}
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <div className="text-3xl mb-2">2️⃣</div>
          <h3 className="font-bold text-white mb-2">Check Your Route</h3>
          <p className="text-sm text-white/70">Type where you're going. We show you the safest way.</p>
        </div>

        {/* Step 3 */}
        <div className="bg-black/30 rounded-lg p-4 border border-white/10">
          <div className="text-3xl mb-2">3️⃣</div>
          <h3 className="font-bold text-white mb-2">Enable Heartbeat</h3>
          <p className="text-sm text-white/70">We check on you every 2 minutes. If no response → alert sent.</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
        <span className="text-2xl">🆘</span>
        <p className="text-sm text-white/80"><strong>In danger?</strong> Press the big red SOS button. Your contacts get your location instantly.</p>
      </div>
    </div>
  );
};

export default QuickStartGuide;
