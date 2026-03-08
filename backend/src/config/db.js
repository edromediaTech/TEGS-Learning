const mongoose = require('mongoose');

/**
 * Connecte l'application a MongoDB.
 * Utilise la variable d'environnement MONGODB_URI.
 * Retourne la connexion Mongoose pour permettre un shutdown propre.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI manquant dans les variables d\'environnement');
  }

  await mongoose.connect(uri);
  console.log('[DB] MongoDB connecte avec succes');
  return mongoose.connection;
}

module.exports = connectDB;
