import { mergeStyles, Link, Stack, useTheme } from "@fluentui/react";
import { useEffect, useState } from "react";
import { listRecordings, ServerBlobData } from "./Api";



export function RecordingList(props) {
    const { serverCallId } = props;
    const [blobs, setBlobs] = useState([]);

    useEffect(() => {
        const handle = setInterval(async () => {
            if (!serverCallId) {
                return;
            }
            const newRecordings = await listRecordings({ serverCallId });
            if (!listsEqual(newRecordings.blobs, blobs)) {
                // We overwrite the entire list for simplicity.
                setBlobs(newRecordings.blobs);
            }
        }, 500);
        return () => {
            clearInterval(handle);
        }
    }, [serverCallId, blobs, setBlobs]);

    const theme = useTheme();
    return (<Stack className={mergeStyles({
        background: theme.palette.neutralDark,
        color: theme.palette.white,
        position: "relative",
        zIndex: '1',
        padding: '1rem',
        height:'5vh',
        // The recording names tend to be overly long.
        wordBreak: 'break-word'
    })}>
        {blobs.length === 0 && <h3>No recordings in this call yet!</h3>}
        {blobs.length > 0 && (<>
            <h3>Recordings:</h3>
            <ul>
                {blobs.map((blob) => <li><Link href={blob.url} target="_blank">{blob.name}</Link></li>)}
            </ul>
        </>)
        }
    </Stack>)
}

function listsEqual(first, second) {
    return first.length === second.length && first.every((item, index) => (item === second[index]));
}