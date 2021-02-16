import { MachineConfig, send, Action, assign } from "xstate";
import { invoke } from "xstate/lib/actionTypes";
import { dmMachine } from "./dmAppointment";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

const grammar: { [index: string]: { person?: string, day?: string, time?: string, } } = {
    "John": { person: "John Appleseed" },
    "Jack": {person: "Jack Jackson"},
    "Anna": {person: "Anna"},
    "on Monday": { day: "Monday" },
    "on Tuesday": { day: "Tuesday" },
    "on Wednesday": { day: "Wednesday" },
    "on Thursday": { day: "Thursday" },
    "on Friday": { day: "Friday" },
    "at 9": { time: "9:00" },
    "at 10": { time: "10:00" },
    "at 11": { time: "11:00" },
    "at 12": { time: "12:00" },
}

const boolgrammar: {[index: string]: {yes?: boolean, no?:boolean}} = {
    "yes": {yes: true },
    "yep": {yes: true },
    "of course": {yes: true },
    "sure": {yes: true },
    "no": {no: false },
    "no way": {no: false },
    "nope": {no: false },
}

export const dmMenu: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
        welcome: {
            initial: "prompt",
            on: { 
                RECOGNISED: { 
                    target: 'invoke_rasa',
                }
            },
            states: {
                prompt: { 
                    entry: say("What do you want to do?"),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
            }
        },
        invoke_rasa: {
            invoke: {
                id: 'rasa',
                src: (context, event) => nluRequest(context.recResult),
                onDone: {
                    target: 'answer',
                    actions: [
                        assign((context, event) => { return { intentResult: event.data.intent.name } }),
                        // (context:SDSContext, event:any) => console.log('<< Intent: ' + context.intentResult),
                        send('RASA_DONE')
                    ],
                },
                onError: {
                    target: 'welcome',
                    actions: (context,event) => console.log(event.data),
                },
            }
        },
        answer: {
            on: { 
                RASA_DONE: [{
                    cond: (context: { intentResult: string; }) => "add_todo_item" == context.intentResult,
                    actions: (context:SDSContext) => console.log('<< TODO: ' + context.intentResult),
                    target: 'todo',
                },
                {
                    cond: (context: { intentResult: string; }) => "make_appointment" == context.intentResult,
                    actions: (context:SDSContext) => console.log('<< APP: ' + context.intentResult),
                    target: 'who',
                },
                {
                    cond: (context: { intentResult: string; }) => "set_timer" == context.intentResult,
                    actions: (context:SDSContext) => console.log('<< TIMER: ' + context.intentResult),
                    target: 'timer',
                }]
            },
        },
        who: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    cond: (context) => "person" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { person: grammar[context.recResult].person } }),
                    target: "day"

                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: say("Who are you meeting with?"),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I don't know them"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        day: {
            initial: "prompt",
            on: { 
                RECOGNISED: [{
                    cond: (context) => "day" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { day: grammar[context.recResult].day } }),
                    target: "allday"

                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.person}. On which day is your meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I didn't catch that"),
                    on: { ENDSPEECH: "prompt" }
                },
            }
        },
        allday: {
            initial: "prompt",
            on: { 
                RECOGNISED: [{
                    cond: (context) => "yes" in (boolgrammar[context.recResult] || {}),
                    actions: assign((context) => { return { confirm: boolgrammar[context.recResult].yes } }),
                    target: "confirmallday",

                },
                {
                    cond: (context) => "no" in (boolgrammar[context.recResult] || {}),
                    actions: assign((context) => { return { confirm: boolgrammar[context.recResult].no } }),
                    target: "time",
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.day}. Is your meeting all day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I didn't catch that"),
                    on: { ENDSPEECH: "prompt" }
                },
            }
        },
        confirmallday: {
            initial: "prompt",
            on: { 
                RECOGNISED: [{
                    cond: (context) => "yes" in (boolgrammar[context.recResult] || {}),
                    actions: assign((context) => { return { confirm: boolgrammar[context.recResult].yes } }),
                    target: "meetingbooked",

                },
                {
                    cond: (context) => "no" in (boolgrammar[context.recResult] || {}),
                    actions: assign((context) => { return { confirm: boolgrammar[context.recResult].no } }),
                    target: "who",
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want me to create an appointment with ${context.person} on ${context.day} for the whole day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I didn't catch that"),
                    on: { ENDSPEECH: "prompt" }
                },
            }
        },
        time: {
            initial: "prompt",
            on: { 
                RECOGNISED: [{
                    cond: (context) => "time" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { time: grammar[context.recResult].time } }),
                    target: "confirmtime"

                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. At what time is your meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I didn't catch that"),
                    on: { ENDSPEECH: "prompt" }
                },
            }
        },
        confirmtime: {
            initial: "prompt",
            on: { 
                RECOGNISED: [{
                    cond: (context) => "yes" in (boolgrammar[context.recResult] || {}),
                    actions: assign((context) => { return { confirm: boolgrammar[context.recResult].yes } }),
                    target: "meetingbooked",

                },
                {
                    cond: (context) => "no" in (boolgrammar[context.recResult] || {}),
                    actions: assign((context) => { return { confirm: boolgrammar[context.recResult].no } }),
                    target: "who",
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Do you want me to create an appointment with ${context.person} on ${context.day} at ${context.time}?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I didn't catch that"),
                    on: { ENDSPEECH: "prompt" }
                },
            }
        },
        meetingbooked: {
            initial: "prompt",
            on: { 
                ENDSPEECH: "init" ,
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Your appointment has been created!`
                    })),
                },
            }
        },
        todo: {
            initial: 'prompt',
            states: {
                prompt: { entry: say("Okay, let's create a new to do item.")}
            },
            on: { ENDSPEECH: "init" }
        },
        timer: {
            initial: 'prompt',
            states: {
                prompt: { entry: say("Okay, let's set a timer.")}
            },
            on: { ENDSPEECH: "init" }
        },
    }
})

/* RASA API
 *  */
const proxyurl = "https://cors-anywhere.herokuapp.com/";
const rasaurl = 'https://rasa-nlu-heroku.herokuapp.com/model/parse'
const nluRequest = (text: string) =>
    fetch(new Request(proxyurl + rasaurl, {
        method: 'POST',
        // headers: { 'Origin': 'http://maraev.me' }, // only required with proxy
        body: `{"text": "${text}"}`
    }))
        .then(data => data.json());
