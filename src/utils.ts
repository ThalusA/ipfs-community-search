import Fuse from "fuse.js";
import type {Entry} from "./types.ts";
import {createLibp2p} from "libp2p";
import {webRTCDirect} from "@libp2p/webrtc";
import {yamux} from "@chainsafe/libp2p-yamux";
import {noise} from "@chainsafe/libp2p-noise";
import {gossipsub} from "@chainsafe/libp2p-gossipsub";
import {kadDHT} from "@libp2p/kad-dht";
import {ping} from "@libp2p/ping";
import {identify} from "@libp2p/identify";
import {IDBDatastore} from "datastore-idb";
import {IDBBlockstore} from "blockstore-idb";
import {createHelia} from "helia";
import {createOrbitDB, Documents, type DocumentsDatabase} from "@orbitdb/core";
import {AuthorAccessController} from "./controller.ts";

export async function openDatabase() {
    const libp2p = await createLibp2p({
        transports: [webRTCDirect()],
        streamMuxers: [yamux()],
        connectionEncrypters: [noise()],/*
    peerDiscovery: [
        bootstrap({
            list: []
        })
    ],*/
        services: {
            pubsub: gossipsub({
                allowPublishToZeroTopicPeers: true
            }),
            dht: kadDHT(),
            ping: ping(),
            identify: identify()
        }
    })

    const datastore = new IDBDatastore('helia-keystore');
    await datastore.open();
    const blockstore = new IDBBlockstore('helia-blockstore')
    await blockstore.open();
    const helia = await createHelia({datastore, blockstore, libp2p})
    const orbitdb = await createOrbitDB({ipfs: helia, directory: '/search_entries'});

    const db = await orbitdb.open("search_entries", {
        AccessController: AuthorAccessController(),
        Database: Documents({indexBy: 'name'}),
        type: 'documents'
    }) as unknown as DocumentsDatabase<"name", Entry>;
    console.log(`Connected to address: ${db.address}`)
    return db;
}

export async function listEntries(db: DocumentsDatabase<"name", Entry>) {
    const elements = await db.all();
    console.log(elements);
    return elements.map(({value}) => value);
}

export async function rebuildIndex(db: DocumentsDatabase<"name", Entry>) {
    const entries = await listEntries(db);
    return new Fuse(entries, {keys: ['name'], threshold: 0.3})
}

export async function addEntry(db: DocumentsDatabase<"name", Entry>, index: Fuse<Entry>, name: string, address: string): Promise<void> {
    const entry: Entry = {"name": name, "timestamp": new Date().toISOString(), "author": db.identity.id, address};
    index.add(entry);
    await db.put(entry);
}

export async function deleteEntry(db: DocumentsDatabase<"name", Entry>, index: Fuse<Entry>, name: string): Promise<void> {
    const found_entry = await db.get(name);
    if (found_entry !== null) {
        index.remove((entry) => entry.name == found_entry.name);
    }
    await db.del(name);
}

export async function searchByName(db: DocumentsDatabase<"name", Entry>, index: Fuse<Entry>, name: string): Promise<Entry[]> {
    if (name === "") {
        return await listEntries(db);
    }
    return index.search(name).map(result => result.item);
}