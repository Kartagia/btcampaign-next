-- Modifier 
drop table if exists Modifier cascade;
create table if not exists Modifier(
    id serial primary key,
    name varchar not null,
    target varchar not null,
    modifier varchar not null -- the modifier stored as  astring.
);

drop table if exists Equipment cascade;
create table if not exists Equipment(
    id serial primary key,
    name varchar not null,
    weight float default '0.0',
    size integer default '0'
);

create table if not exists WeaponType(
    id smallserial primary key,
    name varchar(20) not null unique,
    mountType varchar(20)
);
comment on table WeaponType is 'Weapon type determines the mount type and damage type of the weapon.';
insert into WeaponType(name, mountType) VALUES ('Energy', 'Energy'), ('Ballistic', 'Ballistic'), ('Missile', 'Missile'), ('Support', 'AntiPersonel');

--
create table if not exists Weapon(
    typeId smallint not null references weaponType(id) on update cascade on delete cascade,
    damage int default '0'
) inherits (Equipment);
create comment on table weapon is 'Weapon is an equipment capable damaging targets.';
create view WeaponView as SELECT Weapon.id, name, damage, damageType, mountType, weight, size FROM Weapon JOIN WeaponType ON typeId=WeaponType.id;

-- Create weapon modifier affects the target hit
drop table if exists WeaponModifier cascade;
create table if not exists WeaponModifier(
    equipmentId int not null references Equipment(id) on update cascade on delete cascade,
    modifierId int not null references Modifier(id) o update cascade on delete cascade,
    PRIMARY KEY (equipmentId, modifierId)
);
comment on table WeaponModifier is 'Weapon modifier affects target hit.';

-- Create equipment modifier
create table if not exists EquipmentModifier(
    equipmentId int not null references Equipment(id),
    modifierId int not null references Modifier(id),
    PRIMARY KEY (equipmentId, modifierId)
);
comment on table EquipmentModifier is 'Equipment modifier affects owner of the equipment.';

-- Create unit and mech
drop table if exists Unit cascade;
create table if not exists Unit (
    id serial primary key,
    model varchar(20),
    name varchar(80) not null,
    type varchar(20) not null,
    tonnage integer, 
    weightClass varchar(20) not null
);

create table if not exists Mech (
    model varchar(20) not null
) inherits (Unit);

create table if not exists Location(
    id smallserial primary key,
    name varchar(20) not null,
    abbrev varchar(4) not null,
    hit boolean default TRUE
);

create table if not exists MechLocation(
    capacity smallint,
    unique (name),
    unique (abbrev)
) inherits (Location);

create table if not exists VehicleLocation(
    unique (name),
    unique (abbrev)
) inherits (Location);

create sequence if not exists loadout_id_seq AS int;
-- Separate loadout and loadout contents
create table if not exists Loadout(
    id serial primary key
);

drop table if exists Loadout_Content cascade;
create table if not exists Loadout_Content(
    loadoutId int not null references Loadout(id) on update cascade on delete cascade,
    rowId smallint not null, 
    locationId smallint,
    equipmentId smallint references Equipment(id) on update cascade on delete cascade,
    primary key (loadoutId, rowId)
);
create view LocationLoadoutJson as SELECT loadoutId, locationId, Location.abbrev, json_agg(json_build_object('id', equipment.id, 'name', equipment.name)) AS contents
FROM Loadout JOIN Loadout_Content ON Loadout.id=loadoutId JOIN Equipment ON Equipment.id=equipmentId JOIN Location ON Location.id = locationId
GROUP BY loadoutId, locationId, location.abbrev
ORDER BY loadoutId;
create view LoadoutJson as select loadoutId, json_object_agg(abbrev, contents) FROM LocationLoadoutJson GROUP BY loadoutId;

create table if not exists default_loadouts (
    loadoutId int not null references Loadout(id) on update cascade on delete cascade,
    mechId int not null,
    primary key (loadoutId, mechId)
);

create table if not exists assembled_mech(
    id serial primary key,
    mechId int not null, 
    loadoutId int not null references Loadout(id) on update cascade on delete set null
);

create table if not exists mech_bay(
    id serial primary key,
    name varchar(80) not null, 
    capacity smallint default '6'
);

create table if not exists mech_bay_content(
    bayId smallint not null references mech_bay(id) on update cascade on delete cascade,
    slotId smallint not null,
    mechId int not null,
    primary key (bayId, slotId)
);
create view mech_bay_list as select bayId, slotId, mechId FROM mech_bay_content JOIN mech ON mechId = Mech.id;
create view mech_bay_invalid_content as select bayId, slotId, mechId FROM mech_bay_content where mechId NOT IN (SELECT id from Mech);

create table if not exists mech_storage(
    id serial primary key,
    name varchar(80) not null
);

create table if not exists  mech_storage_bays(
    storageId int not null references mech_storage(id) on update cascade on delete cascade,
    bayId int not null references mech_bay(id) on update cascade on delete cascade,
    primary key (storageId, bayId)
);

create table if not exists mech_storage_chassis(
    storageId int not null references mech_storage(id) on update cascade on delete cascade,
    chassisId int not null references unit(id) on update cascade on delete cascade
)