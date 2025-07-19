import {
    type AccessController,
    AccessControllerGenerator,
    type DocumentsDatabase,
    type LogEntry,
    useAccessController
} from "@orbitdb/core";
import type {Entry} from "./types.ts";

export const AuthorAccessController = () => async (args: Parameters<typeof AccessControllerGenerator>[0]): Promise<AccessController & {
    type: 'author-only'
}> => {
    const {orbitdb, identities} = args;
    const address = args.address ?? "search_entries";
    const db = await orbitdb.open(address, {type: 'documents'}) as unknown as DocumentsDatabase<"name", Entry>;

    async function canAppend(entry: LogEntry): Promise<boolean> {
        const writerIdentity = await identities.getIdentity(entry.identity);
        if (!await identities.verifyIdentity(writerIdentity)) {
            return false
        }
        const {op, key} = entry.payload;
        if (key === null) {
            return false;
        }
        const existing = await db.get(key)
        if (op === 'PUT' && !existing) {
            return true
        }
        return (op === 'PUT' || op === 'DEL') && existing?.author === writerIdentity.id;
    }

    return {
        type: 'author-only',
        address,
        canAppend,
    }
}

// eslint-disable-next-line react-hooks/rules-of-hooks
useAccessController(AuthorAccessController);