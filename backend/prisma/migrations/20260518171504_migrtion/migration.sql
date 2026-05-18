/*
  Warnings:

  - You are about to drop the column `participantId` on the `Completion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[groupId,activityId,periodKey]` on the table `Completion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `groupId` to the `Completion` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Completion` DROP FOREIGN KEY `Completion_participantId_fkey`;

-- DropIndex
DROP INDEX `Completion_participantId_activityId_periodKey_key` ON `Completion`;

-- AlterTable
ALTER TABLE `Completion` DROP COLUMN `participantId`,
    ADD COLUMN `activityPeriod` ENUM('SEMANAL', 'MÊS', 'QUADRIENAL', 'SEMESTRAL', 'ANO') NULL,
    ADD COLUMN `activityPoints` INTEGER NULL,
    ADD COLUMN `groupId` VARCHAR(191) NOT NULL,
    ADD COLUMN `isValidated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `validatedAt` DATETIME(3) NULL,
    MODIFY `evidenceUrl` LONGTEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Completion_groupId_activityId_periodKey_key` ON `Completion`(`groupId`, `activityId`, `periodKey`);

-- AddForeignKey
ALTER TABLE `Completion` ADD CONSTRAINT `Completion_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
