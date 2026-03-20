import express from "express";
import db from "../database.js";
const router = express.Router();

router.get("/:id", (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM artists WHERE id = ?", [id], (err, artist) => {
        if (err || !artist) return res.status(404).send("Not found");

        const sql = `
            SELECT a.*, img.image 
            FROM Albums a
            LEFT JOIN Album_images img ON a.id = img.album_id
            WHERE a.artist_id = ?`;

        db.all(sql, [id], (err, rows) => {
            const albums = rows.map(a => ({
                ...a,
                album_cover: a.image ? `data:image/jpeg;base64,${a.image.toString('base64')}` : "/images/default.jpg"
            }));
            res.render("artist", { artist, albums });
        });
    });
});

export default router;