// Namespace Socket.IO dedie au monitoring CRNS (Phase 3 dashboard live).
//
// Indépendant de l'infra `/prof`, `/student`, `/spectator` (qui pilotent les
// concours quiz). Ici on a juste besoin de :
//   - tracker qui est en ligne par tenant
//   - permettre a un enseignant de pousser une simulation a sa classe
//   - relayer en live les events xAPI de chaque eleve aux moniteurs connectes
//
// Auth : JWT __session (meme que `/prof`). Roles enseignants : admin_ddene,
// superadmin, teacher. Les eleves se connectent en lecture seule (ils ne
// peuvent pas pousser, mais ils recoivent les events `crns:launch`).
//
// Rooms : `crns:tenant:<tenant_id>` -> tout le monde du meme tenant.

const jwt = require('jsonwebtoken');

const TEACHER_ROLES = new Set(['admin_ddene', 'superadmin', 'teacher']);

function isTeacher(role) {
  return TEACHER_ROLES.has(role);
}

function summary(socket) {
  return {
    userId: socket.userId || null,
    role: socket.role || 'unknown',
    name: socket.userName || null,
    socketId: socket.id,
    currentSimulationId: socket.currentSimulationId || null,
    lastEventId: socket.lastEventId || null,
    lastEventAt: socket.lastEventAt || null,
  };
}

function rosterFor(ns, room) {
  const list = [];
  // Iterer les sockets de ce namespace appartenant a la room
  for (const [, s] of ns.sockets) {
    if (s.rooms.has(room)) list.push(summary(s));
  }
  return list;
}

function setupCrnsNamespace(io) {
  const ns = io.of('/crns');

  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('auth required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.id || decoded.sub || '');
      socket.tenantId = String(decoded.tenant_id || '');
      socket.role = decoded.role || 'student';
      // Optionnel : nom transmis via auth payload (le frontend peut l'ajouter)
      const extra = socket.handshake.auth || {};
      socket.userName = extra.name ? String(extra.name) : null;
      if (!socket.tenantId) return next(new Error('tenant required'));
      next();
    } catch (e) {
      next(new Error('invalid token'));
    }
  });

  ns.on('connection', (socket) => {
    const room = `crns:tenant:${socket.tenantId}`;
    socket.join(room);
    console.log(`[CRNS] ${socket.role} ${socket.userId} joined ${room}`);

    // Envoie le roster courant a celui qui vient d'arriver
    socket.emit('crns:roster', rosterFor(ns, room));
    // Annonce aux autres
    socket.to(room).emit('crns:user_joined', summary(socket));

    // === ENSEIGNANT pousse une simulation a la classe ===
    socket.on('crns:launch', (payload) => {
      if (!isTeacher(socket.role)) {
        return socket.emit('crns:error', { message: 'role enseignant requis' });
      }
      const data = {
        simulationId: String(payload?.simulationId || ''),
        simulationTitle: payload?.simulationTitle ? String(payload.simulationTitle) : null,
        launchedBy: socket.userId,
        launchedByName: socket.userName,
        at: new Date().toISOString(),
      };
      if (!data.simulationId) {
        return socket.emit('crns:error', { message: 'simulationId requis' });
      }
      // Diffuse a TOUS les autres clients du meme tenant (eleves + autres profs).
      // L'emetteur ne se redirige pas lui-meme.
      socket.to(room).emit('crns:launch', data);
      socket.emit('crns:launch_ack', data);
      console.log(`[CRNS] ${socket.userId} launched ${data.simulationId} for tenant ${socket.tenantId}`);
    });

    // === ELEVE notifie sa progression (echo des events xAPI) ===
    socket.on('crns:event', (payload) => {
      const sim = String(payload?.simulationId || '');
      const evt = String(payload?.eventId || '');
      if (!sim || !evt) return;
      socket.currentSimulationId = sim;
      socket.lastEventId = evt;
      socket.lastEventAt = new Date().toISOString();
      const data = {
        userId: socket.userId,
        userName: socket.userName,
        role: socket.role,
        simulationId: sim,
        eventId: evt,
        xapiVerb: payload?.xapiVerb || null,
        xapiDescription: payload?.xapiDescription || null,
        at: socket.lastEventAt,
      };
      // Tout le monde du tenant recoit l'event (le moniteur surtout)
      ns.to(room).emit('crns:state_update', data);
    });

    socket.on('disconnect', () => {
      socket.to(room).emit('crns:user_left', {
        userId: socket.userId,
        socketId: socket.id,
      });
      console.log(`[CRNS] ${socket.userId} left ${room}`);
    });
  });
}

module.exports = { setupCrnsNamespace };
