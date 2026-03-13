/**
 * TEGS Arena Bot Simulator
 *
 * Spawns N simulated students that connect via Socket.io /student namespace
 * and answer questions in real-time during a live competition.
 *
 * Usage:
 *   node scripts/arena-bot-sim.js [shareToken] [numBots]
 *
 * Defaults:
 *   shareToken = b7ed14351e0c04bb8f8cfa81110c4a3a (demo module)
 *   numBots = 12
 *
 * Prerequisites: backend running on port 3000
 */

const { io } = require('socket.io-client');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';
const SHARE_TOKEN = process.argv[2] || 'b7ed14351e0c04bb8f8cfa81110c4a3a';
const NUM_BOTS = parseInt(process.argv[3] || '12', 10);

// Haitian names for realism
const FIRST_NAMES = [
  'Emmanuelle', 'Ricardo', 'Marie-Claire', 'Jean-Baptiste', 'Sophia',
  'Pierre', 'Nathalie', 'Frantz', 'Claudine', 'Yves',
  'Roseline', 'Patrick', 'Guerline', 'Samuel', 'Jocelyne',
  'Maxime', 'Fabienne', 'Edouard', 'Mireille', 'Reginald',
];

const LAST_NAMES = [
  'Jean-Louis', 'Pierre', 'Baptiste', 'Charles', 'Estimé',
  'Duval', 'Saint-Fleur', 'Casimir', 'François', 'Germain',
  'Toussaint', 'Dessalines', 'Péralte', 'Louverture', 'Christophe',
];

const ESTABLISHMENTS = [
  'Lycée National de Port-au-Prince',
  'Collège Saint-Pierre',
  'Institution Mixte Le Savoir',
  'École Nationale des Cayes',
  'Lycée Philippe Guerrier (Cap-Haïtien)',
  'Collège Marie-Anne',
  'Institution Notre-Dame du Perpétuel Secours',
  'Lycée Toussaint Louverture',
];

const delay = ms => new Promise(r => setTimeout(r, ms));

function randomName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function randomEstablishment() {
  return ESTABLISHMENTS[Math.floor(Math.random() * ESTABLISHMENTS.length)];
}

class Bot {
  constructor(id) {
    this.id = id;
    this.name = randomName();
    this.establishment = randomEstablishment();
    this.sessionKey = `bot-${id}-${Date.now().toString(36)}`;
    this.socket = null;
    this.accuracy = 0.3 + Math.random() * 0.55; // 30%–85% accuracy
    this.speedFactor = 0.3 + Math.random() * 0.6; // 30%–90% of duration used
    this.score = 0;
    this.maxScore = 0;
    this.answered = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(`${BACKEND}/student`, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        this.socket.emit('join_exam', {
          shareToken: SHARE_TOKEN,
          sessionKey: this.sessionKey,
          studentName: this.name,
          establishment: this.establishment,
        });
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error(`[Bot ${this.id}] Connection error: ${err.message}`);
        reject(err);
      });

      // Listen for questions
      this.socket.on('contest_question', (data) => {
        this.handleQuestion(data);
      });

      // Force submit
      this.socket.on('contest_force_submit', () => {
        // Already answered via timeout — ignore
      });

      this.socket.on('contest_end', (data) => {
        const myRank = data.rankings?.find(r => r.sessionKey === this.sessionKey);
        console.log(`[Bot ${this.id}] ${this.name} — Final: ${this.score}/${this.maxScore} pts` +
          (myRank ? ` (#${myRank.rank})` : ''));
      });

      this.socket.on('error_msg', (data) => {
        console.error(`[Bot ${this.id}] Error: ${data.message}`);
      });

      // Timeout
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  async handleQuestion(data) {
    const { questionIndex, questionType, points, duration, questionText } = data;

    // Simulate "thinking" time — between 1s and speedFactor * duration
    const thinkTime = Math.max(1000, Math.floor(this.speedFactor * duration * 1000 * Math.random()));
    await delay(Math.min(thinkTime, (duration - 1) * 1000));

    // Determine if correct based on accuracy
    const isCorrect = Math.random() < this.accuracy;
    const pointsEarned = isCorrect ? (points || 1) : 0;
    const maxPoints = points || 1;

    this.score += pointsEarned;
    this.maxScore += maxPoints;
    this.answered++;

    // Generate a plausible student answer
    let studentAnswer = '';
    if (questionType === 'quiz') {
      studentAnswer = isCorrect ? '(correct)' : `Option ${Math.floor(Math.random() * 3) + 1}`;
    } else if (questionType === 'true_false') {
      studentAnswer = isCorrect ? 'Vrai' : 'Faux';
    } else if (questionType === 'numeric') {
      studentAnswer = isCorrect ? '(correct)' : String(Math.floor(Math.random() * 100));
    } else {
      studentAnswer = isCorrect ? '(correct)' : '(incorrect)';
    }

    this.socket.emit('answer_submitted', {
      questionIndex,
      questionText: questionText || '',
      questionType: questionType || 'quiz',
      isCorrect,
      pointsEarned,
      maxPoints,
      responseTimeMs: thinkTime,
      studentAnswer,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  TEGS Arena Bot Simulator                       ║');
  console.log(`║  ${NUM_BOTS} bots — Token: ${SHARE_TOKEN.slice(0, 12)}...  ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  const bots = [];

  for (let i = 0; i < NUM_BOTS; i++) {
    const bot = new Bot(i + 1);
    bots.push(bot);
  }

  // Connect all bots with staggered joins (200ms apart for realism)
  console.log(`Connecting ${NUM_BOTS} bots...\n`);
  for (const bot of bots) {
    try {
      await bot.connect();
      console.log(`  [OK] ${bot.name} (${bot.establishment}) — accuracy: ${Math.round(bot.accuracy * 100)}%`);
      await delay(200);
    } catch (err) {
      console.error(`  [FAIL] Bot ${bot.id}: ${err.message}`);
    }
  }

  const connected = bots.filter(b => b.socket?.connected);
  console.log(`\n${connected.length}/${NUM_BOTS} bots connected. Waiting for competition to start...\n`);
  console.log('Press Ctrl+C to disconnect all bots.\n');

  // Keep alive
  process.on('SIGINT', () => {
    console.log('\nDisconnecting all bots...');
    bots.forEach(b => b.disconnect());
    setTimeout(() => process.exit(0), 1000);
  });
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
