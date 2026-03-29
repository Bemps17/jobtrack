'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

/** Racine du frontend dans le monorepo */
const WEB_ROOT = path.join(__dirname, '..', '..', 'web');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'candidatures.json');

async function readCandidatures() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeCandidatures(list) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'jobtrack-api' });
});

app.get('/api/candidatures', async (_req, res) => {
  try {
    const data = await readCandidatures();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Lecture des données impossible' });
  }
});

app.put('/api/candidatures', async (req, res) => {
  try {
    const body = req.body;
    if (!Array.isArray(body)) {
      res.status(400).json({ error: 'Le corps doit être un tableau JSON' });
      return;
    }
    await writeCandidatures(body);
    res.json({ ok: true, count: body.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Écriture des données impossible' });
  }
});

app.use(express.static(WEB_ROOT, { index: 'index.html' }));

app.listen(PORT, () => {
  console.log(`JobTrack — http://localhost:${PORT}  (API + frontend)`);
});
