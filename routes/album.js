import express from "express";
import db from "../database.js";

const router = express.Router();

// GET all albums → redirect to first album (optional)
router.get("/", (req, res) => {
  db.all("SELECT * FROM albums", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.send("No albums found");

    // redirect to first album for testing
    res.redirect(`/albums/${rows[0].id}`);
  });
});


  // Get album info
 router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM albums WHERE id = ?", [id], (err, albumRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!albumRow) return res.status(404).send("Album not found");

    // Hardcoded songs for testing
    const songs = [
      { track_number: 1, title: "Test Song 1", duration: "3:45" },
      { track_number: 2, title: "Test Song 2", duration: "4:20" },
      { track_number: 3, title: "Test Song 3", duration: "5:00" },
    ];

    // Render album.ejs
    res.render("album", { album: albumRow, songs });
  });
});

export default router;