import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const artistId = req.params.id;

    const artistSql = `SELECT * FROM Artists WHERE id = ?`;
    
    const albumsSql = `SELECT * FROM Albums WHERE artist_id = ?`;

    db.get(artistSql, [artistId], (err, artistRow) => {
        if (err || !artistRow) return res.status(404).send("Artist not found");

        const artist = {
            ...artistRow,
            image: artistRow.artist_image 
                ? `data:image/jpeg;base64,${Buffer.from(artistRow.artist_image).toString('base64')}` 
                : null 
        };

        db.all(albumsSql, [artistId], (err, rows) => {
            if (err) return res.status(500).send("Database error");

            const albums = rows.map(album => ({
                ...album,
                album_cover: album.album_image 
                    ? `data:image/jpeg;base64,${Buffer.from(album.album_image).toString('base64')}` 
                    : '/images/default-cover.png' 
            }));

            res.render("artist", { artist, albums });
        });
    });
});

export default router;