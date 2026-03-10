import express from "express";
import db from "../database.js";

// minimal router object for artists
const router = express.Router();

    // bool isAdmin = false;
    // role = "SELECT role FROM users WHERE id = ?";
    // if(role = "admin"){
    //     isAdmin = true;
    // }

// add your route handlers here as needed
router.get("/", (req, res) => {
  // example: get all artists
  db.all("SELECT * FROM artists", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM artists WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Artist not found" });
    }
    res.json(row);
  });
});

// if(role = "admin"){
//     app.post("/artists", (req, res) => {
//         const { name, genre } = req.body;
//         if (!name) {
//           return res.status(400).json({ error: "Name is required" });
//         }
//         db.run("INSERT INTO artists (name, genre) VALUES (?, ?)", [name, genre], function (err) {
//           if (err) {
//             return res.status(500).json({ error: err.message });
//             }
//             res.status(201).json({ id: this.lastID, name, genre });
//         });
//     });
// }


export default router;
