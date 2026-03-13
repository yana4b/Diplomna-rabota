import express from "express";
import db from "../database.js";

// minimal router object for artists
const router = express.Router();

    // bool isAdmin = false;
    // role = "SELECT role FROM users WHERE id = ?";
    // if(role = "admin"){
    //     isAdmin = true;
    // }

// add your route handlers here as needed
router.get("/", (req, res) => {
  // example: get all artists
  db.all("SELECT * FROM artists", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  // Get artist info
  db.get("SELECT * FROM artists WHERE id = ?", [id], (err, artistRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!artistRow) return res.status(404).send("Artist not found");

    // Get albums for this artist
    db.all("SELECT * FROM albums WHERE artist_id = ?", [id], (err, albums) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!albums) albums = [];

      // For testing, add hardcoded songs inside album object (optional)
      albums = albums.map(album => ({
        ...album,
        songs: [
          { track_number: 1, title: "Test Song 1", duration: "3:45" },
          { track_number: 2, title: "Test Song 2", duration: "4:20" },
        ]
      }));

      // Render artist.ejs
      res.render("artist", { artist: artistRow, albums });
    });
  });
});


export default router;
