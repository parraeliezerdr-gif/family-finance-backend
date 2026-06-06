/*
  Warnings:

  - Added the required column `passwordHash` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "passwordHash" TEXT NOT NULL;
