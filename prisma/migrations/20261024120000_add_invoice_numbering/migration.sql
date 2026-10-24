-- Invoice numbers are entered by the admin as a plain number (1, 2, 3 ...).
-- They are unique within a financial year (1 Apr - 31 Mar), so the series
-- starts again from 1 every year.
ALTER TABLE `orders`
  ADD COLUMN `invoice_number` INT UNSIGNED NULL AFTER `placed_at`,
  ADD COLUMN `invoice_financial_year` VARCHAR(9) NULL AFTER `invoice_number`,
  ADD COLUMN `invoice_date` TIMESTAMP(0) NULL AFTER `invoice_financial_year`,
  ADD UNIQUE KEY `uq_order_invoice_fy_number` (`invoice_financial_year`, `invoice_number`);
