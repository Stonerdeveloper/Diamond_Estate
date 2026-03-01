-- 1. Remove default and constraints from residents table
ALTER TABLE residents ALTER COLUMN role DROP DEFAULT;
ALTER TABLE residents DROP CONSTRAINT IF EXISTS residents_role_check;

-- 2. Remove constraints from levy_rates table
ALTER TABLE levy_rates DROP CONSTRAINT IF EXISTS levy_rates_resident_role_check;

-- 3. Rename columns
ALTER TABLE residents RENAME COLUMN role TO structure_type;
ALTER TABLE levy_rates RENAME COLUMN resident_role TO structure_type;

-- 4. Temporarily update existing data to a valid new structure type to avoid constraint errors
UPDATE residents SET structure_type = 'Mini Flat' WHERE structure_type IN ('tenant', 'landlord', 'admin');
UPDATE levy_rates SET structure_type = 'Mini Flat' WHERE structure_type IN ('tenant', 'landlord');

-- 5. Add new Check Constraints for the 9 distinct structure types
ALTER TABLE residents ADD CONSTRAINT residents_structure_type_check 
  CHECK (structure_type IN ('Duplex', 'Mini Flat', '2 & 3 Bedroom', 'Shop', 'Church', 'Warehouse', 'Hotel Bar', 'School', 'Bungalow'));

ALTER TABLE levy_rates ADD CONSTRAINT levy_rates_structure_type_check 
  CHECK (structure_type IN ('Duplex', 'Mini Flat', '2 & 3 Bedroom', 'Shop', 'Church', 'Warehouse', 'Hotel Bar', 'School', 'Bungalow'));

-- 6. Re-add a default value for residents (optional, but good practice)
ALTER TABLE residents ALTER COLUMN structure_type SET DEFAULT 'Mini Flat';
