import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT s.*, a.title AS albumTitle, art.name AS artistName, a.release_year
        FROM Songs s
        JOIN Albums a ON s.album_id = a.id
        JOIN Artists art ON a.artist_id = art.id
        WHERE s.id = ?`;

    db.get(sql, [id], (err, song) => {
        if (err || !song) return res.status(404).send("Not found");
        res.render("songs", { 
            song, 
            album: { id: song.album_id, title: song.albumTitle, artistName: song.artistName, release_year: song.release_year } 
        });
    });
});

export default router;