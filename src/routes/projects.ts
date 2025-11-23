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

    // --- 1. Processar Novas Tecnologias (New Techs) ---
    let newTechnologyIds: number[] = [];
    if (technologies.newNames && technologies.newNames.length > 0) {
      
      // 1.1. Inserir novas tecnologias na tabela 'Technology'
      await Prisma.technology.createMany({
        data: technologies.newNames.map((name: string) => ({ name: name })),
        skipDuplicates: true, // Garante que não falhe se o nome já foi adicionado por outro projeto
      });
      
      // 1.2. Buscar os IDs das tecnologias recém-criadas/existentes para relacionar
      const createdAndExistingNewTechs = await Prisma.technology.findMany({
        where: { name: { in: technologies.newNames } },
        select: { id: true },
      });
      newTechnologyIds = createdAndExistingNewTechs.map((t: { id: number }) => t.id);
    }

    // --- 2. Combinar Todos os IDs de Tecnologias ---
    const allTechnologyIds = [
      ...technologies.existingIds, // IDs do banco (checkboxes)
      ...newTechnologyIds,        // IDs das tecnologias manuais
    ];
    
    // --- 3. Criar o Projeto e suas Relações (Nested Writes) ---
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

        // Relacionamento TechnologiesOnProjects (Muitos-para-Muitos)
        technologies: {
          create: allTechnologyIds.map((techId: number) => ({
            technology: { connect: { id: techId } },
          })),
        },

        // Relacionamento Images (Um-para-Muitos)
        images: {
          // O frontend envia um array de URLs (string[]). Mapeamos para o formato esperado pelo Prisma.
          create: images.map((url: string) => ({
            url: url,
            altText: title, // Usando o título como altText padrão
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
    // Erro detalhado para facilitar o debug no servidor
    res.status(500).json({ error: "Erro interno ao criar projeto" });
  }
});

// =========================================================================
// Rota PUT /:id - Atualizar Projeto Existente
// =========================================================================
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
    // Payload vindo do frontend:
    technologies = { existingIds: [], newNames: [] }, // { existingIds: number[], newNames: string[] }
    images = [], // string[] (array de URLs)
  } = req.body;

  try {
    const projectId = parseInt(id);

    if (status && !Object.values(ProjectStatus).includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }
    
    // --- 1. Processar Novas Tecnologias (New Techs) ---
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

    // --- 2. Combinar Todos os IDs de Tecnologias ---
    const allTechnologyIds = [
      ...technologies.existingIds,
      ...newTechnologyIds,
    ];


    // --- 3. Atualizar o Projeto e suas Relações ---
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

        // Atualização de tecnologias: Deleta todos os antigos e recria as novas associações
        technologies: {
          deleteMany: {}, // Exclui todas as associações TechnologiesOnProjects existentes
          create: allTechnologyIds.map((techId: number) => ({
            technology: { connect: { id: techId } }, // Recria as novas associações
          })),
        },

        // Atualização de imagens: Deleta todas as antigas e recria as novas
        images: {
          deleteMany: {}, // Exclui todas as imagens antigas
          create: images.map((url: string) => ({ // Cria as novas imagens
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

// =========================================================================
// Rota DELETE /:id - Deletar Projeto
// =========================================================================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const projectId = parseInt(id);

    // O onDelete: Cascade na sua schema garante que Images e TechnologiesOnProjects
    // relacionadas serão deletadas automaticamente pelo banco de dados.
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