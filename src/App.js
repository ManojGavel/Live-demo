import React, { useEffect, useState } from "react";
import {
  addUserToRoom,
  createGroupId,
  createRoom,
  fetchTokenResponse,
  getGroupIdFromUrl,
  getMeetingIdFromUrl,
  getRoomIdFromUrl,
  getTeamsLinkFromUrl,
  isLandscape,
  isOnIphoneAndNotSafari,
  navigateToHomePage,
  WEB_APP_TITLE,
} from "./utils/AppUtils";
import { useIsMobile } from "./utils/useInMobile";
import { HomeScreen } from "./views/HomeScreen";
import { fromFlatCommunicationIdentifier } from "@azure/communication-react";
import {  Spinner } from '@fluentui/react';
import { CallError } from "./views/CallError";
import { CallScreen } from "./views/CallScreen";
import { initializeIcons } from '@fluentui/react';

export default function App() {
  initializeIcons();
  const [page, setPage] = useState("home");

  //User credentials to join the call with - these are retrieved from the server
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [userCredentialFetchError, setUserCredentialFetchError] = useState("");

  //Call details to join a call - these are collected from the user on the home screen
  const [callLocator, setCallLocator] = useState();
  const [targetCallees, setTargetCallees] = useState(undefined);
  const [displayName, setDisplayName] = useState("");

  const [isTeamsCall, setIsTeamsCall] = useState(false);

  // Get Azure Communications Service token from the server
  useEffect(() => {
    (async () => {
      try {
        const { token, user } = await fetchTokenResponse();
        setToken(token);
        setUserId(user);
      } catch (e) {
        console.error(e);
        setUserCredentialFetchError(true);
      }
    })();
  }, []);

  const isMobileSession = useIsMobile();
  const isLandscapeSession = isLandscape();

  useEffect(() => {
    if (isMobileSession && isLandscapeSession) {
      console.log(
        "ACS Calling sample: Mobile landscape view is experimental behavior"
      );
    }
  }, [isMobileSession, isLandscapeSession]);

  const supportedBrowser = !isOnIphoneAndNotSafari();
  if (!supportedBrowser) {
    return (
      <>
        <a
          href="https://docs.microsoft.com/azure/communication-services/concepts/voice-video-calling/calling-sdk-features#calling-client-library-browser-support"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </a>{" "}
        about browsers and platforms supported by the web calling sdk.
      </>
    );
  }

  switch (page) {
    case 'home': {
      document.title = `home - ${WEB_APP_TITLE}`;
      // Show a simplified join home screen if joining an existing call
      const joiningExistingCall =
        !!getGroupIdFromUrl() || !!getTeamsLinkFromUrl() || !!getMeetingIdFromUrl() || !!getRoomIdFromUrl();
      return (
        <HomeScreen
          joiningExistingCall={joiningExistingCall}
          startCallHandler={async (callDetails) => {
            setDisplayName(callDetails.displayName);
            let callLocator =
              callDetails.callLocator ||
              getRoomIdFromUrl() ||
              getTeamsLinkFromUrl() ||
              getMeetingIdFromUrl() ||
              getGroupIdFromUrl() ||
              createGroupId();

            if (callDetails.option === 'Rooms') {
              callLocator = getRoomIdFromUrl() || callDetails.callLocator;
            }

            if (callDetails.option === 'TeamsAdhoc') {
              const outboundTeamsUsers = callDetails.outboundTeamsUsers?.map((user) => {
                return fromFlatCommunicationIdentifier(user);
              });
              callLocator = undefined;
              setTargetCallees(outboundTeamsUsers);
            }

            // There is an API call involved with creating a room so lets only create one if we know we have to
            if (callDetails.option === 'StartRooms') {
              let roomId = '';
              try {
                roomId = await createRoom();
              } catch (e) {
                console.log(e);
              }

              callLocator = { roomId: roomId };
            }

            if (callLocator && 'roomId' in callLocator) {
              if (userId && 'communicationUserId' in userId) {
                await addUserToRoom(
                  userId.communicationUserId,
                  callLocator.roomId,
                  callDetails.role
                );
              } else {
                throw 'Invalid userId!';
              }
            }

            setCallLocator(callLocator);

            // Update window URL to have a joinable link
            if (callLocator && !joiningExistingCall) {
              window.history.pushState(
                {},
                document.title,
                window.location.origin + getJoinParams(callLocator) + getIsCTEParam(!!callDetails.teamsToken)
              );
            }
            setIsTeamsCall(!!callDetails.teamsToken);
            callDetails.teamsToken && setToken(callDetails.teamsToken);
            callDetails.teamsId &&
              setUserId(fromFlatCommunicationIdentifier(callDetails.teamsId));
            setPage('call');
          }}
        />
      );
    }

    case 'call': {
      if (userCredentialFetchError) {
        document.title = `error - ${WEB_APP_TITLE}`;
        return (
          <CallError
            title="Error getting user credentials from server"
            reason="Ensure the sample server is running."
            rejoinHandler={() => setPage('call')}
            homeHandler={navigateToHomePage}
          />
        );
      }

      if (!token || !userId || (!displayName && !isTeamsCall) || (!targetCallees && !callLocator)) {
        document.title = `credentials - ${WEB_APP_TITLE}`;
        return <Spinner label={'Getting user credentials from server'} ariaLive="assertive" labelPosition="top" />;
      }
      return (
        <CallScreen
          token={token}
          userId={userId}
          displayName={displayName}
          callLocator={callLocator}
          targetCallees={targetCallees}
          isTeamsIdentityCall={isTeamsCall}
        />
      );
    }
    default:
      document.title = `error - ${WEB_APP_TITLE}`;
      return <>Invalid page</>;
  }

}


const getIsCTEParam = (isCTE) => {
  return isCTE ? '&isCTE=true' : '';
};
const getJoinParams = (locator) => {
  if ('meetingLink' in locator) {
    return '?teamsLink=' + encodeURIComponent(locator.meetingLink);
  }
  if ('meetingId' in locator) {
    return (
      '?meetingId=' + encodeURIComponent(locator.meetingId) + (locator.passcode ? '&passcode=' + locator.passcode : '')
    );
  }
  if ('roomId' in locator) {
    return '?roomId=' + encodeURIComponent(locator.roomId);
  }
  return '?groupId=' + encodeURIComponent(locator.groupId);
};