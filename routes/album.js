import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const { id } = req.params;
    
    const albumSql = `
        SELECT a.*, art.name AS artistName, art.id AS artist_id, 
               a.album_image,
               art.artist_image
        FROM Albums a
        LEFT JOIN Artists art ON a.artist_id = art.id
        WHERE a.id = ?`;

    db.get(albumSql, [id], (err, albumRow) => {
        if (err || !albumRow) return res.status(404).send("Album not found");

        // 2. Convert BLOBs directly from the row
        const album_cover = albumRow.album_image 
            ? `data:image/jpeg;base64,${Buffer.from(albumRow.album_image).toString('base64')}` 
            : "/images/default.jpg";

        const artist_image = albumRow.artist_image
            ? `data:image/jpeg;base64,${Buffer.from(albumRow.artist_image).toString('base64')}`
            : null;

        const albumData = {
            ...albumRow,
            album_cover: album_cover
        };

        const artistData = {
            id: albumRow.artist_id,
            name: albumRow.artistName,
            image: artist_image
        };

        db.all("SELECT id, title, track_number, album_id, length AS duration FROM Songs WHERE album_id = ? ORDER BY track_number ASC", [id], (err, songs) => {
            if (err) return res.status(500).send("Database error");
            
            res.render("album", { album: albumData, songs: songs, artist: artistData });
        });
    });
});

export default router;