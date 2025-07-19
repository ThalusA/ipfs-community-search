import {useCallback, useEffect, useState} from 'react'
import './App.css'
import {Button, TextField} from "@mui/material";
import Fuse from 'fuse.js'
import DeletableList from "./DeletableList.tsx";
import type {Entry} from './types.ts'
import {addEntry, deleteEntry, openDatabase, rebuildIndex, searchByName} from "./utils.ts";
import type {DocumentsDatabase} from "@orbitdb/core";


function App() {
    const [database, setDatabase] = useState<DocumentsDatabase<"name", Entry> | undefined>(undefined);
    const [index, setIndex] = useState<Fuse<Entry> | undefined>(undefined);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [addressInput, setAddressInput] = useState('');

    useEffect(() => {
        openDatabase().then((database) => {
            setDatabase(database);
        }).catch((error: unknown) => {
            console.error(error);
        });
    }, []);

    useEffect(() => {
        if (database !== undefined) {
            rebuildIndex(database).then(index => {
                setIndex(index);
            }).catch((error: unknown) => {
                console.error(error);
            });
        }
    }, [database]);

    const loadData = useCallback(async () => {
        if (!database || !index) return;
        try {
            const results = await searchByName(database, index, searchQuery);
            setEntries(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, [database, index, searchQuery]);

    useEffect(() => {
        loadData().then(() => {
            console.log("Data loaded");
        }).catch((error: unknown) => {
            console.error(error);
        });

    }, [loadData, searchQuery]);

    const handleAdd = () => {
        if (!nameInput || !addressInput || !database || !index) return;
        addEntry(database, index, nameInput, addressInput).then(() => {
            setNameInput('');
            setAddressInput('');
            loadData().then(() => {
                console.log("Data loaded");
            }).catch((error: unknown) => {
                console.error(error);
            });
        }).catch((error: unknown) => {
            console.error("Add failed: ", error);
        });
    };

    return (
        <div style={{maxWidth: 600, margin: '0 auto', padding: 16}}>
            {database !== undefined && index !== undefined ?
                (<>
                    <header style={{display: 'flex', alignItems: 'center', marginBottom: 16}}>
                        <TextField
                            label="Name"
                            value={nameInput}
                            onChange={e => {
                                setNameInput(e.target.value);
                            }}
                            variant="outlined"
                            size="small"
                            style={{marginRight: 8}}/>
                        <TextField
                            label="Address"
                            value={addressInput}
                            onChange={e => {
                                setAddressInput(e.target.value);
                            }}
                            variant="outlined"
                            size="small"
                            style={{marginRight: 8}}/>
                        <Button variant="contained" onClick={handleAdd}>Add</Button>
                    </header>
                    <TextField
                        label="Search"
                        value={searchQuery}
                        onChange={e => {
                            setSearchQuery(e.target.value);
                        }}
                        variant="outlined"
                        fullWidth
                        size="small"
                        style={{marginBottom: 16}}/><DeletableList entries={entries}
                                                                   deleteEntry={(name: string) =>
                                                                       deleteEntry(database, index, name)
                                                                   }/></>)
                :
                <>Loading...</>
            }
        </div>
    )

}

export default App
