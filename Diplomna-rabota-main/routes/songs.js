import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const { id } = req.params;
    
    // Updated SQL to join Album_images and Artist_images
    const sql = `
        SELECT s.*, 
               a.title AS albumTitle, a.release_year, a.id AS album_id,
               art.name AS artistName, art.id AS artist_id,
               alb_img.image AS album_blob,
               art_img.image AS artist_blob
        FROM Songs s
        JOIN Albums a ON s.album_id = a.id
        JOIN Artists art ON a.artist_id = art.id
        LEFT JOIN Album_images alb_img ON a.id = alb_img.album_id
        LEFT JOIN Artist_images art_img ON art.id = art_img.artist_id
        WHERE s.id = ?`;

    db.get(sql, [id], (err, row) => {
        if (err || !row) return res.status(404).send("Not found");

        // Convert the Album BLOB to Base64
        const album_cover = row.album_blob 
            ? `data:image/jpeg;base64,${row.album_blob.toString('base64')}` 
            : "/images/default-album.jpg";

        // Convert the Artist BLOB to Base64
        const artist_image = row.artist_blob
            ? `data:image/jpeg;base64,${row.artist_blob.toString('base64')}`
            : null;

        res.render("songs", { 
            song: row, 
            album: { 
                id: row.album_id, 
                title: row.albumTitle, 
                artistName: row.artistName, 
                release_year: row.release_year,
                album_cover: album_cover // Passed for ColorThief and header
            },
            artist: {
                id: row.artist_id,
                name: row.artistName,
                image: artist_image // Passed for the mini-profile pic
            }
        });
    });
});

export default router;