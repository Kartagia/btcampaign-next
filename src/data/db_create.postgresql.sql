create table if not exists Modifier(
    id serial primary key,
    name varchar not null,
    target varchar not null,
    modifier varchar not null -- the modifier stored as  astring.
);

create table if not exists Equipment(
    id serial primary key,
    name varchar not null,
    weight float default '0.0',
    size integer default '0'
);

create table if not exists Weapon(
    weaponType varchar not null,
    damage int default '0'
) inherits Equipment;

create table if not exist WeaponModifier(
    equipmentId int not null references Equipment(id),
    modifierId int not null references Modifier(id),
    PRIMARY KEY (equipmentId, modifierId)
)



create table if not exist EquipmentModifier(
    equipmentId int not null references Equipment(id),
    modifierId int not null references Modifier(id),
    PRIMARY KEY (equipmentId, modifierId)
)

create table if not exists Unit {
    id serial primary key,
    model varchar(20),
    name varchar(80),
    type varchar(20),
    tonnage integer, 
    weightClass varchar(20)
};

create table if not exists Mech (
    model varchar(20) not null
) inherits (Unit);
