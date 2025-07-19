import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Divider from '@mui/material/Divider';
import type {Entry} from "./types.ts";

interface DeletableListProps {
    entries: Entry[],
    deleteEntry: (name: string) => Promise<void>
}

const DeletableList: React.FC<DeletableListProps> = ({entries, deleteEntry}) => {
    console.log("Displaying entries :", entries);

    const handleDelete = (index: number) => {
        const entryToDelete = entries[index];
        deleteEntry(entryToDelete.name).catch((error: unknown) => {
            console.error('Failed to delete entry:', error);
        });
    };

    return (
        <List>
            {entries.map((entry, index) => (
                <React.Fragment key={entry.name}>
                    <ListItem
                        secondaryAction={
                            <IconButton edge="end" aria-label="delete" onClick={() => {
                                handleDelete(index);
                            }}>
                                <CloseIcon/>
                            </IconButton>
                        }
                    >
                        <ListItemText
                            slotProps={{secondary: {component: "span"}}}
                            primary={entry.name}
                            secondary={
                                <>
                                    <div>{entry.address}</div>
                                    <div style={{fontSize: '0.8rem', color: '#666'}}>
                                        {new Date(entry.timestamp).toLocaleString()} by {entry.author}
                                    </div>
                                </>
                            }
                        />
                    </ListItem>
                    {index < entries.length - 1 && <Divider component="li"/>}
                </React.Fragment>
            ))}
        </List>
    );
};

export default DeletableList;
