import { MachineConfig, send, Action, assign } from "xstate";


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

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'welcome',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
        welcome: {
            initial: "prompt",
            on: { ENDSPEECH: "who" },
            states: {
                prompt: { entry: say("Let's create an appointment") }
            }
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
    }
})
