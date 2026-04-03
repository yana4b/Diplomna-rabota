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

// --- AUTH ROUTES ---
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

// --- ADMIN ROUTES ---
app.get('/admin', isAdmin, (req, res) => {
    const artistSql = "SELECT id, name FROM Artists ORDER BY name ASC";
    const albumSql = "SELECT id, title FROM Albums ORDER BY title ASC";
    const genreSql = "SELECT id, name FROM Genres ORDER BY name ASC";
    const subgenreSql = "SELECT id, name FROM Subgenres ORDER BY name ASC";

    db.all(artistSql, [], (err, artists) => {
        db.all(albumSql, [], (err2, albums) => {
            db.all(genreSql, [], (err3, genres) => {
                db.all(subgenreSql, [], (err4, subgenres) => {
                    // Now all 4 variables are passed to the EJS template
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

app.post('/admin/add-artist', isAdmin, upload.single('artist_image'), (req, res) => {
    const { name, genre, origin } = req.body;
    
    db.run("INSERT INTO Artists (name, genre, origin) VALUES (?, ?, ?)", [name, genre, origin], function(err) {
        if (err) return res.status(500).send(err.message);
        
        const artistId = this.lastID;

        // If an image was uploaded, save it to Artist_images table
        if (req.file) {
            db.run("INSERT INTO Artist_images (artist_id, image) VALUES (?, ?)", [artistId, req.file.buffer], (err) => {
                if (err) console.error("Error saving artist image:", err);
                res.redirect('/admin');
            });
        } else {
            res.redirect('/admin');
        }
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
    // Sequential deletion to ensure database integrity
    db.run("DELETE FROM Album_images WHERE album_id = ?", [album_id], () => {
        db.run("DELETE FROM Songs WHERE album_id = ?", [album_id], () => {
            db.run("DELETE FROM Albums WHERE id = ?", [album_id], () => {
                res.redirect('/');
            });
        });
    });
});

// --- API ROUTES ---
app.use("/albums", albumRoutes);
app.use("/artists", artistRoutes);
app.use("/songs", songRoutes);

// --- MAIN SEARCH ROUTE (Handles the Auto-Search Script) ---
app.get('/', (req, res) => {
    const { search, genre, subgenre } = req.query;
    
    // 1. Fetch all main Genres for the first dropdown
    db.all("SELECT * FROM Genres ORDER BY name ASC", [], (err, allGenres) => {
        if (err) return res.status(500).send("Database error fetching genres");

        // 2. If a genre is selected, fetch its specific subgenres
        let subGenreSql = "SELECT * FROM Subgenres WHERE 1=0"; // Default: fetch nothing
        let subParams = [];
        
        if (genre) {
            subGenreSql = "SELECT * FROM Subgenres WHERE genre_id = ? ORDER BY name ASC";
            subParams = [genre];
        }

        db.all(subGenreSql, subParams, (err, subGenres) => {
            
            // 3. Build the main Album query
            let sql = `SELECT a.id, a.title, a.release_year, art.name as artistName, 
                              img.image, a.genre_id, a.subgenre_id
                       FROM Albums a 
                       LEFT JOIN Artists art ON a.artist_id = art.id 
                       LEFT JOIN Album_images img ON a.id = img.album_id 
                       WHERE 1=1`;
            
            let params = [];
            
            // Text Search Filter
            if (search && search.trim() !== '') { 
                sql += " AND (a.title LIKE ? OR art.name LIKE ?)"; 
                params.push(`%${search}%`, `%${search}%`); 
            }

            // Genre Filter (Assumes Albums table has genre_id)
            if (genre && genre !== '') {
                sql += " AND a.genre_id = ?";
                params.push(genre);
            }

            // Subgenre Filter (Assumes Albums table has subgenre_id)
            if (subgenre && subgenre !== '') {
                sql += " AND a.subgenre_id = ?";
                params.push(subgenre);
            }
            
            sql += " GROUP BY a.id ORDER BY a.title ASC";

            db.all(sql, params, (err, rows) => {
                if (err) return res.status(500).send("Database error fetching albums");

                const albums = rows.map(row => ({
                    ...row,
                    album_cover: row.image ? `data:image/jpeg;base64,${Buffer.from(row.image).toString('base64')}` : null
                }));
                
                // 4. Render the page with all necessary data
                res.render('index', { 
                    albums, 
                    allGenres, // All genres for dropdown 1
                    subGenres, // Filtered subgenres for dropdown 2
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

app.listen(3000, () => console.log("Server running at http://localhost:3000"));