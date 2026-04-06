import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const artistId = req.params.id;

    // 1. Get Artist details AND their image from the Artist_images table
    const artistSql = `
        SELECT a.*, ai.image AS artist_image
        FROM Artists a
        LEFT JOIN Artist_images ai ON a.id = ai.artist_id
        WHERE a.id = ?`;
    
    // 2. Get Albums with their covers
    const albumsSql = `
        SELECT a.*, i.image 
        FROM Albums a 
        LEFT JOIN Album_images i ON a.id = i.album_id 
        WHERE a.artist_id = ?`;

    db.get(artistSql, [artistId], (err, artistRow) => {
        if (err || !artistRow) return res.status(404).send("Artist not found");

        // Convert Artist BLOB to Base64
        const artist = {
            ...artistRow,
            image: artistRow.artist_image 
                ? `data:image/jpeg;base64,${Buffer.from(artistRow.artist_image).toString('base64')}` 
                : null // You can add a default artist image path here if you like
        };

        db.all(albumsSql, [artistId], (err, rows) => {
            if (err) return res.status(500).send("Database error");

            // Convert Album BLOB images to Base64 strings for EJS
            const albums = rows.map(album => ({
                ...album,
                album_cover: album.image 
                    ? `data:image/jpeg;base64,${Buffer.from(album.image).toString('base64')}` 
                    : '/images/default-cover.png' 
            }));

            res.render("artist", { artist, albums });
        });
    });
});

export default router;