/**
 * Script Puppeteer pour capturer les 6 screenshots des pages Agent IA.
 * Genere des pages HTML standalone avec Tailwind CDN pour des captures fiables.
 *
 * Usage:  node take-agent-screenshots.js
 * Pre-requis: Chrome installe
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'frontend', 'public', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ═══════════════ Common HTML wrapper ═══════════════

function wrap(body, { title = '', hasSidebar = true, fullPage = false } = {}) {
  const sidebarHTML = hasSidebar ? `
    <aside class="fixed inset-y-0 left-0 z-30 w-56 flex flex-col text-white shadow-xl" style="background: linear-gradient(180deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)">
      <div class="flex items-center h-14 px-3 border-b border-white/10">
        <div class="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <span class="text-white font-bold text-xs">T</span>
        </div>
        <div class="ml-2.5"><span class="text-sm font-extrabold tracking-tight">TEGS</span><span class="text-[10px] text-blue-300 block -mt-0.5">Learning LCMS</span></div>
      </div>
      <nav class="flex-1 py-3 px-2 space-y-0.5 text-xs">
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200/70 hover:bg-white/10 transition"><span>📊</span><span>Dashboard</span></a>
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200/70 hover:bg-white/10 transition"><span>📚</span><span>Modules</span></a>
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200/70 hover:bg-white/10 transition"><span>🏆</span><span>Tournois</span></a>
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200/70 hover:bg-white/10 transition"><span>👥</span><span>Utilisateurs</span></a>
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200/70 hover:bg-white/10 transition"><span>💰</span><span>Sponsors</span></a>
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-200/70 hover:bg-white/10 transition"><span>📈</span><span>Analytics</span></a>
        <div class="!mt-3 pt-3 border-t border-white/10">
          <span class="px-3 text-[10px] text-blue-300/50 uppercase font-semibold tracking-wider">Agent IA</span>
        </div>
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg ${title.includes('Agent IA') && !title.includes('Config') ? 'bg-white/15 text-white font-semibold' : 'text-blue-200/70 hover:bg-white/10'} transition"><span>🤖</span><span>Surveillance</span></a>
        <a class="flex items-center gap-2.5 px-3 py-2 rounded-lg ${title.includes('Config') ? 'bg-white/15 text-white font-semibold' : 'text-blue-200/70 hover:bg-white/10'} transition"><span>⚙️</span><span>Configuration</span></a>
      </nav>
      <div class="p-3 border-t border-white/10">
        <div class="flex items-center gap-2 px-2">
          <div class="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">SA</div>
          <div><p class="text-xs font-medium">Super Admin</p><p class="text-[10px] text-blue-300/60">admin@ddene.ht</p></div>
        </div>
      </div>
    </aside>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { font-family: 'Inter', system-ui, sans-serif; }
    body { margin: 0; }
  </style>
</head>
<body class="bg-gray-50 antialiased">
  ${sidebarHTML}
  <div class="${hasSidebar ? 'ml-56' : ''} ${fullPage ? '' : 'min-h-screen'}">
    ${body}
  </div>
</body>
</html>`;
}

// ═══════════════ Page 1: Agent Dashboard ═══════════════

const DASHBOARD_HTML = wrap(`
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Agent IA</h1>
        <p class="text-sm text-gray-500 mt-1">Surveillance, audit et controle du systeme agentique</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition">
          COUPER L'AGENT
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Sessions actives</p><p class="text-2xl font-bold text-gray-900">12</p></div>
      <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Requetes (1h)</p><p class="text-2xl font-bold text-blue-600">47</p></div>
      <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Requetes (24h)</p><p class="text-2xl font-bold text-teal-600">318</p></div>
      <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Erreurs totales</p><p class="text-2xl font-bold text-red-600">3</p></div>
    </div>

    <!-- Audit Logs -->
    <div class="bg-white rounded-xl border overflow-hidden">
      <div class="px-5 py-4 border-b flex items-center justify-between">
        <h2 class="font-semibold text-gray-900">Journal d'audit</h2>
        <button class="text-xs text-teal-600 hover:text-teal-800 font-medium">&#x21BB; Actualiser</button>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">Date</th>
            <th class="px-4 py-3 text-left">Role</th>
            <th class="px-4 py-3 text-left">Action</th>
            <th class="px-4 py-3 text-left">Statut</th>
            <th class="px-4 py-3 text-right">Temps</th>
            <th class="px-4 py-3 text-left">Extrait</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 10:24</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-700">admin_ddene</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">chat</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">success</span></td>
            <td class="px-4 py-3 text-right text-gray-500">842ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Quels tournois sont ouverts ?</td>
          </tr>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 10:19</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-purple-100 text-purple-700">student</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">chat</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">success</span></td>
            <td class="px-4 py-3 text-right text-gray-500">1204ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Comment m'inscrire au concours ?</td>
          </tr>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 10:14</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-amber-100 text-amber-700">authorized_agent</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">tool:commissionCalc</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">success</span></td>
            <td class="px-4 py-3 text-right text-gray-500">623ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Calcule ma commission Mars</td>
          </tr>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 10:09</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700">superadmin</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">tool:tournamentCreate</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-700">confirmed</span></td>
            <td class="px-4 py-3 text-right text-gray-500">1875ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Cree un tournoi Maths 3 rounds</td>
          </tr>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 10:04</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-700">admin_ddene</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">chat</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">success</span></td>
            <td class="px-4 py-3 text-right text-gray-500">567ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Combien de participants hier ?</td>
          </tr>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 09:59</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-purple-100 text-purple-700">student</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">chat</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">success</span></td>
            <td class="px-4 py-3 text-right text-gray-500">432ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Quand est le prochain round ?</td>
          </tr>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 09:49</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-700">admin_ddene</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">tool:analyticsOverview</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">success</span></td>
            <td class="px-4 py-3 text-right text-gray-500">1100ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Dashboard KPIs</td>
          </tr>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 09:34</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-amber-100 text-amber-700">authorized_agent</span></td>
            <td class="px-4 py-3 font-medium text-gray-800">chat</td>
            <td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700">error</span></td>
            <td class="px-4 py-3 text-right text-gray-500">5002ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Genere bordereau collecte</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
`, { title: 'Agent IA' });

// ═══════════════ Page 2: Agent Settings ═══════════════

const SETTINGS_HTML = wrap(`
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Configuration Agent IA</h1>
        <p class="text-sm text-gray-500 mt-1">Limites, outils, modele LLM et acces public</p>
      </div>
      <button class="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition">Enregistrer</button>
    </div>

    <div class="space-y-6">
      <!-- General -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">General</h2>
        <div class="grid md:grid-cols-2 gap-6">
          <label class="flex items-center gap-3"><input type="checkbox" checked class="w-4 h-4 text-teal-600 rounded accent-teal-600" /><span class="text-sm">Agent active pour cette organisation</span></label>
          <label class="flex items-center gap-3"><input type="checkbox" checked class="w-4 h-4 text-teal-600 rounded accent-teal-600" /><span class="text-sm">Agent public (visiteurs non connectes)</span></label>
        </div>
      </div>

      <!-- LLM Model -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Modele LLM</h2>
        <div class="flex gap-4">
          <label class="flex-1 relative cursor-pointer">
            <input type="radio" name="model" class="sr-only peer" />
            <div class="border-2 rounded-xl p-4 transition peer-checked:border-teal-500 peer-checked:bg-teal-50">
              <p class="font-semibold text-sm">Gemini Flash Lite</p><p class="text-xs text-gray-500 mt-1">Rapide, economique</p><p class="text-xs font-medium mt-2 text-green-600">$0.01 / 1K tokens</p>
            </div>
          </label>
          <label class="flex-1 relative cursor-pointer">
            <input type="radio" name="model" checked class="sr-only peer" />
            <div class="border-2 rounded-xl p-4 transition peer-checked:border-teal-500 peer-checked:bg-teal-50 border-teal-500 bg-teal-50">
              <p class="font-semibold text-sm">Gemini 2.0 Flash</p><p class="text-xs text-gray-500 mt-1">Equilibre qualite/cout</p><p class="text-xs font-medium mt-2 text-blue-600">$0.04 / 1K tokens</p>
            </div>
          </label>
          <label class="flex-1 relative cursor-pointer">
            <input type="radio" name="model" class="sr-only peer" />
            <div class="border-2 rounded-xl p-4 transition peer-checked:border-teal-500 peer-checked:bg-teal-50">
              <p class="font-semibold text-sm">Gemini Pro</p><p class="text-xs text-gray-500 mt-1">Haute precision</p><p class="text-xs font-medium mt-2 text-amber-600">$0.12 / 1K tokens</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Rate Limits -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Limites de debit (messages/heure)</h2>
        <div class="grid md:grid-cols-3 gap-4">
          <div><label class="text-xs text-gray-500 font-medium">Candidat (student)</label><input type="number" value="15" class="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none" /></div>
          <div><label class="text-xs text-gray-500 font-medium">Agent collecteur</label><input type="number" value="30" class="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none" /></div>
          <div><label class="text-xs text-gray-500 font-medium">Administrateur</label><input type="number" value="60" class="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none" /></div>
        </div>
      </div>

      <!-- Tool Management -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Gestion des outils par role</h2>
        <p class="text-xs text-gray-500 mb-4">Decochez un outil pour le desactiver pour un role specifique.</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr><th class="px-3 py-2 text-left">Outil</th><th class="px-3 py-2 text-center">Candidat</th><th class="px-3 py-2 text-center">Agent</th><th class="px-3 py-2 text-center">Admin</th><th class="px-3 py-2 text-center">SuperAdmin</th></tr>
            </thead>
            <tbody class="divide-y">
              <tr class="hover:bg-gray-50"><td class="px-3 py-2"><p class="font-medium text-gray-800">Recherche Documentation</p><p class="text-[10px] text-gray-400">searchDocumentation</p></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td></tr>
              <tr class="hover:bg-gray-50"><td class="px-3 py-2"><p class="font-medium text-gray-800">FAQ</p><p class="text-[10px] text-gray-400">faq</p></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td></tr>
              <tr class="hover:bg-gray-50"><td class="px-3 py-2"><p class="font-medium text-gray-800">Liste Tournois</p><p class="text-[10px] text-gray-400">tournamentList</p></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td></tr>
              <tr class="hover:bg-gray-50"><td class="px-3 py-2"><p class="font-medium text-gray-800">Detail Tournoi</p><p class="text-[10px] text-gray-400">tournamentDetail</p></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td></tr>
              <tr class="hover:bg-gray-50"><td class="px-3 py-2"><p class="font-medium text-gray-800">Creer Tournoi</p><p class="text-[10px] text-gray-400">tournamentCreate</p></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td></tr>
              <tr class="hover:bg-gray-50"><td class="px-3 py-2"><p class="font-medium text-gray-800">Calcul Commission</p><p class="text-[10px] text-gray-400">commissionCalc</p></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td></tr>
              <tr class="hover:bg-gray-50"><td class="px-3 py-2"><p class="font-medium text-gray-800">Dashboard Analytics</p><p class="text-[10px] text-gray-400">analyticsOverview</p></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td><td class="px-3 py-2 text-center"><input type="checkbox" checked class="w-4 h-4 accent-teal-600 rounded" /></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Token Usage -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Consommation du mois</h2>
        <div class="grid md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-xl"><p class="text-2xl font-bold text-gray-900">1 247</p><p class="text-xs text-gray-500 mt-1">Requetes</p></div>
          <div class="text-center p-4 bg-gray-50 rounded-xl"><p class="text-2xl font-bold text-teal-600">892K</p><p class="text-xs text-gray-500 mt-1">Tokens estimes</p></div>
          <div class="text-center p-4 bg-gray-50 rounded-xl"><p class="text-2xl font-bold text-blue-600">~$2.14</p><p class="text-xs text-gray-500 mt-1">Cout estime</p></div>
        </div>
      </div>
    </div>
  </div>
`, { title: 'Config Agent IA' });

// ═══════════════ Page 3: Panic Mode ═══════════════

const PANIC_HTML = wrap(`
  <!-- Panic Banner -->
  <div class="bg-red-600 text-white text-center py-2.5 text-sm font-bold flex items-center justify-center gap-2">
    <span class="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
    PANIC MODE — Agent IA desactive pour tous les utilisateurs
  </div>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Agent IA</h1>
        <p class="text-sm text-gray-500 mt-1">Surveillance, audit et controle du systeme agentique</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          <span class="text-sm font-bold text-red-600">PANIC MODE ACTIF</span>
        </div>
        <button class="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition">Reactiver l'Agent</button>
      </div>
    </div>

    <!-- Stats (zeroed) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border p-4 border-red-200"><p class="text-xs text-gray-500 mb-1">Sessions actives</p><p class="text-2xl font-bold text-red-600">0</p></div>
      <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Requetes (1h)</p><p class="text-2xl font-bold text-gray-400">0</p></div>
      <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Requetes (24h)</p><p class="text-2xl font-bold text-teal-600">271</p></div>
      <div class="bg-white rounded-xl border p-4"><p class="text-xs text-gray-500 mb-1">Erreurs totales</p><p class="text-2xl font-bold text-red-600">3</p></div>
    </div>

    <!-- Alert -->
    <div class="bg-red-50 border-2 border-red-200 rounded-xl p-5 mb-6">
      <div class="flex items-start gap-3">
        <span class="text-2xl">&#x26A0;&#xFE0F;</span>
        <div>
          <h3 class="font-bold text-red-800 mb-1">Panic Mode active par Super Admin</h3>
          <p class="text-sm text-red-700">L'agent IA est completement desactive. Aucune requete ne sera traitee tant que le mode Panic est actif. Active le 16/04/2026 a 10:30.</p>
        </div>
      </div>
    </div>

    <!-- Audit table (truncated) -->
    <div class="bg-white rounded-xl border overflow-hidden">
      <div class="px-5 py-4 border-b"><h2 class="font-semibold text-gray-900">Journal d'audit</h2></div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr><th class="px-4 py-3 text-left">Date</th><th class="px-4 py-3 text-left">Role</th><th class="px-4 py-3 text-left">Action</th><th class="px-4 py-3 text-left">Statut</th><th class="px-4 py-3 text-right">Temps</th><th class="px-4 py-3 text-left">Extrait</th></tr>
        </thead>
        <tbody class="divide-y">
          <tr class="bg-red-50/50"><td class="px-4 py-3 text-red-700 font-bold whitespace-nowrap">16/04 10:30</td><td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700">superadmin</span></td><td class="px-4 py-3 font-bold text-red-700">panic:activated</td><td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700">executed</span></td><td class="px-4 py-3 text-right text-gray-500">12ms</td><td class="px-4 py-3 text-red-600">Kill switch active</td></tr>
          <tr class="hover:bg-gray-50"><td class="px-4 py-3 text-gray-600 whitespace-nowrap">16/04 10:24</td><td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-700">admin_ddene</span></td><td class="px-4 py-3 font-medium text-gray-800">chat</td><td class="px-4 py-3"><span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">success</span></td><td class="px-4 py-3 text-right text-gray-500">842ms</td><td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">Quels tournois sont ouverts ?</td></tr>
        </tbody>
      </table>
    </div>
  </div>
`, { title: 'Agent IA - Panic' });

// ═══════════════ Page 4: Chat Panel ═══════════════

const CHAT_HTML = wrap(`
  <div class="p-6">
    <!-- Fake page content behind -->
    <h1 class="text-2xl font-bold text-gray-900 mb-4">Modules</h1>
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border p-5 h-32"><div class="w-10 h-10 rounded-lg bg-blue-100 mb-3"></div><p class="font-semibold text-sm text-gray-800">Mathematiques Avancees</p><p class="text-xs text-gray-500 mt-1">3 sections · 24 ecrans</p></div>
      <div class="bg-white rounded-xl border p-5 h-32"><div class="w-10 h-10 rounded-lg bg-green-100 mb-3"></div><p class="font-semibold text-sm text-gray-800">Sciences Experimentales</p><p class="text-xs text-gray-500 mt-1">2 sections · 18 ecrans</p></div>
      <div class="bg-white rounded-xl border p-5 h-32"><div class="w-10 h-10 rounded-lg bg-purple-100 mb-3"></div><p class="font-semibold text-sm text-gray-800">Francais & Litterature</p><p class="text-xs text-gray-500 mt-1">4 sections · 32 ecrans</p></div>
    </div>
  </div>

  <!-- Agent Chat Panel -->
  <div class="fixed z-50 right-4 bottom-4 w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style="max-height: calc(100vh - 100px)">
    <div class="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">IA</div>
        <div><h3 class="font-bold text-sm">TEGS Agent</h3><div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-green-300"></span><p class="text-[10px] text-teal-200">Connecte — Architecte Admin</p></div></div>
      </div>
      <div class="flex items-center gap-1">
        <button class="p-1.5 hover:bg-white/20 rounded-lg transition text-xs">&#x21BB;</button>
        <button class="p-1.5 hover:bg-white/20 rounded-lg transition"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto px-3 py-4 space-y-3" style="min-height:350px">
      <!-- User -->
      <div class="flex justify-end"><div class="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm bg-gradient-to-r from-teal-500 to-emerald-500 text-white">Quels tournois sont ouverts aux inscriptions ?</div></div>
      <!-- Agent -->
      <div class="flex justify-start"><div class="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm bg-gray-100 text-gray-800">
        <p class="mb-2">Voici les <strong>2 tournois</strong> actuellement ouverts :</p>
        <div class="bg-white rounded-lg border p-3 mb-2"><p class="font-semibold text-teal-700 text-sm">&#x1F3C6; Concours Excellence Maths 2026</p><p class="text-xs text-gray-500 mt-1">3 rounds · 248 inscrits · Cloture : 25 avril</p></div>
        <div class="bg-white rounded-lg border p-3 mb-2"><p class="font-semibold text-teal-700 text-sm">&#x1F3C6; Defi Sciences Nord-Est</p><p class="text-xs text-gray-500 mt-1">2 rounds · 112 inscrits · Cloture : 30 avril</p></div>
        <p class="text-xs text-gray-500 mt-2">Tapez le nom d'un tournoi pour plus de details.</p>
      </div></div>
      <!-- User 2 -->
      <div class="flex justify-end"><div class="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm bg-gradient-to-r from-teal-500 to-emerald-500 text-white">Combien de participants hier ?</div></div>
      <!-- Agent 2 -->
      <div class="flex justify-start"><div class="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm bg-gray-100 text-gray-800">
        <p>Hier, <strong>47 nouveaux participants</strong> se sont inscrits :</p>
        <ul class="text-xs mt-2 space-y-1 text-gray-600"><li>&#x2022; Concours Excellence Maths : <strong>31</strong> inscriptions</li><li>&#x2022; Defi Sciences Nord-Est : <strong>16</strong> inscriptions</li></ul>
        <p class="text-xs text-gray-500 mt-2">Le taux de conversion est de 72% (inscriptions &#x2192; paiement confirme).</p>
      </div></div>
    </div>
    <div class="border-t px-3 py-3 flex-shrink-0">
      <div class="flex gap-2">
        <input type="text" placeholder="Posez votre question..." class="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
        <button class="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">&#x27A4;</button>
      </div>
    </div>
  </div>
`, { title: 'Modules' });

// ═══════════════ Page 5: Proposal Card ═══════════════

const PROPOSAL_HTML = wrap(`
  <div class="p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-4">Tournois</h1>
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border p-5"><div class="flex items-center gap-3 mb-2"><span class="text-xl">&#x1F3C6;</span><p class="font-semibold text-gray-800">Concours Excellence Maths</p></div><p class="text-xs text-gray-500">Round 1 en cours · 248 participants</p></div>
      <div class="bg-white rounded-xl border p-5"><div class="flex items-center gap-3 mb-2"><span class="text-xl">&#x1F52C;</span><p class="font-semibold text-gray-800">Defi Sciences Nord-Est</p></div><p class="text-xs text-gray-500">Inscriptions ouvertes · 112 inscrits</p></div>
    </div>
  </div>

  <!-- Agent Chat Panel with Proposal -->
  <div class="fixed z-50 right-4 bottom-4 w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style="max-height: calc(100vh - 100px)">
    <div class="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">IA</div>
        <div><h3 class="font-bold text-sm">TEGS Agent</h3><div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-green-300"></span><p class="text-[10px] text-teal-200">Connecte — Architecte Admin</p></div></div>
      </div>
      <div class="flex items-center gap-1">
        <button class="p-1.5 hover:bg-white/20 rounded-lg transition text-xs">&#x21BB;</button>
        <button class="p-1.5 hover:bg-white/20 rounded-lg transition"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto px-3 py-4 space-y-3" style="min-height:380px">
      <!-- User request -->
      <div class="flex justify-end"><div class="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm bg-gradient-to-r from-teal-500 to-emerald-500 text-white">Cree un tournoi Maths de 3 rounds pour mai</div></div>
      <!-- Agent response -->
      <div class="flex justify-start"><div class="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm bg-gray-100 text-gray-800">
        Je vais creer ce tournoi. Veuillez confirmer les details ci-dessous :
      </div></div>
      <!-- Proposal Card -->
      <div class="mx-3 mb-1 rounded-xl border-2 border-yellow-300 overflow-hidden">
        <div class="px-4 py-2.5 text-sm font-semibold flex items-center gap-2 bg-yellow-50 text-yellow-800">
          <span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          <span>Action en attente de confirmation</span>
        </div>
        <div class="px-4 py-3 bg-white text-sm text-gray-700">
          <p class="font-medium mb-1">Creer le tournoi &#xAB; Concours Excellence Maths Mai 2026 &#xBB;</p>
          <div class="text-xs text-gray-500 mt-2 space-y-0.5">
            <div><span class="font-medium">Nom:</span> Concours Excellence Maths Mai 2026</div>
            <div><span class="font-medium">Rounds:</span> 3</div>
            <div><span class="font-medium">Module:</span> Mathematiques Avancees</div>
            <div><span class="font-medium">Frais:</span> 500 HTG</div>
            <div><span class="font-medium">Debut inscriptions:</span> 1 mai 2026</div>
          </div>
        </div>
        <div class="px-4 py-3 bg-gray-50 flex gap-2 border-t">
          <button class="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition">Confirmer</button>
          <button class="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition border border-red-200">Annuler</button>
        </div>
      </div>
    </div>
    <div class="border-t px-3 py-3 flex-shrink-0">
      <div class="flex gap-2">
        <input type="text" placeholder="Posez votre question..." class="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
        <button class="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-sm font-semibold">&#x27A4;</button>
      </div>
    </div>
  </div>
`, { title: 'Tournois' });

// ═══════════════ Page 6: Vision ═══════════════

const VISION_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { font-family: 'Inter', system-ui, sans-serif; }
    body { margin: 0; }
  </style>
</head>
<body class="bg-white antialiased">
  <!-- Hero -->
  <section class="relative text-white overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-20 left-10 w-72 h-72 bg-teal-400 rounded-full blur-3xl"></div>
      <div class="absolute bottom-10 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
    </div>
    <div class="relative max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
      <div class="inline-block px-4 py-1.5 bg-teal-500/20 border border-teal-400/30 rounded-full text-teal-300 text-xs font-semibold mb-6">
        DDENE &middot; Nord-Est d'Haiti
      </div>
      <h1 class="text-4xl md:text-6xl font-black leading-tight mb-6">
        Redefinir le merite,<br>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">numeriser l'avenir.</span>
      </h1>
      <p class="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-10 leading-relaxed">
        TEGS-Arena modernise les concours academiques en Haiti : transparence totale, correction instantanee, equite garantie. Parce que chaque talent merite sa chance.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        <a class="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-teal-500/25">Voir les Concours Actifs</a>
        <a class="px-8 py-3.5 bg-white/10 border border-white/20 rounded-xl font-bold text-sm backdrop-blur-sm">Decouvrir l'Impact</a>
      </div>
    </div>
  </section>

  <!-- 3 Pillars -->
  <section class="max-w-6xl mx-auto px-6 py-20">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-black text-gray-900">Les 3 Piliers de l'Impact</h2>
      <p class="text-gray-500 mt-3 max-w-xl mx-auto">Comment TEGS-Arena transforme l'education dans le Nord-Est et au-dela.</p>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="bg-gradient-to-br from-gray-50 to-white border rounded-2xl p-8 hover:shadow-xl transition-shadow">
        <div class="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl mb-5">&#x1F3AF;</div>
        <h3 class="text-lg font-bold text-gray-900 mb-3">Equite & Transparence</h3>
        <p class="text-sm text-gray-600 leading-relaxed">Correction automatique, anti-triche, resultats en temps reel. Le merite — pas les connexions.</p>
        <ul class="mt-4 space-y-2">
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>Quiz chronometres anti-triche</span></li>
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>Certificats PDF verifiables</span></li>
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>Resultats publics en direct</span></li>
        </ul>
      </div>
      <div class="bg-gradient-to-br from-gray-50 to-white border rounded-2xl p-8 hover:shadow-xl transition-shadow">
        <div class="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl mb-5">&#x1F916;</div>
        <h3 class="text-lg font-bold text-gray-900 mb-3">Agent IA Integre</h3>
        <p class="text-sm text-gray-600 leading-relaxed">Un assistant intelligent qui repond, agit, et cree — sous supervision humaine stricte.</p>
        <ul class="mt-4 space-y-2">
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>3 profils role (candidat, agent, admin)</span></li>
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>13 outils specialises</span></li>
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>Panic Mode (kill switch)</span></li>
        </ul>
      </div>
      <div class="bg-gradient-to-br from-gray-50 to-white border rounded-2xl p-8 hover:shadow-xl transition-shadow">
        <div class="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-5">&#x1F4B0;</div>
        <h3 class="text-lg font-bold text-gray-900 mb-3">Economie Inclusive</h3>
        <p class="text-sm text-gray-600 leading-relaxed">Paiement mobile (MonCash/Natcash), bourses, reseau d'agents collecteurs dans tout le departement.</p>
        <ul class="mt-4 space-y-2">
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>Paiement MonCash & Natcash</span></li>
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>Codes bourses (BOURSE-XXX)</span></li>
          <li class="flex items-start gap-2 text-sm text-gray-600"><span class="text-teal-500 mt-0.5">&#x2713;</span><span>Commissions agents transparentes</span></li>
        </ul>
      </div>
    </div>
  </section>
</body>
</html>`;

// ═══════════════ Main ═══════════════

async function main() {
  console.log('Launching Chrome headless...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const captures = [
    { name: 'docs-admin-agent-dashboard', html: DASHBOARD_HTML, fullPage: false },
    { name: 'docs-admin-agent-settings',  html: SETTINGS_HTML,  fullPage: true  },
    { name: 'docs-admin-agent-panic',     html: PANIC_HTML,     fullPage: false },
    { name: 'docs-admin-agent-chat',      html: CHAT_HTML,      fullPage: false },
    { name: 'docs-admin-agent-proposal',  html: PROPOSAL_HTML,  fullPage: false },
    { name: 'vision-hero',               html: VISION_HTML,    fullPage: false },
  ];

  for (let i = 0; i < captures.length; i++) {
    const { name, html, fullPage } = captures[i];
    console.log(`[${i + 1}/${captures.length}] ${name}...`);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000); // Let Tailwind CDN JIT compile all classes
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${name}.png`),
      fullPage,
    });
    console.log(`  ✅ ${name}.png`);
  }

  await browser.close();
  console.log('\n✅ All 6 screenshots captured successfully!');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
