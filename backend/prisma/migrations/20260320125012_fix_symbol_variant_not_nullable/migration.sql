/*
  Warnings:

  - Made the column `variant` on table `Symbol` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Symbol" ALTER COLUMN "variant" SET NOT NULL,
ALTER COLUMN "variant" SET DEFAULT '';
