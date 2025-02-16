
import { useState } from 'react';
import { createCount, Mech } from '../data/mechs.ts';

import styles from "./MechCollectionScoring.module.css";
const error = console.error;
const log = console.log;

/**
 * The mech parts change.
 * @typedef {Object} MechPartChange
 * @property {string} model The target model.
 * @property {number} count The amount the mech part count is changed.
 */

/**
 * The mech storage change.
 * @typedef {Object} MechStorageChange
 * @property {string} model The target model.
 * @property {number} count The number of storage items changed.
 * @property {import("../data/mechs.ts").Loadout} [defaultLoadout] The default loadout.
 */

/**
 * The assembling a mech. 
 * @typedef {Object} AssembleMech
 * @property {string} model The target model.
 * @property {import("../data/mechs.ts").Loadout} [defaultLoadout] The default loadout of the
 * assembled mech.
 * @property {import("../data/mechs.ts").Loadout} [loadout] The actual loadout assembed to the mech.
 * Defaults to an empty loadout.
 */

/**
 * The disasselbmling a mech and storing it the storage.
 * @typedef {Object} StoreMech
 * @property {string} model The target model. 
 * @property {string} [bayName] The name of the bay. If no bay is given, the mech is not stored
 * from a mech bay.
 * @property {import("../data/mechs.ts").Loadout} [defaultLoadout] The stored default layout.
 * @property {import("../data/mechs.ts").Loadout} loadout The loadout removed from the mech. 
 */


/**
 * The mech collection payload types.
 * @typedef {MechPartChange|MechStorageChange|AssembleMech|StoreMech} MechCollectionPayload
 */

/**
 * A custom event indicating a mech collection has changed.
 * @extends {CustomEvent<MechCollectionPayload>}
 */
export class MechCollectionEvent extends CustomEvent {

    /**
     * Create a mech collection event.
     * @param {string} eventType The event type.
     * @param {MechCollectionPayload} payload 
     */
    constructor(eventType, payload) {
        super(eventType, { detail: payload });
    }

}

export class MechPartAddedEvent extends MechCollectionEvent {

    /**
     * Create a new mech part added event.
     * @param {string} model The model name. 
     * @param {number} [count=1] The number of parts added. 
     */
    constructor(model, count = 1) {
        if (count < 1) throw new RangeError("Invalid mech part amount");
        super("partAdded", { model, count });
    }
}

export class MechPartRemovedEvent extends MechCollectionEvent {
    /**
     * Create a new mech part added event.
     * @param {string} model The model name. 
     * @param {number} [count=1] The number of parts added. 
     */
    constructor(model, count = 1) {
        if (count < 1) throw new RangeError("Invalid mech part amount");
        super("partRemoved", { model, count: -count });
    }

}

export class MechAssembledEvent extends MechCollectionEvent {

    constructor(model, { defaultLoadout = undefined, bayName = undefined, loadout = new Map() }) {
        super("mechAssembled", {
            model,
            defaultLoadout,
            bayName,
            loadout
        })
    }
}

export class MechStoredEvent extends MechCollectionEvent {

    constructor(model, { defaultLoadout = undefined, bayName = undefined, loadout }) {
        super("mechAssembled", {
            model,
            defaultLoadout,
            bayName,
            loadout
        })
    }

}

export function MechScoringComponent({ model, parts, maxParts, stored, assembled, children }) {

    return (<article className={styles.MechModel}><header>{model}</header><main><center>{stored + assembled}[{assembled}] {
        parts}/{maxParts}</center></main><footer>{children}</footer></article>)
}

/**
 * Create a mech collection scoring component.
 * @param {*} param0 
 * @param {import("../data/mechs.ts").MechStorage} param0.value The mech storage.
 * @param {(e: MechCollectionEvent) => void} Change listener reacting to the changes of the collection.
 * @returns 
 */
export default function MechCollectionScoring({ value, onChange = undefined, maxParts = 3 }) {
    const [weightClass, setWeightClass] = useState(undefined);
    const [items, setItems] = useState(value);

    /**
     * THe list of scoring mechs. 
     * @type {Partial<Mech, "model"|"weightClass">[]}
     */
    const scoringMechs = [
        ...([
            "PNT-9R", "LCT-1M", "LCT-1S", "LCT-1V", "COM-1B", "COM-2D", "SDR-5V",
            "UM-R60", "FS9-H", "JR7-D"
        ].map(model => ({ model, weightClass: "Light" }))),
        ...([
            "CDA-2A", "CDA-3D", "BJ-1", "VND-1R", "CN9-A", "CN9-AL", "ENF-4R",
            "HBK-4G", "HBK-4P", "TBT-5N", "GRF-1N", "GRF-1S", "KTO-18", "SHD-2D",
            "SHD-2H", "WVR-6K", "WVR-6R"
        ].map(model => ({ model, weightClass: "Medium" }))),
        ...([
            "DRG-1N", "QKD-4G", "QKD-5A", "CPLT-C1", "CPLT-K2", "JM6-A", "JM6-S",
            "TDR-5S", "TDR-5SE", "TDR-5SS", "CTF-1X", "GHR-6H", "BL-6-KNT",
            "ON1-K", "ON1-V"
        ].map(model => ({ model, weightClass: "Heavy" }))),
        ...([
            "AWS-8Q", "AWS-8T", "VTR-9B", "VTR-9S", "ZEU-6S", "BLR-1G",
            "STK-3F", "HGN-733", "HGN-733P", "BNC-3E", "BNC-3M", "AS7-D",
            "KGC-0000"
        ].map(model => ({ model, weightClass: "Assault" })))
    ];

    const increasePart = (modelName, count = 1) => {
        if (count >= 1) {
            if (modelName in items.parts) {
                const newTotal = items.parts[modelName].count + count;
                const newCount = newTotal % maxParts;
                const newStored = Math.trunc(newTotal / maxParts);
                log("Increasing existing mech model " + modelName + ` into ${newStored} new stored and ${newCount} parts`);
                setItems((current) => ({
                    ...current, parts: { ...current.parts, [modelName]: createCount(modelName, newCount) }, stored: {
                        ...current.stored, [modelName]: createCount(modelName, (current.stored[modelName]?.count || 0) + newStored) }
                    }));
            } else {
                const newTotal = count;
                const newCount = newTotal % maxParts;
                const newStored = Math.trunc(newTotal / maxParts);
                log("Increasing a new mech model " + modelName + ` into ${newStored} new stored and ${newCount} parts`);
                setItems((current) => ({ ...current, parts: { ...current.parts, [modelName]: createCount(modelName, newCount), stored: {
                        ...current.stored, [modelName]: createCount(modelName, (current.stored[modelName]?.count || 0) + newStored) } } }));
            }
        } else {
            error(`Trying to decrease part ${modelName} below with incerase part`);
        }
    }

    const reducePart = (modelName, count = 1) => {
        if (count >= 1) {
            if (modelName in items.parts) {
                const newTotal = items.parts[modelName].count - count;
                if (newTotal < 0) {
                    error(`Trying to decrease ${modelName} part count below zero.`);
                    return;
                }
                log("Decreasing existing mech model " + modelName + ` into ${newTotal} parts`);
                setItems((current) => ({
                    ...current, parts: { ...current.parts, [modelName]: createCount(modelName, newTotal) }
                    }));
            } else {
                error(`Trying to decrease ${modelName} part count below zero.`);
            }
        } else {
            error(`Trying to decrease part ${modelName} below with incerase part`);
        }
    }

    return (<div className={styles.scoringMechs}>
        <header>Mech collection scoring</header>
        <nav><ul className="nav">{["Light", "Medium", "Heavy", "Assault"].map(
            current => (<li key={current} className={["nav-item", ...(weightClass == current ? "selected" : [])].join(" ")} disabled={weightClass === current} onClick={
                (e) => { setWeightClass((oldClass) => (oldClass == current ? undefined : current)) }
            }>{current}</li>)
        )}</ul></nav>
        <main>
            {(weightClass ? scoringMechs.filter(current => (current != null && current.weightClass === weightClass)) : scoringMechs).map(mechModel => (<div key={mechModel.model}>
                <MechScoringComponent key={mechModel.model} model={mechModel.model} parts={
                    (items.parts[mechModel.model]?.count ?? 0)
                } maxParts={
                    maxParts
                } stored={
                    (items.stored[mechModel.model]?.count ?? 0)
                } assembled={
                    (items.bays.reduce((total, bay) => (total + bay.reduce((count, assembled) => (mechModel.model != null && mechModel.model === assembled.model ? count + 1 : count), 0)), 0))
                } ><button name="Add" type="button" onClick={(e) => { increasePart(mechModel.model) }}>Add Part</button>
                <button type="button" disabled={(items.parts[mechModel.model] ?.count ?? 0) == 0} onClick={(e) => { reducePart(mechModel.model) }}>Remove Part</button></MechScoringComponent></div>))}
        </main>
        <footer>

        </footer>
    </div>)
}