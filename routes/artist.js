import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const artistId = req.params.id;

    // 1. Get Artist details
    const artistSql = "SELECT * FROM Artists WHERE id = ?";
    
    // 2. Get Albums with their covers
    const albumsSql = `
        SELECT a.*, i.image 
        FROM Albums a 
        LEFT JOIN Album_images i ON a.id = i.album_id 
        WHERE a.artist_id = ?`;

    db.get(artistSql, [artistId], (err, artist) => {
        if (err || !artist) return res.status(404).send("Artist not found");

        db.all(albumsSql, [artistId], (err, rows) => {
            if (err) return res.status(500).send("Database error");

            // Convert BLOB images to Base64 strings for EJS
            const albums = rows.map(album => ({
                ...album,
                album_cover: album.image 
                    ? `data:image/jpeg;base64,${Buffer.from(album.image).toString('base64')}` 
                    : '/images/default-cover.png' // Fallback image
            }));

            res.render("artist", { artist, albums });
        });
    });
});

export default router;