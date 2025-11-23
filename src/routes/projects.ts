import { Router } from "express";
import { ProjectStatus } from '@prisma/client';
import Prisma from "../prisma.js";
import { authenticateToken } from '../middlewares/auth.js'; 
import { requireAdmin } from "../middlewares/authorization.js";

const router = Router();

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
        { proposito: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const projects = await Prisma.project.findMany({
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

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const project = await Prisma.project.findUnique({
      where: { id: Number(id) },
      include: {
        images: true,
        technologies: { include: { technology: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado." });
    }
    res.json(project);
  } catch (err) {
    console.error(`Erro ao buscar projeto ${id}:`, err);
    res.status(500).json({ error: "Erro ao buscar projeto" });
  }
});

router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  const {
    title,
    description,
    linkRepo,
    linkDemo,
    projectDate,
    proposito,
    aprendizados = [],
    media_principal_url,
    status,
    technologies = { existingIds: [], newNames: [] }, 
    images = [], 
  } = req.body;

  try {
    if (!title || !description || !linkRepo || !linkDemo || !projectDate || !status) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }
    if (!Object.values(ProjectStatus).includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use um de: ${Object.values(ProjectStatus).join(', ')}` });
    }

    let newTechnologyIds: number[] = [];
    if (technologies.newNames && technologies.newNames.length > 0) {
      
      await Prisma.technology.createMany({
        data: technologies.newNames.map((name: string) => ({ name: name })),
        skipDuplicates: true, 
      });
      
      const createdAndExistingNewTechs = await Prisma.technology.findMany({
        where: { name: { in: technologies.newNames } },
        select: { id: true },
      });
      newTechnologyIds = createdAndExistingNewTechs.map((t: { id: number }) => t.id);
    }

    const allTechnologyIds = [
      ...technologies.existingIds, 
      ...newTechnologyIds,        
    ];
    
    const project = await Prisma.project.create({
      data: {
        title,
        description,
        linkRepo,
        linkDemo,
        projectDate: new Date(projectDate),
        proposito,
        aprendizados,
        media_principal_url,
        status,

        technologies: {
          create: allTechnologyIds.map((techId: number) => ({
            technology: { connect: { id: techId } },
          })),
        },

        images: {
          create: images.map((url: string) => ({
            url: url,
            altText: title, 
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

router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    linkRepo,
    linkDemo,
    projectDate,
    proposito,
    aprendizados,
    media_principal_url,
    status,
    technologies = { existingIds: [], newNames: [] }, 
    images = [], 
  } = req.body;

  try {
    const projectId = parseInt(id);

    if (status && !Object.values(ProjectStatus).includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }
    
    let newTechnologyIds: number[] = [];
    if (technologies.newNames && technologies.newNames.length > 0) {
      await Prisma.technology.createMany({
        data: technologies.newNames.map((name: string) => ({ name: name })),
        skipDuplicates: true,
      });
      const createdAndExistingNewTechs = await Prisma.technology.findMany({
        where: { name: { in: technologies.newNames } },
        select: { id: true },
      });
      newTechnologyIds = createdAndExistingNewTechs.map((t: { id: number }) => t.id);
    }

    const allTechnologyIds = [
      ...technologies.existingIds,
      ...newTechnologyIds,
    ];


    const updatedProject = await Prisma.project.update({
      where: { id: projectId },
      data: {
        title,
        description,
        linkRepo,
        linkDemo,
        projectDate: projectDate ? new Date(projectDate) : undefined,
        proposito,
        aprendizados,
        media_principal_url,
        status,

        technologies: {
          deleteMany: {},
          create: allTechnologyIds.map((techId: number) => ({
            technology: { connect: { id: techId } }, 
          })),
        },

        images: {
          deleteMany: {}, 
          create: images.map((url: string) => ({ 
            url: url,
            altText: title || `Imagem do projeto ${id}`, 
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

    await Prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: "Projeto deletado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar projeto:", err);
    res.status(500).json({ error: "Erro ao deletar projeto" });
  }
});

export default router;