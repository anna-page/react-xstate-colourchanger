/// <reference types="react-scripts" />

declare module 'react-speech-kit';

interface SDSContext {
    recResult: string;
    nluData: any;
    ttsAgenda: string;
    person: string,
    day: string,
    time: string,
    confirm: boolean,
    intentResult: string,
    cancel: string,
    action: string,
    object: string,
    counter: number,
}

type SDSEvent =
    | { type: 'CLICK' }
    | { type: 'RECOGNISED' }
    | { type: 'ASRRESULT', value: string }
    | { type: 'ENDSPEECH' }
    | { type: 'LISTEN' }
    | { type: 'SPEAK', value: string }
    | { type: 'NOINPUT' }
    | { type: 'MAXSPEECH' }
    | { type: 'RASA_DONE' };
