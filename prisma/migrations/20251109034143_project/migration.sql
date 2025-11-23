-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('EM_DESENVOLVIMENTO', 'CONCLUIDO', 'ARQUIVADO');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "aprendizados" TEXT[],
ADD COLUMN     "media_principal_url" TEXT,
ADD COLUMN     "proposito" TEXT,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'EM_DESENVOLVIMENTO';
