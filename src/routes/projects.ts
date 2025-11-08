import { Router } from "express";
import { PrismaClient } from "../generated/prisma/client.js";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const { tech, year, search } = req.query;

    const where: any = {};

    if (tech) {
      const techNames = String(tech).split(",").map(t => t.trim());

      where.technologies = {
        some: {
          technology: {
            name: { in: techNames, mode: "insensitive" },
          },
        },
      };
    }

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${Number(year) + 1}-01-01`);
      where.projectDate = { gte: startDate, lt: endDate };
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        technologies: { include: { technology: true } },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(projects);
  } catch (err) {
    console.error("Erro ao buscar projetos:", err);
    res.status(500).json({ error: "Erro ao buscar projetos" });
  }
});

router.post("/", async (req, res) => {
  const {
    title,
    description,
    linkRepo,
    linkDemo,
    projectDate,
    technologies = [],
    images = [],
  } = req.body;

  try {
    if (!title || !description || !linkRepo || !linkDemo || !projectDate) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        linkRepo,
        linkDemo,
        projectDate: new Date(projectDate),

        technologies: {
          create: technologies.map((techId: number) => ({
            technology: { connect: { id: techId } },
          })),
        },

        images: {
          create: images.map((img: any) => ({
            url: img.url,
            altText: img.altText || null,
          })),
        },
      },
      include: {
        technologies: { include: { technology: true } },
        images: true,
      },
    });

    res.status(201).json(project);
  } catch (err) {
    console.error("Erro ao criar projeto:", err);
    res.status(500).json({ error: "Erro interno ao criar projeto" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    linkRepo,
    linkDemo,
    projectDate,
    technologies = [],
    images = [],
  } = req.body;

  try {
    const projectId = parseInt(id);

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        title,
        description,
        linkRepo,
        linkDemo,
        projectDate: projectDate ? new Date(projectDate) : undefined,

        technologies: {
          deleteMany: {},
          create: technologies.map((techId: number) => ({
            technology: { connect: { id: techId } },
          })),
        },

        images: {
          deleteMany: {},
          create: images.map((img: any) => ({
            url: img.url,
            altText: img.altText || null,
          })),
        },
      },
      include: {
        technologies: { include: { technology: true } },
        images: true,
      },
    });

    res.json(updatedProject);
  } catch (err) {
    console.error("Erro ao atualizar projeto:", err);
    res.status(500).json({ error: "Erro ao atualizar projeto" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const projectId = parseInt(id);

    await prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: "Projeto deletado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar projeto:", err);
    res.status(500).json({ error: "Erro ao deletar projeto" });
  }
});

export default router;
