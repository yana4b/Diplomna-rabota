import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const { id } = req.params;
    const albumSql = `
        SELECT a.*, art.name AS artistName, art.id AS artist_id, 
               alb_img.image AS album_blob,
               art_img.image AS artist_blob
        FROM Albums a
        LEFT JOIN Artists art ON a.artist_id = art.id
        LEFT JOIN Album_images alb_img ON a.id = alb_img.album_id
        LEFT JOIN Artist_images art_img ON art.id = art_img.artist_id
        WHERE a.id = ?`;

    db.get(albumSql, [id], (err, albumRow) => {
        if (err || !albumRow) return res.status(404).send("Album not found");

        // Convert BLOBs to Base64
        const album_cover = albumRow.album_blob 
            ? `data:image/jpeg;base64,${albumRow.album_blob.toString('base64')}` 
            : "/images/default.jpg";

        const artist_image = albumRow.artist_blob
            ? `data:image/jpeg;base64,${albumRow.artist_blob.toString('base64')}`
            : null;

        // Clean objects to send to EJS
        const albumData = {
            ...albumRow,
            album_cover: album_cover
        };

        const artistData = {
            id: albumRow.artist_id,
            name: albumRow.artistName,
            image: artist_image
        };

        db.all("SELECT * FROM Songs WHERE album_id = ? ORDER BY track_number ASC", [id], (err, songs) => {
            if (err) return res.status(500).send("Database error");
            
            // Pass album, songs, AND artist to the view
            res.render("album", { album: albumData, songs: songs, artist: artistData });
        });
    });
});

export default router;