

/**
 * The weight class types. 
 */
type WeightClassType = "Light"|"Medium"|"Heavy"|"Assault"|"Super Heavy";

/**
 * The interface of any unit.
 */
interface Unit {
    /**
     * The model of the unit.
     */
    model: string;

    /**
     * The name of the unit.
     */
    name: string;

    /**
     * The unit type. 
     */
    type: string;

    /**
     * The tonnage of the unit.
     */
    tonnage: number;

    /**
     * The weight classification of the unit.
     */
    weightClass: WeightClassType;

}

/**
 * The mech types. 
 */
type MechType = ("Quad"|"Humanoid");

/**
 * Class representing a mech.
 */
export class Mech implements Unit {

    type: MechType;
    model: string;
    name: string;
    weightClass: WeightClassType;
    tonnage: number;

    /**
     * Create a new mech.
     * @param model The mech model name.
     * @param [name] The mech name. Defaults to the model name.
     * @param [type] The mech type. Defaults to "Humanoid". 
     */
    constructor(model: string, name: string|undefined=undefined, type:MechType="Humanoid", tonnage: number = 20) {
        this.type = type; 
        this.model = model;
        this.name = name ?? model;
        this.tonnage = tonnage;
        this.weightClass = (tonnage <= 35 ? "Light" : (tonnage <= 55 ? "Medium" : (tonnage <= 75 ? "Heavy": "Assault")));
    }

}

/**
 * A modifier type.
 */
export type Modifier<TYPE=number> = {
    name: string;
    target: string;
    modifier: TYPE;
}

/**
 * An equipment.
 */
export type Equipment = {

    /**
     * The equipment name.
     */
    name: string;
    /**
     * The equipment weight.
     */
    weight: number;

    /**
     * The equipment size in critical slots.
     */
    size: number;

    /**
     * The item modifiers.
     */
    modifiers: Modifier[];

    /**
     * The amount of heat the equipment use produces.
     */
    heat: number;
};

/**
 * A weapon type. 
 */
export type WeaponType = "Energy"|"Ballistic"|"Missile"|"Support";

/**
 * Weapon is an equipment causing damage.
 */
export interface Weapon extends Equipment {
    /**
     * The weapon type.
     */
    weaponType: WeaponType;

    /**
     * The weapon damage.
     */
    damage: number;

    /**
     * The damage modifiers, if the wepaon has some.
     */
    damageMods: Modifier[];
}

export type Location = string;

export type MechLocation = "H"|"LT"|"CT"|"RT"|"LA"|"RA"|"LL"|"RL";

export type VehicleLocation = "F"|"LS"|"RS"|"R"|"T"|"B";


/**
 * The loadout of an unit.
 */
export type Loadout = Map<Location, Equipment[]>;

/**
 * Calculate the total weight of equipment.
 * @param source The source, whose total value is calculated. It may be mapping with equipment list, an equipment list, or a single equipment.
 * @returns The total weight of the equipment.
 */
export function totalWeight<TYPE>(source: Map<TYPE, Equipment[]|Equipment>|Equipment[]|Equipment): number {
    let total = 0;
    if (source instanceof Map) {
        return source.entries().reduce( (result: number,entry : [TYPE, Equipment[]|Equipment]) => (result + totalWeight(entry[1] ?? [])), total);
    } else if (Array.isArray(source)) {
        return source.reduce( (result: number, item: Equipment) => (result + item.weight), 0);
    } else {
        return source.weight;
    }
}

/**
 * 
 */
export class StoredMech extends Mech {

    /**
     * The default configuration for the stored mech.
     */
    defaultConfig?: Loadout;

    constructor(mech: Mech, defaultConfig:Loadout|undefined = undefined) {
        super(mech.model, mech.name, mech.type, mech.tonnage);
        this.defaultConfig = defaultConfig;
    }

    /**
     * 
     * @param loadout 
     * @throws {SyntaxError} The loadout could not be loaded.
     */
    assemble(loadout: Loadout):AssembledMech {
        
        return new AssembledMech(this, loadout ?? this.defaultConfig);
    }
}

export class AssembledMech extends Mech {

    loadout: Loadout;

    constructor(mech: Mech, loadout?: Loadout) {
        super(mech.model, mech.name, mech.type, mech.tonnage);
        this.loadout = loadout ?? new Map();
    }

    availableTonnage(): number  {
        return this.tonnage - this.loadout.entries().map( ([location, entry], index) => ( entry.reduce( (result: number, item: Equipment) => (result + item.weight), 0)) ).reduce(
            (result, val) => (result + val), 0
        );
    }
}

export type Count<TYPE>  = {
    value: TYPE;
    count: number;
    valueOf():number;
    toString():string;
}

export function createCount<TYPE>(value: TYPE, count:number=1, stringifier: (val: TYPE)=>string = (val) => (""+val)): Count<TYPE> {

    const result: Count<TYPE> = {
        value, count,
        valueOf() { return this.count },
        toString() {
            return stringifier(this.value);
        }
    };
    return result;
}


/**
 * A mech bay stores mechs.
 */
export type MechBay = {
    /**
     * The name of the mech bay.
     */
    name: string;
    /**
     * The capacity of the mech bay.
     */
    capacity: number;
    /**
     * The contents of the mech bay.
     */
    contents: AssembledMech[];

    /**
     * Add mech to the mech bay.
     * @param mech The added mech.
     */
    addMech(mech: AssembledMech): boolean;

    /**
     * Store an assembled mech in the bay. The bay emptied.
     * @param mech THe stored mech, or mech position in the mech bay.
     * @returns The stored mech and the unassembled equipment, or an undefined
     * value indicating the bay does not have given mech.
     */
    storeMech(mech: AssembledMech|number): [StoredMech, Loadout]|undefined;
}


/**
 * Th emech storage. 
 */
export type MechStorage = {
    /**
     * The name of the mech storage.
     */
    name: string;
    /**
     * The partial mech salvage. 
     */
    parts: Record<string, (Count<Mech>)>;
    /**
     * The stored mech chassis.
     */
    stored: Record<string, (Count<Mech>)>;
    /**
     * The mech bays.
     */
    bays: MechBay[];

}