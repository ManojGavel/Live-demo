// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CallAdapterLocator, CallComposite, CallCompositeOptions, CommonCallAdapter, createAzureCommunicationCallAdapterFromClient, createStatefulCallClient, fromFlatCommunicationIdentifier } from '@azure/communication-react';
import { mergeStyles, Spinner, Stack } from '@fluentui/react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSwitchableFluentTheme } from '../theming/SwitchableFluentThemeProvider';
import { useIsMobile } from '../utils/useInMobile';
import { isIOS } from '../utils/utils';
import { CallScreenProps } from './CallScreen';
import { recordingButtonPropsCallback } from './RecordingButton';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { v1 } from 'uuid'
import { RecordingList } from './RecordingList';
import { FluentThemeProvider, lightTheme, darkTheme } from '@azure/communication-react';

export const CallCompositeContainer = (props) => {

  const { adapter, serverCallId } = props;
  const { currentTheme, currentRtl } = useSwitchableFluentTheme();
  const isMobileSession = useIsMobile();
  const shouldHideScreenShare = isMobileSession || isIOS();


  const [recordingId, setRecordingId] = useState('');


  useEffect(() => {
    /**
     * We want to make sure that the page is up to date. If for example a browser is dismissed
     * on mobile, the page will be stale when opened again. This event listener will reload the page
     */

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    });
    return () => {
      window.removeEventListener('pageshow', () => {
        window.location.reload();
      });
    };



  }, []);


  const options = useMemo(
    () => ({
      callControls: {
        onFetchCustomButtonProps: [
          recordingButtonPropsCallback(serverCallId, recordingId, setRecordingId)
        ],
        screenShareButton: shouldHideScreenShare ? false : undefined,
        endCallButton: {
          hangUpForEveryone: 'endCallOptions'
        },
      },
      autoShowDtmfDialer: true
    }),
    [shouldHideScreenShare, serverCallId, recordingId, setRecordingId]
  );

  // Dispose of the adapter in the window's before unload event.
  // This ensures the service knows the user intentionally left the call if the user
  // closed the browser tab during an active call.
  useEffect(() => {
    const disposeAdapter = () => adapter?.dispose();
    window.addEventListener('beforeunload', disposeAdapter);
    return () => window.removeEventListener('beforeunload', disposeAdapter);
  }, [adapter]);

  if (!adapter) {
    return <Spinner label={'Creating adapter'} ariaLive="assertive" labelPosition="top" />;
  }

  let callInvitationUrl = window.location.href;
  // Only show the call invitation url if the call is a group call or Teams call, do not show for Rooms, 1:1 or 1:N calls
  if (props.callLocator && !isGroupCallLocator(props.callLocator) && !isTeamsMeetingLinkLocator(props.callLocator)) {
    callInvitationUrl = undefined;
  }

  return (
    <>
      <RecordingList serverCallId={serverCallId} />
      <Stack
        tokens={{ childrenGap: '1rem' }}
        className={mergeStyles({
          margin: '2rem'
        })}
      >
        <Stack.Item grow>
          

            <CallComposite
              adapter={adapter}
              fluentTheme={darkTheme}
              rtl={currentRtl}
              callInvitationUrl={callInvitationUrl}
              formFactor={isMobileSession ? 'mobile' : 'desktop'}
              options={options}
            />
          
        </Stack.Item>

      </Stack>
    </>
  );
};

const isTeamsMeetingLinkLocator = (locator) => {
  return 'meetingLink' in locator;
};

const isGroupCallLocator = (locator) => {
  return 'groupId' in locator;
};
