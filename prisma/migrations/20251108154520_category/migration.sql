-- AlterTable
ALTER TABLE "Technology" ADD COLUMN     "category" TEXT,
ADD COLUMN     "showInPortfolio" BOOLEAN NOT NULL DEFAULT true;
