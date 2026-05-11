-- 1) Permite temporariamente valores antigos e novos
ALTER TABLE `Activity`
  MODIFY `period` ENUM(
    'WEEK', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR',
    'SEMANAL', 'MÊS', 'QUADRIENAL', 'SEMETRAL', 'ANO'
  ) NOT NULL;

-- 2) Converte dados existentes
UPDATE `Activity` SET `period` = 'SEMANAL' WHERE `period` = 'WEEK';
UPDATE `Activity` SET `period` = 'MÊS' WHERE `period` = 'MONTH';
UPDATE `Activity` SET `period` = 'QUADRIENAL' WHERE `period` = 'QUARTER';
UPDATE `Activity` SET `period` = 'SEMETRAL' WHERE `period` = 'SEMESTER';
UPDATE `Activity` SET `period` = 'ANO' WHERE `period` = 'YEAR';

-- 3) Restringe para apenas os valores novos
ALTER TABLE `Activity`
  MODIFY `period` ENUM('SEMANAL', 'MÊS', 'QUADRIENAL', 'SEMETRAL', 'ANO') NOT NULL;
