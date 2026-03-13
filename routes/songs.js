import express from "express";
import db from "../database.js";

// minimal router object for songs
const router = express.Router();

// add your route handlers here as needed
router.get("/", (req, res) => {
    // example: get all songs
    db.all("SELECT * FROM songs", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM songs WHERE id = ?", [id], (err, songRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!songRow) return res.status(404).send("Song not found");

    // Hardcoded album info for testing
    const album = {
      id: songRow.album_id,
      title: "Test Album",
      artistName: "Test Artist",
      release_year: 2025
    };

    // Render song.ejs
    res.render("songs", { song: songRow, album });
  });
});


export default router;
