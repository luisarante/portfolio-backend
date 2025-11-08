import express from "express";
import cors from "cors";
import projectsRouter from "./routes/projects.js";
import skillsRouter from "./routes/skills.js";
import technologiesRouter from "./routes/technologies.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/projects", projectsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/my-skills", technologiesRouter);

app.get("/", (req, res) => {
  res.send("Backend online 🚀");
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT} e acessível na rede.`);
});