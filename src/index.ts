import express from "express";
import cors from "cors";
import projectsRouter from "./routes/projects";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/projects", projectsRouter);

app.get("/", (req, res) => {
  res.send("Backend online 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
