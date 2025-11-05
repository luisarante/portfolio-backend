import { Router } from "express";

const router = Router();

const projects = [
  { id: 1, name: "Portfólio React", description: "Feito com React e Tailwind" },
  { id: 2, name: "API Node", description: "Feito com Express e TypeScript" },
];

router.get("/", (req, res) => {
  res.json(projects);
});

export default router;
