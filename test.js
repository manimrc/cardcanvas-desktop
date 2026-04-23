const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'data', 'cardboard.db'));
try {
  const cards = db.prepare('SELECT * FROM cards ORDER BY createdAt DESC').all();
  console.log("Success! Found cards:", cards.length);
} catch (e) {
  console.error("DB Error:", e.message);
}
