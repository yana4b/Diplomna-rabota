import sqlite3 from "sqlite3";


const db = new sqlite3.Database("./music.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

function initSchema() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        genre TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artist_id INTEGER,
        title TEXT NOT NULL,
        year INTEGER,
        FOREIGN KEY(artist_id) REFERENCES artists(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER,
        title TEXT NOT NULL,
        duration INTEGER,
        FOREIGN KEY(album_id) REFERENCES albums(id)
      )
    `);
  });
}

function seedData() {
  db.serialize(() => {
    db.get("SELECT COUNT(*) AS count FROM artists", (err, row) => {
      if (err) return console.error(err);
      if (row.count === 0) {
        const aStmt = db.prepare("INSERT INTO artists (name, genre) VALUES (?, ?)");
        aStmt.run("The Beatles", "Rock");
        aStmt.run("Miles Davis", "Jazz");
        aStmt.run("Taylor Swift", "Pop");
        aStmt.finalize();
      }
    });

    db.get("SELECT COUNT(*) AS count FROM albums", (err, row) => {
      if (err) return console.error(err);
      if (row.count === 0) {
        const abStmt = db.prepare("INSERT INTO albums (artist_id, title, year) VALUES (?, ?, ?)");
        abStmt.run(1, "Abbey Road", 1969);
        abStmt.run(2, "Kind of Blue", 1959);
        abStmt.run(3, "1989", 2014);
        abStmt.finalize();
      }
    });

    db.get("SELECT COUNT(*) AS count FROM songs", (err, row) => {
      if (err) return console.error(err);
      if (row.count === 0) {
        const sStmt = db.prepare("INSERT INTO songs (album_id, title, track_number) VALUES (?, ?, ?)");
        sStmt.run(1, "Come Together", 1);
        sStmt.run(1, "Something", 2);
        sStmt.run(2, "So What", 3);
        sStmt.run(3, "Blank Space", 4);
        sStmt.finalize();
      }
    });
  });
}

initSchema();

seedData();

export default db;