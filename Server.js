import express from "express";
import cors from "cors";
import session from "express-session";
import bcrypt from "bcryptjs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from "./database.js";
import albumRoutes from "./routes/album.js";
import artistRoutes from "./routes/artist.js";  
import songRoutes from "./routes/songs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = 3000;

app.set("views", join(__dirname, "Public", "views")); 
app.set("view engine", "ejs");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "Public")));

app.use(session({
    secret: 'music-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') next();
    else res.status(403).send("Access Denied");
};

app.get('/signup', (req, res) => res.render('signup', { error: null }));

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.render('signup', { error: "Please fill in all fields" });
    }

    const hash = bcrypt.hashSync(password, 10);
    const role = 'user'; 


    db.run("INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)", 
    [username, hash, role], function(err) {
        if (err) {
            console.error("Signup Database Error:", err.message); 
            
            if (err.message.includes("UNIQUE constraint failed")) {
                return res.render('signup', { error: "That username is already taken." });
            }
            return res.render('signup', { error: "Database error: " + err.message });
        }
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
            res.render('login', { error: "Invalid username or password" });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/admin', isAdmin, (req, res) => {
    db.all("SELECT id, name FROM Artists", [], (err, artists) => {
        db.all("SELECT id, title FROM Albums", [], (err, albums) => {
            res.render('admin', { artists, albums });
        });
    });
});

app.post('/admin/add-album', isAdmin, (req, res) => {
    const { title, release_year, artist_id } = req.body;
    db.run("INSERT INTO Albums (title, release_year, artist_id) VALUES (?, ?, ?)", 
    [title, release_year, artist_id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect('/admin');
    });
});

app.post('/admin/add-song', isAdmin, (req, res) => {
    const { title, track_number, length, album_id } = req.body;
    db.run("INSERT INTO Songs (title, track_number, length, album_id) VALUES (?, ?, ?, ?)",
    [title, track_number, length, album_id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.redirect('/admin');
    });
});

app.use("/albums", albumRoutes);
app.use("/artists", artistRoutes);
app.use("/songs", songRoutes);

app.get('/', (req, res) => {
    const { search, genre, year } = req.query;
    let sql = `
        SELECT a.id, a.title, a.release_year, art.name AS artistName, art.genre, img.image
        FROM Albums a
        LEFT JOIN Artists art ON a.artist_id = art.id
        LEFT JOIN Album_images img ON a.id = img.album_id
        WHERE 1=1
    `;
    const params = [];
    if (search) { sql += ` AND (a.title LIKE ? OR art.name LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    if (genre) { sql += ` AND art.genre = ?`; params.push(genre); }
    if (year) { sql += ` AND a.release_year = ?`; params.push(year); }
    sql += ` GROUP BY a.id ORDER BY a.title ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).send(err.message);
        const albums = rows.map(row => ({
            ...row,
            album_cover: row.image ? `data:image/jpeg;base64,${Buffer.from(row.image).toString('base64')}` : "/img/default-cover.jpg"
        }));
        res.render('index', { albums, filters: { search: search || '', genre: genre || '', year: year || '' } }); 
    });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));