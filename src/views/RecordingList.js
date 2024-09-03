import { mergeStyles, Link, Stack, useTheme, Icon, divProperties } from "@fluentui/react";
import { useEffect, useState, useCallback } from "react";
import { listRecordings, ServerBlobData } from "./Api";
import { Notification } from "@azure/communication-react";

export function RecordingList(props) {
    const { serverCallId } = props;
    const [blobs, setBlobs] = useState([]);
    const [notificationStrings, setNotificationStrings] = useState(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handle = setInterval(async () => {
            if (!serverCallId) {
                return;
            }
            const newRecordings = await listRecordings({ serverCallId });
            const latestBlob = newRecordings.blobs[newRecordings.blobs.length - 1];
            if (!listsEqual([latestBlob], blobs)) {
                // We overwrite the entire list for simplicity.
                setBlobs(newRecordings.blobs);
                setNotificationStrings({
                    title: 'Want To Download The Recording?',
                    dismissButtonAriaLabel: 'Close',
                    message: 'Please click on the link to download the recording.',
                    primaryButtonLabel: 'Download',
                    recordingUrl:newRecordings.blobs[newRecordings.blobs.length - 1]
                });
                setShow(true);

                // Clear notificationStrings after 4 seconds
                // setTimeout(() => {
                //     setNotificationStrings(null);
                //     setShow(false);
                // }, 4000);
            }
        }, 500);
        return () => {
            clearInterval(handle);
        }
    }, [serverCallId, blobs]);

    return (
        <>
            {blobs.length > 0 && (
                <Stack className={mergeStyles({
                    background: "#c1c1c1",
                    border: '1px solid #c1c1c1',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    color: "#fff",
                    padding: '1rem',
                    height: '150px',
                    width: '300px',
                    position: 'absolute',
                    left: "40%",
                    top: '0',
                    wordBreak: 'break-word',
                    zIndex: 1000,
                })}>
                    <h3>Recordings:</h3>
                    <ul>
                        {blobs.map((blob) => {
                            const formattedDate = new Intl.DateTimeFormat('en-GB', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            }).format(new Date()); // Adjust the date format as needed
                            return (
                                <li key={blob.url}>
                                    <Link href={blob.url} target="_blank">
                                        <Icon iconName="Download" /> {formattedDate}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </Stack>
            )}

            {notificationStrings?.recordingUrl && (
                <div 
                style={{
                    position: 'relative',
                    top: '0',
                    zIndex: 1000,
                }}
                >

                <Notification
                    autoDismiss={true}
                    // show={show}
                    notificationStrings={notificationStrings}
                    notificationIconProps={{ iconName: 'NotificationBarRecording' }}
                    onClickPrimaryButton={() => {
                        const link = document.createElement('a');
                        link.href = notificationStrings.recordingUrl; // Use the recording URL from the strings object
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                    />
                    </div>
            )}
        </>
    );
}

function listsEqual(first, second) {
    if (first.length !== second.length) {
        return false;
    }
    return first.every((item, index) => item.url === second[index].url);
}