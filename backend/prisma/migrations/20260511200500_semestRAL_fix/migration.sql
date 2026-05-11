-- 1) Permite temporariamente SEMETRAL (antigo) e SEMESTRAL (novo)
ALTER TABLE `Activity`
  MODIFY `period` ENUM('SEMANAL', 'MÊS', 'QUADRIENAL', 'SEMETRAL', 'SEMESTRAL', 'ANO') NOT NULL;

-- 2) Converte os registros existentes
UPDATE `Activity` SET `period` = 'SEMESTRAL' WHERE `period` = 'SEMETRAL';

-- 3) Restringe para apenas o valor correto
ALTER TABLE `Activity`
  MODIFY `period` ENUM('SEMANAL', 'MÊS', 'QUADRIENAL', 'SEMESTRAL', 'ANO') NOT NULL;
