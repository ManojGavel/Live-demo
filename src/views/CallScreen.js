// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { CommunicationUserIdentifier } from "@azure/communication-common";
import { MicrosoftTeamsUserIdentifier } from "@azure/communication-common";
import {
  AzureCommunicationCallAdapterOptions,
  CallAdapterLocator,
  CallAdapterState,
  useAzureCommunicationCallAdapter,
  CommonCallAdapter,
  CallAdapter,
  toFlatCommunicationIdentifier,
} from "@azure/communication-react";
import {
  useTeamsCallAdapter,
  TeamsCallAdapter,
} from "@azure/communication-react";

import { onResolveVideoEffectDependencyLazy } from "@azure/communication-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAutoRefreshingCredential } from "../utils/Credential";
import { WEB_APP_TITLE } from "../utils/AppUtils";
import { CallCompositeContainer } from "./CallCompositeContainer";

export const CallScreen = (props) => {
  const { token, userId, isTeamsIdentityCall } = props;
  const callIdRef = useRef();

  const subscribeAdapterEvents = useCallback((adapter) => {
    adapter.on("error", (e) => {
      // Error is already acted upon by the Call composite, but the surrounding application could
      // add top-level error handling logic here (e.g. reporting telemetry).
      console.log("Adapter error event:", e);
    });
    adapter.onStateChange((state) => {
      const pageTitle = convertPageStateToString(state);
      document.title = `${pageTitle} - ${WEB_APP_TITLE}`;

      if (state?.call?.id && callIdRef.current !== state?.call?.id) {
        callIdRef.current = state?.call?.id;
        console.log(`Call Id: ${callIdRef.current}`);
      }
    });
    adapter.on("transferAccepted", (e) => {
      console.log("Call being transferred to: " + e);
    });
  }, []);

  const afterCallAdapterCreate = useCallback(
    async (adapter) => {
      subscribeAdapterEvents(adapter);
      return adapter;
    },
    [subscribeAdapterEvents]
  );

  const afterTeamsCallAdapterCreate = useCallback(
    async (adapter) => {
      subscribeAdapterEvents(adapter);
      return adapter;
    },
    [subscribeAdapterEvents]
  );

  const credential = useMemo(() => {
    if (isTeamsIdentityCall) {
      return new AzureCommunicationTokenCredential(token);
    }
    return createAutoRefreshingCredential(
      toFlatCommunicationIdentifier(userId),
      token
    );
  }, [token, userId, isTeamsIdentityCall]);

  // if (isTeamsIdentityCall) {
  //   return (
  //     <TeamsCallScreen
  //       afterCreate={afterTeamsCallAdapterCreate}
  //       credential={credential}
  //       {...props}
  //     />
  //   );
  // }
  if (props.callLocator) {
    return (
      <AzureCommunicationCallScreen
        afterCreate={afterCallAdapterCreate}
        credential={credential}
        {...props}
      />
    );
  }
  //  else {
  //   return (
  //     <AzureCommunicationOutboundCallScreen
  //       afterCreate={afterCallAdapterCreate}
  //       credential={credential}
  //       {...props}
  //     />
  //   );
  // }
};

const TeamsCallScreen = (props) => {
  const { afterCreate, callLocator: locator, userId, ...adapterArgs } = props;
  if (!(locator && "meetingLink" in locator)) {
    throw new Error(
      "A teams meeting locator must be provided for Teams Identity Call."
    );
  }

  if (!("microsoftTeamsUserId" in userId)) {
    throw new Error(
      "A MicrosoftTeamsUserIdentifier must be provided for Teams Identity Call."
    );
  }

  const teamsAdapterOptions = useMemo(
    () => ({
      videoBackgroundOptions: {
        videoBackgroundImages,
      },
    }),
    []
  );

  const adapter = useTeamsCallAdapter(
    {
      ...adapterArgs,
      userId,
      locator,
      options: teamsAdapterOptions,
    },
    afterCreate
  );
  return <CallCompositeContainer {...props} adapter={adapter} />;
};

const AzureCommunicationCallScreen = (props) => {
  const { afterCreate, callLocator: locator, userId, ...adapterArgs } = props;
  const [serverCallId, setServerCallId] = useState('');


  if (!("communicationUserId" in userId)) {
    throw new Error(
      "A MicrosoftTeamsUserIdentifier must be provided for Teams Identity Call."
    );
  }

  const callAdapterOptions = useMemo(() => {
    return {
      videoBackgroundOptions: {
        videoBackgroundImages,
        onResolveDependency: onResolveVideoEffectDependencyLazy,
      },
      callingSounds: {
        callEnded: { url: "/assets/sounds/callEnded.mp3" },
        callRinging: { url: "/assets/sounds/callRinging.mp3" },
        callBusy: { url: "/assets/sounds/callBusy.mp3" },
      },
      reactionResources: {
        likeReaction: {
          url: "/assets/reactions/likeEmoji.png",
          frameCount: 102,
        },
        heartReaction: {
          url: "/assets/reactions/heartEmoji.png",
          frameCount: 102,
        },
        laughReaction: { 
          url: "/assets/reactions/laughEmoji.png",
          frameCount: 102 
        },
        applauseReaction: {
          url: "/assets/reactions/clapEmoji.png",
          frameCount: 102,
        },
        surprisedReaction: {
          url: "/assets/reactions/surprisedEmoji.png",
          frameCount: 102,
        },
      },
    };
  }, []);

  const adapter = useAzureCommunicationCallAdapter(
    {
      ...adapterArgs,
      userId,
      locator,
      options: callAdapterOptions,
    },
    afterCreate
  );
  useEffect(() => {
    adapter?.onStateChange(async (state) => {
          if (state.call?.state === 'Connected') {
            const call = adapter.callAgent.calls.find((call) => call.id === state.call?.id);
            if (call) {
              setServerCallId(await call.info.getServerCallId());
              console.log(await call.info.getServerCallId())
            }
          }})
  }, [adapter]);
  return <CallCompositeContainer {...props} adapter={adapter} serverCallId={serverCallId} />;
};

const AzureCommunicationOutboundCallScreen = (props) => {
  const {
    afterCreate,
    targetCallees: targetCallees,
    userId,
    ...adapterArgs
  } = props;

  if (!("communicationUserId" in userId)) {
    throw new Error(
      "A MicrosoftTeamsUserIdentifier must be provided for Teams Identity Call."
    );
  }

  const callAdapterOptions = useMemo(() => {
    return {
      videoBackgroundOptions: {
        videoBackgroundImages,
        onResolveDependency: onResolveVideoEffectDependencyLazy,
      },
      callingSounds: {
        callEnded: { url: "/assets/sounds/callEnded.mp3" },
        callRinging: { url: "/assets/sounds/callRinging.mp3" },
        callBusy: { url: "/assets/sounds/callBusy.mp3" },
      },
      reactionResources: {
        likeReaction: {
          url: "/assets/reactions/likeEmoji.png",
          frameCount: 102,
        },
        heartReaction: {
          url: "/assets/reactions/heartEmoji.png",
          frameCount: 102,
        },
        laughReaction: {
          url: "/assets/reactions/laughEmoji.png",
          frameCount: 102,
        },
        applauseReaction: {
          url: "/assets/reactions/clapEmoji.png",
          frameCount: 102,
        },
        surprisedReaction: {
          url: "/assets/reactions/surprisedEmoji.png",
          frameCount: 102,
        },
      },
      onFetchProfile: async (userId, defaultProfile) => {
        if (userId === "<28:orgid:Enter your teams app here>") {
          return { displayName: "Teams app display name" };
        }
        return defaultProfile;
      },
    };
  }, []);

  const adapter = useAzureCommunicationCallAdapter(
    {
      ...adapterArgs,
      userId,
      targetCallees: targetCallees,
      options: callAdapterOptions,
    },
    afterCreate
  );

  return <CallCompositeContainer {...props} adapter={adapter} />;
};

const convertPageStateToString = (state) => {
  switch (state.page) {
    case "accessDeniedTeamsMeeting":
      return "error";
    case "badRequest":
      return "error";
    case "leftCall":
      return "end call";
    case "removedFromCall":
      return "end call";
    default:
      return `${state.page}`;
  }
};

const videoBackgroundImages = [
  {
    key: "contoso",
    url: "/assets/backgrounds/contoso.png",
    tooltipText: "Contoso Background",
  },
  {
    key: "pastel",
    url: "/assets/backgrounds/abstract2.jpg",
    tooltipText: "Pastel Background",
  },
  {
    key: "rainbow",
    url: "/assets/backgrounds/abstract3.jpg",
    tooltipText: "Rainbow Background",
  },
  {
    key: "office",
    url: "/assets/backgrounds/room1.jpg",
    tooltipText: "Office Background",
  },
  {
    key: "plant",
    url: "/assets/backgrounds/room2.jpg",
    tooltipText: "Plant Background",
  },
  {
    key: "bedroom",
    url: "/assets/backgrounds/room3.jpg",
    tooltipText: "Bedroom Background",
  },
  {
    key: "livingroom",
    url: "/assets/backgrounds/room4.jpg",
    tooltipText: "Living Room Background",
  },
];
