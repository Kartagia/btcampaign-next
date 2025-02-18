
import { Mech } from "@/data/mechs";
import { Content } from "next/font/google";
import { notFound } from "next/navigation";
import { resourceLimits } from "worker_threads";

/**
 * The postgresql module for mech access DAO.
 * @module postgres/mech
 */

/**
 * @template VALUE The value type of the tested value.
 * @param value The 
 */
type Predicate<VALUE> = (value: VALUE) => boolean;


export interface EntryPredicate<CONTENT, ID> {
    /**
     * Test an entry.
     * @param entry 
     */
    testEntry(entry: [ID, CONTENT]): boolean;

    /**
     * Test whether some value matches.
     * @param iterator The tested predicate.
     * @return True, if and only if at least one value matches the predicate. 
     */
    some(iterator: Iterable<[ID, CONTENT]> | Iterator<[ID, CONTENT]>): boolean;

    every(iteartor: Iterable<[ID, CONTENT]> | Iterator<[ID, CONTENT]>): boolean;

    filter(iterator: Iterable<[ID, CONTENT]> | Iterator<[ID, CONTENT]>): Iterator<[ID, CONTENT]>;


}



/**
 * Creates a entry predicate.
 * @param predicate The predicate function testing an entry.
 * @returns The test entry preeicate using given predicate. An undefined predicate always returns false.
 */
export function createEntryPredicate<CONTENT, ID = string>(predicate: Predicate<[ID, CONTENT]>): EntryPredicate<CONTENT, ID> {

    return {
        testEntry(entry: [ID, CONTENT]): boolean {
            return (predicate != null && predicate(entry));
        },

        some(iter) {
            if (Symbol.iterator in iter) {
                return this.some(iter[Symbol.iterator]());
            } else {
                let next = iter.next();
                while (!next.done) {
                    if (this.testEntry(next.value)) {
                        return true;
                    }
                    next = iter.next();
                }
                return false;
            }
        },

        every(iter) {
            if (Symbol.iterator in iter) {
                return this.every(iter[Symbol.iterator]());
            } else {
                let next = iter.next();
                while (!next.done) {
                    if (!this.testEntry(next.value)) {
                        return false;
                    }
                    next = iter.next();
                }
                return true;
            }
        },
        filter(iter) {
            if (Symbol.iterator in iter) {
                return this.filter(iter[Symbol.iterator]());
            }
            const tester = this.testEntry.bind(this);
            return {
                next() {

                    let result = iter.next();
                    while (!result.done && !tester(result.value)) {
                        result = iter.next();
                    }
                    return result;
                }
            }
        }
    };
}


export class ContentPredicate<CONTENT, ID> implements EntryPredicate<CONTENT, ID> {
    predicate: Predicate<[ID, CONTENT]>;

    /**
     * Test an entry.
     * @param entry 
     */
    testEntry(entry: [ID, CONTENT]): boolean {
        return this.predicate(entry);
    }


    constructor(predicate: Predicate<[ID, CONTENT]>) {
        this.predicate = predicate;
    }
    some(iterator: Iterable<[ID, CONTENT]> | Iterator<[ID, CONTENT], any, any>): boolean {
        throw new Error("Method not implemented.");
    }
    every(iteartor: Iterable<[ID, CONTENT]> | Iterator<[ID, CONTENT], any, any>): boolean {
        throw new Error("Method not implemented.");
    }
    filter(iterator: Iterable<[ID, CONTENT]> | Iterator<[ID, CONTENT], any, any>): Iterator<[ID, CONTENT], any, any> {
        throw new Error("Method not implemented.");
    }


}


export interface Dao<CONTENT, ID = string> {

    getAll(predicate?: Predicate<[ID, CONTENT]> | EntryPredicate<CONTENT, ID>): Promise<[ID, CONTENT][]>;

    /**
     * 
     * @param id The identifier of the queried item.
     * @throws {NotFoundException}
     */
    get(id: ID): Promise<CONTENT>;

    /**
     * Create a new entry in the dao.
     * @param content THe new content added to the dao.
     */
    create(content: CONTENT): Promise<ID>;

    /**
     * Update an entry from DAO:
     * @param id The updated identifier.
     * @param newContent The new content.
     * @throws {NotFoundException} The rejected exception indicating there is
     * no content to modify.
     */
    update(id: ID, newContent: CONTENT): Promise<void>;

    /**
     * Deleete an entry from DAO.
     * @param id The deleted identifier.
     */
    delete(id: ID): Promise<boolean>;

}

export class Exception<TYPE = void, CAUSE = any> extends Error {

    /**
     * The detail of the exception.
     */
    private _detail: TYPE | undefined;

    constructor(msg: string, cause: CAUSE | undefined = undefined, detail: TYPE | undefined = undefined) {
        super(msg, { cause });
        this.name = this.constructor.name;
        this._detail = detail;
    }

    /**
     * The detail of the exception.
     */
    get detail(): TYPE | undefined {
        return this._detail;
    }

}

/**
 * Exception indicating a resource was not found.
 */
export class NotFoundException extends Exception {

    constructor(msg: string = "Resoure not found") {
        super(msg);
    }
}

/**
 * Exception indicating value was invalid.
 */
export class InvalidValueException<TYPE, CAUSE = any> extends Exception<TYPE, CAUSE> {

    constructor(msg: string = "Invalid resource value", detail: TYPE, cause: CAUSE | undefined = undefined) {
        super(msg, cause, detail);
    }
}

/**
 * The mech dao. 
 */
export default class MechDao implements Dao<Mech> {

    private content: Map<string, Mech>;

    private reservedIds: Set<string> = new Set();

    constructor(iter: Iterable<[string, Mech]> = []) {
        this.content = new Map(iter);
    }
    getAll(predicate?: Predicate<[string, Mech]> | EntryPredicate<Mech, string>): Promise<[string, Mech][]> {
        return Promise.resolve([...(this.content.entries())])
    }
    get(id: string): Promise<Mech> {
        if (this.content.has(id)) {
            return Promise.resolve(this.content.get(id)).then((res) => {
                if (res == null) throw new NotFoundException();
                return res;
            });
        } else {
            return Promise.reject(new NotFoundException());
        }
    }

    validContent(content: Mech): Promise<boolean> {
        return Promise.resolve(content != null);
    }

    generateId(content?: Mech | undefined): Promise<string> {
        return new Promise((resolve, reject) => {
            let result: string = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
            while (this.content.has(result) || this.reservedIds.has(result)) {
                result = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
            }
            this.reservedIds.add(result);
            resolve(result);
        });
    }

    create(content: Mech): Promise<string> {
        return this.validContent(content).then((isValid) => {
            if (isValid) {
                return this.generateId(content).then((id) => {
                    this.content.set(id, content);
                    this.reservedIds.delete(id);
                    return id;
                });
            } else {
                throw new InvalidValueException("Mech not found", content);
            }
        });
    }

    update(id: string, newContent: Mech): Promise<void> {
        return this.validContent(newContent).then(
            (isValid) => {
                if (isValid) {
                    this.content.set(id, newContent);
                    return undefined;
                } else {
                    throw new InvalidValueException("Mech not found", newContent);
                }
            });
    }
    delete(id: string): Promise<boolean> {
        return Promise.resolve(this.content.delete(id));
    }

}

const mechDb = new MechDao();

