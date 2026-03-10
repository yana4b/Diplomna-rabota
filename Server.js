import express from "express";
import cors from "cors";
import artistRoutes from "./routes/artists.js";
import albumRoutes from "./routes/albums.js";
import songRoutes from "./routes/songs.js";
import db from "./database.js";

const app = express();
const PORT = 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// mount the routes modules
app.use("/artists", artistRoutes);
app.use("/albums", albumRoutes);
app.use("/songs", songRoutes);

// (handlers are all implemented in the routers above)




app.listen(PORT, () => {
  console.log("Server running on port 3000");
});