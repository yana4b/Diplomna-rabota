import express from "express";
import cors from "cors";
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

// VIEW ENGINE
app.set("views", join(__dirname, "Public", "views")); 
app.set("view engine", "ejs");

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, "Public")));

app.use("/albums", albumRoutes);
app.use("/artists", artistRoutes);
app.use("/songs", songRoutes);

// MAIN ROUTE
app.get('/', (req, res) => {

  // Get the max ID dynamically
  db.get("SELECT MAX(id) AS maxId FROM albums", (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Database error");
    }

    const maxId = row.maxId || 0;

    // Hardcoded album info for testing
    const testAlbum = {
      title: "Test Album",
      artistName: "Test Artist",
      release_year: 2025,
      artist_id: 1
    };

    res.render('index', { album: testAlbum, maxId });
  });

});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});