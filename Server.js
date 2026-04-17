import express from "express";
import cors from "cors";
import session from "express-session";
import bcrypt from "bcryptjs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from "./database.js";
import multer from "multer";

import albumRoutes from "./routes/album.js";
import artistRoutes from "./routes/artist.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.set("views", join(__dirname, "Public", "views")); 
app.set("view engine", "ejs");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "Public")));

app.use(session({
    secret: 'music-app-super-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('login', { error: "Неоторизиран достъп: Само за администратори." });
    }
};

app.get('/signup', (req, res) => res.render('signup', { error: null }));
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)", 
    [username, hash, 'user'], (err) => {
        if (err) return res.render('signup', { error: "Потребителското име е заето." });
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM Users WHERE username = ?", [username], (err, user) => {
        if (user && bcrypt.compareSync(password, user.password_hash)) {
            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.redirect('/');
        } else {
            res.render('login', { error: "Невалидни данни за вход" });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/admin', isAdmin, (req, res) => {
    const artistSql = "SELECT id, name FROM Artists ORDER BY name ASC";
    const albumSql = "SELECT id, title FROM Albums ORDER BY title ASC";
    const genreSql = "SELECT id, name FROM Genres ORDER BY name ASC";
    const subgenreSql = "SELECT id, name, genre_id FROM Subgenres ORDER BY name ASC";

    db.all(artistSql, [], (err, artists) => {
        db.all(albumSql, [], (err2, albums) => {
            db.all(genreSql, [], (err3, genres) => {
                db.all(subgenreSql, [], (err4, subgenres) => {
                    res.render('admin', { 
                        artists, 
                        albums, 
                        genres: genres || [], 
                        subgenres: subgenres || [] 
                    });
                });
            });
        });
    });
});

app.post('/admin/add-album', isAdmin, upload.single('album_image'), (req, res) => {
    const { title, artist_id, release_year, description, genre_id, subgenre_id } = req.body;
    const album_image = req.file ? req.file.buffer : null;
    
    const sql = `INSERT INTO Albums (title, artist_id, release_year, description, genre_id, subgenre_id, album_image) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [title, artist_id, release_year, description, genre_id, subgenre_id, album_image], function(err) {
        if (err) return res.status(500).send("Грешка при добавяне на албум: " + err.message);
        res.redirect('/admin');
    });
});

app.post('/admin/add-artist', isAdmin, upload.single('artist_image'), (req, res) => {
    const { name, genre_id, origin } = req.body;
    const artist_image = req.file ? req.file.buffer : null;
    
    const sql = `INSERT INTO Artists (name, genre_id, origin, artist_image) VALUES (?, ?, ?, ?)`;

    db.run(sql, [name, genre_id, origin, artist_image], function(err) {
        if (err) return res.status(500).send("Грешка при добавяне на изпълнител: " + err.message);
        res.redirect('/admin');
    });
});

app.post('/admin/add-song', isAdmin, upload.single('songFile'), (req, res) => {
    const { title, album_id, artist_id, track_number, length } = req.body;
    const song_audio = req.file ? req.file.buffer : null;

    if (!song_audio) {
        return res.status(400).send("Моля, качете MP3 файл.");
    }

    const songSql = `INSERT INTO Songs (title, album_id, artist_id, track_number, length, song_audio) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
    
    const params = [
        title, 
        album_id, 
        artist_id, 
        track_number || 0,      
        length || "0:00",      
        song_audio
    ];

    db.run(songSql, params, function(err) {
        if (err) {
            console.error("Грешка в базата данни:", err.message);
            return res.status(500).send("Грешка в базата данни: " + err.message);
        }
        res.redirect('/admin');
    });
});

app.post('/admin/delete-album', isAdmin, (req, res) => {
    const { album_id } = req.body;  
    db.run("DELETE FROM Songs WHERE album_id = ?", [album_id], () => {
        db.run("DELETE FROM Albums WHERE id = ?", [album_id], () => {
            res.redirect('/');
        });
    });
});

app.post('/admin/delete-song', isAdmin, (req, res) => {
    const { song_id, album_id } = req.body;
    
    db.run("DELETE FROM Songs WHERE id = ?", [song_id], (err) => {
        if (err) {
            console.error("Грешка при изтриване на песен:", err.message);
            return res.status(500).send("Грешка в базата данни");
        }
        res.redirect(`/albums/${album_id}`);
    });
});

app.get('/stream-song/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(403).send("Изисква се вход в системата.");
    }

    const songId = req.params.id;
    db.get("SELECT song_audio FROM Songs WHERE id = ?", [songId], (err, song) => {
        if (err || !song || !song.song_audio) {
            return res.status(404).send("Песента не е намерена.");
        }

        const audioBuffer = song.song_audio;
        const totalSize = audioBuffer.length;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
            const chunksize = (end - start) + 1;
            
            const head = {
                'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
            };

            res.writeHead(206, head); 
            res.end(audioBuffer.slice(start, end + 1));
        } else {
            const head = {
                'Content-Length': totalSize,
                'Content-Type': 'audio/mpeg',
            };
            res.writeHead(200, head);
            res.end(audioBuffer);
        }
    });
});

app.use("/albums", albumRoutes);
app.use("/artists", artistRoutes);

app.get('/', (req, res) => {
    const { search, genre, subgenre } = req.query;
    
    db.all("SELECT * FROM Genres ORDER BY name ASC", [], (err, allGenres) => {
        if (err) return res.status(500).send("Грешка при извличане на жанрове");

        let subGenreSql = "SELECT * FROM Subgenres WHERE 1=0"; 
        let subParams = [];
        
        if (genre) {
            subGenreSql = "SELECT * FROM Subgenres WHERE genre_id = ? ORDER BY name ASC";
            subParams = [genre];
        }

        db.all(subGenreSql, subParams, (err, subGenres) => {
            
            let sql = `SELECT a.id, a.title, a.release_year, art.name as artistName, 
                              a.album_image as image, a.genre_id, a.subgenre_id
                       FROM Albums a 
                       LEFT JOIN Artists art ON a.artist_id = art.id 
                       WHERE 1=1`;
            
            let params = [];
            
            if (search && search.trim() !== '') { 
                sql += " AND (a.title LIKE ? OR art.name LIKE ?)"; 
                params.push(`%${search}%`, `%${search}%`); 
            }
            if (genre && genre !== '') {
                sql += " AND a.genre_id = ?";
                params.push(genre);
            }

            if (subgenre && subgenre !== '') {
                sql += " AND a.subgenre_id = ?";
                params.push(subgenre);
            }
            
            sql += " ORDER BY a.title COLLATE NOCASE ASC";

            db.all(sql, params, (err, rows) => {
                if (err) return res.status(500).send("Грешка при извличане на албуми: " + err.message);

                const albums = rows.map(row => ({
                    ...row,
                    album_cover: row.image ? `data:image/jpeg;base64,${Buffer.from(row.image).toString('base64')}` : null
                }));
                
                res.render('index', { 
                    albums, 
                    allGenres: allGenres || [], 
                    subGenres: subGenres || [], 
                    filters: { 
                        search: search || '', 
                        genre: genre || '', 
                        subgenre: subgenre || '' 
                    } 
                });
            });
        });
    });
});

app.listen(3000, () => console.log("Сървърът стартира на http://localhost:3000"));