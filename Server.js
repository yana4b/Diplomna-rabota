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
import songRoutes from "./routes/songs.js";

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
        res.status(403).render('login', { error: "Unauthorized: Admins only." });
    }
};

app.get('/signup', (req, res) => res.render('signup', { error: null }));
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)", 
    [username, hash, 'user'], (err) => {
        if (err) return res.render('signup', { error: "Username taken." });
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
            res.render('login', { error: "Invalid credentials" });
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

    db.all(artistSql, [], (err, artists) => {
        db.all(albumSql, [], (err2, albums) => {
            res.render('admin', { artists, albums });
        });
    });
});

app.post('/admin/add-album', isAdmin, upload.single('album_image'), (req, res) => {
    const { title, artist_id, release_year, description } = req.body;
    
    db.run("INSERT INTO Albums (title, artist_id, release_year, description) VALUES (?, ?, ?, ?)", 
    [title, artist_id, release_year, description], function(err) {
        if (err) return res.status(500).send(err.message);
        
        const albumId = this.lastID;

        if (req.file) {
            db.run("INSERT INTO Album_images (album_id, image) VALUES (?, ?)", [albumId, req.file.buffer], (err) => {
                res.redirect('/admin');
            });
        } else {
            res.redirect('/admin');
        }
    });
});

app.post('/admin/add-artist', isAdmin, (req, res) => {
    const { name, genre, origin } = req.body;
    db.run("INSERT INTO Artists (name, genre, origin) VALUES (?, ?, ?)", [name, genre, origin], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect('/admin');
    });
});

app.post('/admin/add-song', isAdmin, (req, res) => {
    const { title, album_id, track_number, length } = req.body;
    db.run("INSERT INTO Songs (title, album_id, track_number, length) VALUES (?, ?, ?, ?)", 
    [title, album_id, track_number, length], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect('/admin');
    });
});

app.post('/admin/delete-album', isAdmin, (req, res) => {
    const { album_id } = req.body;
    db.run("DELETE FROM Songs WHERE album_id = ?", [album_id], () => {
        db.run("DELETE FROM Albums WHERE id = ?", [album_id], () => res.redirect('/'));
    });
});

app.use("/albums", albumRoutes);
app.use("/artists", artistRoutes);
app.use("/songs", songRoutes);

app.get('/', (req, res) => {
    const { search } = req.query;
    let sql = `SELECT a.id, a.title, a.release_year, art.name as artistName, art.genre, img.image 
               FROM Albums a 
               LEFT JOIN Artists art ON a.artist_id = art.id 
               LEFT JOIN Album_images img ON a.id = img.album_id 
               WHERE 1=1`;
    let params = [];
    if (search) { 
        sql += " AND (a.title LIKE ? OR art.name LIKE ?)"; 
        params.push(`%${search}%`, `%${search}%`); 
    }
    
    sql += " GROUP BY a.id ORDER BY a.title ASC";

    db.all(sql, params, (err, rows) => {
        const albums = rows.map(row => ({
            ...row,
            album_cover: row.image ? `data:image/jpeg;base64,${Buffer.from(row.image).toString('base64')}` : "/img/default.jpg"
        }));
        res.render('index', { albums, filters: { search: search || '', genre: '', year: '' } });
    });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));