-- AlterTable
ALTER TABLE `Participant` ADD COLUMN `church` VARCHAR(191) NULL;
ALTER TABLE `Participant` ADD COLUMN `isLeader` BOOLEAN NOT NULL DEFAULT false;

