// Persistance TIJARA sur le Postgres partagé du projet, isolée dans son
// propre schéma ("tijara") pour ne rien croiser avec les autres applications
// qui utilisent la même base.
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query('CREATE SCHEMA IF NOT EXISTS tijara');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tijara.users (
      id BIGINT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tijara.business_data (
      user_id BIGINT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);
}

async function loadUsers() {
  const { rows } = await pool.query('SELECT data FROM tijara.users ORDER BY id');
  return rows.map(r => r.data);
}

// Remplace la table entière — le nombre de comptes reste toujours petit
// (quelques dizaines au plus), un DELETE + réinsertion en transaction est
// largement suffisant et évite d'avoir à diffuser des UPSERT ligne à ligne.
async function saveUsers(users) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM tijara.users');
    for (const u of users) {
      await client.query('INSERT INTO tijara.users (id, data) VALUES ($1, $2)', [u.id, JSON.stringify(u)]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function loadBusinessDataFor(userId) {
  const { rows } = await pool.query('SELECT data, updated_at FROM tijara.business_data WHERE user_id = $1', [userId]);
  if (!rows.length) return null;
  return { data: rows[0].data, updatedAt: rows[0].updated_at.toISOString() };
}

async function saveBusinessDataFor(userId, data, updatedAt) {
  await pool.query(
    `INSERT INTO tijara.business_data (user_id, data, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [userId, data, updatedAt]
  );
}

async function usersCount() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM tijara.users');
  return rows[0].n;
}

module.exports = { pool, initDb, loadUsers, saveUsers, loadBusinessDataFor, saveBusinessDataFor, usersCount };
