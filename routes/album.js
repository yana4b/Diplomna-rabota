import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const { id } = req.params;
    const albumSql = `
        SELECT a.*, art.name AS artistName, img.image 
        FROM Albums a
        LEFT JOIN Artists art ON a.artist_id = art.id
        LEFT JOIN Album_images img ON a.id = img.album_id
        WHERE a.id = ?`;

    db.get(albumSql, [id], (err, albumRow) => {
        if (err || !albumRow) return res.status(404).send("Not found");

        albumRow.album_cover = albumRow.image 
            ? `data:image/jpeg;base64,${albumRow.image.toString('base64')}` 
            : "/images/default.jpg";

        db.all("SELECT * FROM Songs WHERE album_id = ? ORDER BY track_number ASC", [id], (err, songs) => {
            res.render("album", { album: albumRow, songs });
        });
    });
});

export default router;