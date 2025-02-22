
-- Populates new database with default values.
-- Populate mech hit locations
insert into MechLocation(name, abbrev, hit, capacity) VALUES ('Head', 'H', TRUE,1), ('Left Arm', 'LA', TRUE,8), ('Left Leg', 'LL', TRUE,4), ('Left Torso', 'LT', TRUE,10), ('Center Torso', 'CT', true,4),
('Right Torso', 'RT', true,10), ('Right Leg', 'LR', true,4), ('Right Arm', 'RA', TRUE, 8), ('Body', 'Body', FALSE, 0);

-- Populate vehicle hit locations.
Insert into VehicleLocation(name, abbrev, hit) VALUES ('Front', 'F', true), ('Left Side', 'LS', true), ('Right Side', 'RS', true), ('Rear', 'R', true), ('Turret', 'T', true), ('Body', 'Body', false);

-- Populate default loaudout
