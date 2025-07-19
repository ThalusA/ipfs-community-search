declare module "@orbitdb/core" {
    import type {HeliaLibp2p} from "helia";
    import type {Libp2p, PeerId, ServiceMap,} from "@libp2p/interface";
    import type {TypedEmitter} from "tiny-typed-emitter";

    export function createOrbitDB<T extends ServiceMap = ServiceMap>(args: {
        ipfs: HeliaLibp2p<Libp2p<T>>;
        id?: string;
        identity?: Identity;
        identities?: IdentitiesType;
        directory?: string;
    }): Promise<OrbitDB<T>>;

    export interface DatabaseEvents {
        update: (entry: LogEntry) => void;
        close: () => void;
        drop: () => void;
        join: (peerId: PeerId, heads: Log[]) => void;
        leave: (peerId: PeerId) => void;
    }

    export type MetaData = Record<string, string | number | boolean>;

    type OpenDatabaseOptions = Partial<{
        type: string;
        meta: MetaData;
        sync: boolean;
        Database: BaseDatabase | DatabaseGenerator; // See https://github.com/orbitdb/orbitdb/blob/main/src/orbitdb.js#L149
        AccessController: typeof AccessControllerGenerator;
        headsStorage: Storage;
        entryStorage: Storage;
        indexStorage: Storage;
        referencesCount: number;
    }>;

    interface CreateDatabaseOptions<T extends ServiceMap = ServiceMap> {
        ipfs: HeliaLibp2p<Libp2p<T>>;
        identity?: Identity;
        address: string;
        name?: string;
        access?: AccessController;
        directory?: string;
        meta?: MetaData;
        headsStorage?: Storage;
        entryStorage?: Storage;
        indexStorage?: Storage;
        referencesCount?: number;
        syncAutomatically?: boolean;
        onUpdate?: (log: Log, entry: LogEntry) => void;
    }

    export interface InternalDatabase {
        address: string;
        name: string;
        identity: Identity;
        meta: MetaData;
        close: () => Promise<void>;
        drop: () => Promise<void>;
        addOperation: (op: DagCborEncodable) => Promise<string>;
        all: () => Promise<unknown>;
        log: Log;
        sync: Sync;
        peers: Set<string>;
        events: TypedEmitter<DatabaseEvents>;
        access: AccessController;
    }

    export type BaseDatabase = InternalDatabase & { type: string };

    export type DatabaseGenerator<T extends BaseDatabase = BaseDatabase> = (
        args: CreateDatabaseOptions,
    ) => Promise<T>;

    export function Documents<T extends string = "_id">(args?: {
        indexBy: T;
    }): (args: CreateDatabaseOptions) => Promise<
        BaseDatabase & DocumentsDatabase<T, Record<string, string>>
    >;

    export interface DocumentEntry<T> {
        hash: string;
        key: string;
        value: T
    }

    export interface DocumentsDatabase<T, E extends object> {
        address: string;
        identity: Identity;
        type: "documents";
        put: (doc: E) => Promise<void>;
        del: (key: string) => Promise<void>;
        get: (key: string) => Promise<E | null>;
        iterator: (args: { amount: number }) => Promise<Iterable<[string, string, E]>>;
        query: (findFn: (doc: E) => boolean) => Promise<E[]>;
        indexBy: T;
        all: () => Promise<DocumentEntry<E>[]>;
    }

    export interface Identity {
        id: string;
        publicKey: string;
        signatures: {
            id: string;
            publicKey: string;
        };
        type: string;
        sign: (identity: Identity, data: string) => Promise<string>;
        verify: (
            signature: string,
            publicKey: string,
            data: string,
        ) => Promise<boolean>;
    }

    export interface OrbitDB<T extends ServiceMap = ServiceMap> {
        id: string;
        open: (
            address: string,
            options?: OpenDatabaseOptions,
        ) => Promise<BaseDatabase>;
        stop: () => Promise<void>;
        ipfs: HeliaLibp2p<Libp2p<T>>;
        directory: string;
        keystore: KeyStoreType;
        identities: IdentitiesType;
        identity: Identity;
        peerId: PeerId;
    }

    export function useAccessController(
        accessController: typeof AccessControllerSpecifier,
    ): void;

    export interface Log {
        id: string;
        clock: () => Promise<Clock>;
        heads: () => Promise<LogEntry[]>;
        values: () => Promise<LogEntry[]>;
        get: (hash: string) => Promise<LogEntry>;
        has: (hash: string) => Promise<boolean>;
        append: (
            data: DagCborEncodable,
            options?: { referenceCount?: number },
        ) => Promise<LogEntry>;
        join: (log: Log) => Promise<boolean | undefined>;
        joinEntry: (entry: LogEntry) => Promise<void>;
        traverse: (
            rootEntries?: LogEntry[],
            shouldStopFn?: (entry: LogEntry) => boolean,
        ) => AsyncGenerator<LogEntry, void, unknown>;
        iterator: (args?: {
            amount?: number;
            gt?: string;
            gte?: string;
            lt?: string;
            lte?: string;
        }) => AsyncGenerator<LogEntry, void, unknown>;
        clear: () => Promise<void>;
        close: () => Promise<void>;
        access: AccessController;
        identity: Identity;
        storage: Storage;
    }

    export type DagCborEncodable =
        | string
        | number
        | null
        | boolean
        | DagCborEncodable[]
        | { [key: string]: DagCborEncodable };

    export interface SyncEvents {
        join: (peerId: PeerId, heads: LogEntry[]) => void;
        leave: (peerId: PeerId) => void;
        error: (error: Error) => void;
    }

    export interface Sync {
        add: (entry: LogEntry) => Promise<void>;
        stop: () => Promise<void>;
        start: () => Promise<void>;
        events: TypedEmitter<SyncEvents>;
        peers: Set<string>;
    }

    export function AccessControllerSpecifier(args: {
        storage?: Storage;
    }): typeof AccessControllerGenerator;

    export function AccessControllerGenerator(args: {
        orbitdb: OrbitDB;
        identities: IdentitiesType;
        address?: string;
    }): Promise<AccessController>;

    export interface AccessController {
        type: string;
        address: string;
        canAppend: (entry: LogEntry) => Promise<boolean>;
    }

    export function Identities<T extends ServiceMap = ServiceMap>(args: {
        keystore?: KeyStoreType;
        path?: string;
        storage?: Storage;
        ipfs?: HeliaLibp2p<Libp2p<T>>;
    }): Promise<{
        createIdentity: (options: object) => Promise<Identity>;
        getIdentity: (hash: string) => Promise<Identity>;
        verifyIdentity: (identity: Identity) => Promise<boolean>;
        sign: (identity: Identity, data: string) => Promise<string>;
        verify: (
            signature: string,
            publicKey: string,
            data: string,
        ) => Promise<string>;
        keystore: KeyStoreType;
    }>;

    export type IdentitiesType = Awaited<ReturnType<typeof Identities>>;


    export interface Clock {
        id: string;
        time: number;
    }

    export interface LogEntry<T extends DagCborEncodable = DagCborEncodable> {
        id: string;
        payload: { op: string; key: string | null; value?: T };
        next: string[];
        refs: string[];
        clock: Clock;
        v: number;
        key: string;
        identity: string;
        sig: string;
        hash: string;
    }

}
