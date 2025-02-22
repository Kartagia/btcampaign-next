
import { Mech } from "@/data/mechs";
import type { MechType, Unit } from "@/data/mechs";
import { Content, Rowdies } from "next/font/google";
import { notFound } from "next/navigation";
import { stringify } from "querystring";
import internal from "stream";
import { Client, Configuration, connect, DataType, Result, ResultRow } from "ts-postgres";
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


/**
 * An entry predicate testing identifier-content pairs.
 */
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

/**
 * The predicate testing a content.
 */
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

/**
 * Dae represents a database access object.
 */
export interface Dao<CONTENT, ID = string> {

    /**
     * Get all contents.
     * @param predicate The predicate filtering the entries. Defaults to the predicate 
     * accepting all values.
     * @return The promise of the identifier and content pairs fuflillign the predicate.
     */
    getAll(predicate?: Predicate<[ID, CONTENT]> | EntryPredicate<CONTENT, ID>): Promise<[ID, CONTENT][]>;

    /**
     * Get a content with identifier.
     * @param id The identifier of the queried item.
     * @return The promise of the content with identifier.
     * @throws {NotFoundException} The rejected error indicating there is no element with the identifier.
     */
    get(id: ID): Promise<CONTENT>;

    /**
     * Create a new entry in the dao.
     * @param content THe new content added to the dao.
     * @return The promise of the identifier assigned to the content.
     * @throws {InvalidContentException} The rejected error indicating the content was not accepted.
     */
    create(content: CONTENT): Promise<ID>;

    /**
     * Update an entry from DAO:
     * @param id The updated identifier.
     * @param newContent The new content.
     * @throws {NotFoundException} The rejected exception indicating there is
     * no content to modify.
     * @throws {InvalidContentException} The rejected ecxeption indicating the content
     * was not accepted.
     */
    update(id: ID, newContent: CONTENT): Promise<void>;

    /**
     * Delete an entry from DAO.
     * @param id The deleted identifier.
     * @returns The promise of the success of the operation.
     */
    delete(id: ID): Promise<boolean>;

}

/**
 * An exception base class streamlining exception class generation.
 * The exception handles the setting of the constructor name to the exception class name, 
 * and wrapping the cause to the error.
 * 
 * An exceptoiin has an optional source value.
 * 
 * @todo Move this to a new file.
 */
export class Exception<TYPE = void, CAUSE = any> extends Error {

    /**
     * The source value of the exception.
     */
    private _detail: TYPE | undefined;

    /**
     * Create a new exception.
     * @param msg The error message.
     * @param cause The cause of the exception.
     * @param source The source value of the exception.
     */
    constructor(msg: string, cause: CAUSE | undefined = undefined, source: TYPE | undefined = undefined) {
        super(msg, { cause });
        this.name = this.constructor.name;
        this._detail = source;
    }

    /**
     * The source value of the exception.
     */
    get source(): TYPE | undefined {
        return this._detail;
    }

}

/**
 * Exception indicating a resource was not found.
 */
export class NotFoundException<ID> extends Exception<ID> {

    /**
     * The default exception message for a not found exception.
     */
    static DefaultMessage = "Resource not found";

    /**
     * Create an exception indicating there was no content.
     * @param msg The excpetion message. Defaults to the {@link #defaultMessage}
     * @param id 
     */
    constructor(msg: string = NotFoundException.DefaultMessage, id: ID | undefined = undefined) {
        super(msg);
    }
}

/**
 * Exception indicating the DAO content was invalid.
 */
export class InvalidContentException<TYPE, CAUSE = any> extends Exception<TYPE, CAUSE> {

    /**
     * Create a new invalid content exception.
     * @param msg The error message.
     * @param detail The invalid content.
     * @param cause The cause of the exception.
     */
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
                throw new InvalidContentException("Mech not found", content);
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
                    throw new InvalidContentException("Mech not found", newContent);
                }
            });
    }
    delete(id: string): Promise<boolean> {
        return Promise.resolve(this.content.delete(id));
    }
}

/**
 * The postgresql query status information.
 */
export type Status = {
    /**
     * The completed command.
     */
    command: string,
    /**
     * The number of affected rows.
     */
    affectedRows: number,
    /**
     * The OID of the result.
     * Implemented for backward compatibility.
     * @deprecated
     */
    oid?: number
}

/**
 * Parse status frmo pq status string.
 * @param status The parsed status.
 * @returns The status parsed from the string.
 * @throws {SyntaxError} The status is not a valid status string.
 */
export function parseStatus(status: string | null): Status {
    if (status == null) {
        throw new SyntaxError("Status does not exist");
    }
    const match = /^(\w+)(?:\s+(\d+))?\s+(\d)\s*$/.exec(status);
    if (match) {
        if (match.length == 4) {
            return {
                command: match[1],
                oid: Number(match[2]),
                affectedRows: Number(match[3])
            };

        } else {
            return {
                command: match[1],
                affectedRows: Number(match[2])
            };
        }
    } else {
        throw new SyntaxError("Not a valid status message");
    }
}

/**
 * A mech DAO implementation using Postgresql to store the resources.
 */
export class PqMechDao extends MechDao {

    private connInfo: Configuration;

    private _pqConnection: Client | undefined = undefined;;

    /**
     * Parse an identifier string.
     * @param id The parsed identifier.
     * @returns A safe integer or a bigint of the identifier.
     * @throws {SyntaxError} The value was not a valid identifier. 
     */
    parseId(id: string): number | bigint {
        if (/^0*[\da-fA-F]+$/.test(id)) {
            if (id.length * 4 > 52) {
                // We need bigint.
                return BigInt("0x" + id);
            } else {
                // we git a number
                return Number.parseInt(id, 16);
            }
        } else {
            throw new NotFoundException("An invalid identifier syntax");
        }
    }

    /**
     * Create a new PqMechDao.
     * @param connection The ts-postges configuration for connection.
     */
    constructor(connection: Configuration | undefined = undefined) {
        super();
        if (connection != null) {
            this.connInfo = connection;
        } else {
            this.connInfo = {
                port: Number(process.env.DBPORT),
                password: process.env.DBPASSWD,
                user: process.env.DBUSER,
                host: process.env.DBHOST ?? "localhost"
            };
        }
        connect(this.connInfo).then(
            (client) => {
                this._pqConnection = client;
            }
        )
    }

    getAll(): Promise<[string, Mech][]> {
        if (this._pqConnection != null) {
            type ResultType = Mech & { id: number };
            return this._pqConnection.query<ResultType>("SELECT id, model, name, weightClass, tonnage FROM Mech;").then(
                (result) => {
                    const array: Array<[string, Mech]> = result.rows.map((row) => {
                        return [row.get("id").valueOf().toString(16), this.parseMech(row)];
                    });
                    return array;
                }
            )
        } else {
            return Promise.resolve([]);
        }
    }

    /**
     * Parse a mech type.
     * @param type The parsed type.
     * @returns The mech type.
     * @throws {SyntaxError} The value was not a valid mech type.
     */
    parseMechType(type: string): MechType {
        switch (type) {
            case "Humanoid": case "Quad": return type;
            default:
                throw new SyntaxError("Invalid mech type");
        }
    }

    /**
     * Prase a m
     * @param dbData The database result row for a mech query.
     * @returns The mech of the database mech query.
     * @throws {SyntaxError} The result row did not reprsent a valid mech.
     */
    parseMech(dbData: ResultRow<Mech>): Mech {
        return new Mech(dbData.get("model").toString(), dbData.get("name").toString(), this.parseMechType(dbData.get("type").toString()),
            Number(dbData.get("tonnage").valueOf()));
    }

    get(id: string): Promise<Mech> {
        if (this._pqConnection != null) {
            try {
                type ResultType = Mech;
                return this._pqConnection.query<ResultType>("SELECT model, name, weightClass, tonnage FROM Mech WHERE id=$1;", [this.parseId(id)]).then(
                    (result) => {
                        if (result.rows.length == 1) {
                            return this.parseMech(result.rows[0]);
                        } else {
                            throw new NotFoundException("No mech found", id);
                        }
                    });
            } catch (error) {
                return Promise.reject(error);
            }
        } else {
            return Promise.reject(new NotFoundException("No connection to database"));
        }

    }

    update(id: string, mech: Mech): Promise<void> {
        if (this._pqConnection != null) {
            try {
                type ResultType = Mech & { id: number };
                return this._pqConnection.query<ResultType>("UPDATE Mech SET model=$1, name=$2, weightClass=$3, tonnage=$4 WHERE id=$5;",
                    [mech.model, mech.name, mech.weightClass, mech.tonnage, this.parseId(id)]
                ).then(
                    (result) => {
                        const status = parseStatus(result.status);
                        if (status.affectedRows == 0) {
                            throw new NotFoundException("Cannot update a non-existing mech");
                        } else {
                            return undefined;
                        }

                    },
                    (error) => {
                        throw new InvalidContentException("The mech was invalid", mech);
                    }
                );
            } catch (error) {
                return Promise.reject(error);
            }
        } else {
            return Promise.reject(new NotFoundException("No database available"));
        }

    }

    delete(id: string): Promise<boolean> {
        if (this._pqConnection != null) {
            try {
                type ResultType = Mech & { id: number };
                return this._pqConnection.query<ResultType>("DELETE FROM Mech WHERE id=$1;",
                    [this.parseId(id)]
                ).then(
                    (result) => {
                        const status = parseStatus(result.status);
                        return status.affectedRows == 1;
                    },
                    (error) => {
                        throw error;
                    }
                );
            } catch (error) {
                return Promise.reject(error);
            }
        } else {
            return Promise.reject(new NotFoundException("No database available"));
        }

    }

    create(mech: Mech): Promise<string> {
        if (this._pqConnection != null) {
            type ResultType = Mech & { id: number };
            return this._pqConnection.query<ResultType>("INSERT INTO Mech(model, name, weightClass, tonnage) VALUES ($1, $2, $3, $4, $5) RETURNING id;",
                [mech.model, mech.name, mech.weightClass, mech.tonnage]
            ).then(
                (result) => {
                    const status = parseStatus(result.status);
                    if (status.affectedRows == 1) {
                        return result.rows[0].get("id").toString(16);
                    } else {
                        throw new InvalidContentException("Creating a new mech failed", mech);
                    }
                },
                (error) => {
                    throw error;
                }
            );
        } else {
            return Promise.reject(new Error("No database available"));
        }
    }
}

const mechDb = new MechDao();

