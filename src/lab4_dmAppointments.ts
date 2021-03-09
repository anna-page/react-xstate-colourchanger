import { MachineConfig, Action, assign, actions} from "xstate";
const {send, cancel} = actions
import {invoke } from "xstate/lib/actionTypes";
// import { dmMachine } from "./dmAppointment-old";



function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

function promptAndAsk(prompt: string, secondPrompt: string, thirdPrompt: string, fourthPrompt: string): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'prompt',
        states: {
            promptFour: {
                entry: say(fourthPrompt),
                on: { ENDSPEECH: 'ask' },
            },
            promptThree: {
                entry: say(thirdPrompt),
                on: { ENDSPEECH: 'ask' },
            },
            promptTwo: {
                entry: say(secondPrompt),
                on: { ENDSPEECH: 'ask' },
            },
            prompt: {
                entry: say(prompt),
                on: { ENDSPEECH: 'ask' },
            },
            ask: {
                entry: [send('LISTEN'), 
                    send('MAXSPEECH', {
                        delay: 5000,
                        id: 'maxsp',
                    })
                ],
                on: {
                    MAXSPEECH: [
                        {
                            cond: (context, event) => context.counter === 0,
                            target: 'promptTwo',
                        },
                        {
                            cond: (context, event) => context.counter === 1,
                            target: 'promptThree',
                        },
                        {
                            cond: (context, event) => context.counter === 2,
                            target: 'promptFour',
                        },
                        {
                            cond: (context, event) => context.counter > 2,
                            target: "#root.dm.init",
                        }
                    ]
                },
            },
        }
    })
}

function getHelp(prompt: string):  MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'help',
        states: {
            help: {
                entry: say(prompt),
                on: {ENDSPEECH: 'ask'},
            },
            ask: {
                entry: [
                    send('LISTEN'), 
                    send('MAXSPEECH', {
                        delay: 5000,
                    })
                ],
            }
        }
    })
}

const grammar: { [index: string]: { person?: string, day?: string, time?: string, cancel?: string,} } = {
    "John": { person: "John Appleseed" },
    "Jack": {person: "Jack Jackson"},
    "Anna": {person: "Anna"},
    "on Monday": { day: "Monday" },
    "Monday": { day: "Monday" },
    "on Tuesday": { day: "Tuesday" },
    "Tuesday": { day: "Tuesday" },
    "on Wednesday": { day: "Wednesday" },
    "Wednesday": { day: "Wednesday" },
    "on Thursday": { day: "Thursday" },
    "Thursday": { day: "Thursday" },
    "on Friday": { day: "Friday" },
    "Friday": { day: "Friday" },
    "on Saturday": { day: "Saturday" },
    "Saturday": { day: "Saturday" },
    "on Sunday": { day: "Sunday" },
    "Sunday": { day: "Sunday" },
    "at 1 a.m.": { time: "1:00" },
    "at 2 a.m.": { time: "2:00" },
    "at 3 a.m.": { time: "3:00" },
    "at 4 a.m.": { time: "4:00" },
    "at 5 a.m.": { time: "5:00" },
    "at 6 a.m.": { time: "6:00" },
    "at 7 a.m.": { time: "7:00" },
    "at 8": { time: "8:00" },
    "at 9": { time: "9:00" },
    "at 10": { time: "10:00" },
    "at 11": { time: "11:00" },
    "at 12": { time: "12:00" },
    "at 1": { time: "13:00" },
    "at 2": { time: "14:00" },
    "at 3": { time: "15:00" },
    "at 4": { time: "16:00" },
    "at 5": { time: "17:00" },
    "at 6": { time: "18:00" },
    "at 7": { time: "19:00" },
    "at 8 p.m.": { time: "20:00" },
    "at 9 p.m.": { time: "21:00" },
    "at 10 p.m.": { time: "22:00" },
    "at 11 p.m.": { time: "23:00" },
    "at midnight": {time: "00:00"},
    "quit": {cancel: "cancel"},
    "cancel": {cancel: "cancel"},
    "nevermind": {cancel: "cancel"}
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
                RECOGNISED: [
                    {
                        target: 'stop',
                        cond: (context)=>context.recResult === 'stop'
                    },
                    {
                        target: '.help',
                        cond: (context)=>context.recResult === 'help'
                    },
                    { 
                        target: 'invoke_rasa',
                    }
                ],
            },
            states: {
                prompt:{
                    ...promptAndAsk("What do you want to do?", "Tell me what you want to do", "Talk to me", "Why won't you tell me what you want to do?"),
                },
                help:{
                    ...getHelp("Choose either make an appointment, set a timer, or add item to to do list")
                }
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
                        send('RASA_DONE'),
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
                    target: 'makeAppointment',
                },
                {
                    cond: (context: { intentResult: string; }) => "set_timer" == context.intentResult,
                    actions: (context:SDSContext) => console.log('<< TIMER: ' + context.intentResult),
                    target: 'timer',
                }]
            },
        },
        makeAppointment:{
            initial: 'who',
            on: {
                RECOGNISED: {
                    target: 'stop',
                    cond: (context)=> context.recResult ==='stop'
                },
                MAXSPEECH: [
                    {
                        cond: (context, event) => context.counter < 3,
                        target: 'maxspeech',
                    },
                    {
                        cond: (context, event) => context.counter > 2,
                        target: "#root.dm.init",
                    }
                ]
            },
            states: {
                hist: {type: 'history', history: 'deep'},
                who: {
                    initial: "prompt",
                    on: {
                        RECOGNISED: [
                            {
                                cond: (context) => "person" in (grammar[context.recResult] || {}),
                                target: "day",
                                actions: [
                                    assign((context) => { return { person: grammar[context.recResult].person } })
                                ],
                            },
                            {
                                target: '.help',
                                cond: (context)=>context.recResult === 'help'
                            },
                            { 
                                cond: (context)=> context.recResult !== 'stop',
                                target: ".nomatch",
                            },
                        ],
                    },
                    states: {
                        prompt: {
                            ...promptAndAsk(
                                "Who are you meeting with?",
                                "Say the name of the person you want to meet.",
                                "With who is your meeting?",
                                "Please. Tell me who you want to meet with."
                            )
                        },
                        help: {
                            ...getHelp("Say the name of the person in your contacts list that you want to schedule a meeting with.")
                        },
                        nomatch: {
                            entry: say("Sorry I don't know them"),
                            on: { ENDSPEECH: "prompt" },
                        }
                    }
                },
                day: {
                    initial: "begin",
                    on: { 
                        RECOGNISED: [{
                            cond: (context) => "day" in (grammar[context.recResult] || {}),
                            actions: [cancel('maxsp'), assign((context) => { return { day: grammar[context.recResult].day } })],
                            target: "allday"

                        },
                        {
                            target: '.help',
                            cond: (context)=>context.recResult === 'help'
                        },
                        {   cond: (context)=> context.recResult !== 'stop',
                            target: ".nomatch" }]
                    },
                    states: {
                        begin: {
                            entry: send((context) => ({
                                type: "SPEAK",
                                value: `OK. ${context.person}.`
                            })),
                            on: { ENDSPEECH: "prompt" }
                        },
                        prompt: {    
                            ...promptAndAsk(
                                "On which day is your meeting?", 
                                "Which day is your meeting on?",
                                "There are 7 days. Pick one.",
                                "Just pick a bloody day. Please.",
                            )
                        },
                        help: {    
                            ...getHelp("Pick a day of the week for your meeting")
                        },
                        nomatch: {
                            entry: say("Sorry I didn't catch that"),
                            on: { ENDSPEECH: "prompt" }
                        },
                    }
                },
                allday: {
                    initial: "begin",
                    on: { 
                        RECOGNISED: [{
                            cond: (context) => "yes" in (boolgrammar[context.recResult] || {}),
                            actions: [cancel('maxsp'), assign((context) => { return { confirm: boolgrammar[context.recResult].yes } })],
                            target: "confirmallday",

                        },
                        {
                            cond: (context) => "no" in (boolgrammar[context.recResult] || {}),
                            actions: [cancel('maxsp'), assign((context) => { return { confirm: boolgrammar[context.recResult].no } })],
                            target: "time",
                        },
                        {
                            target: '.help',
                            cond: (context)=>context.recResult === 'help'
                        },
                        {   cond: (context)=> context.recResult !== 'stop',
                            target: ".nomatch" }]
                    },
                    states: {
                        begin: {
                            entry: send((context) => ({
                                type: "SPEAK",
                                value: `OK. ${context.day}.`
                            })),
                            on: { ENDSPEECH: "prompt" }
                        },
                        help: {
                            ...getHelp("Answer with yes or no.")
                        },
                        prompt: {
                            ...promptAndAsk(
                                "Is your meeting all day?",
                                "Well. Is it?",
                                "Will it take all day?",
                                "You are tearing me apart, Lisa!",
                            )
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
                            actions: [cancel('maxsp'), assign((context) => { return { confirm: boolgrammar[context.recResult].yes } })],
                            target: "meetingbooked",

                        },
                        {
                            cond: (context) => "no" in (boolgrammar[context.recResult] || {}),
                            actions: [cancel('maxsp'), assign((context) => { return { confirm: boolgrammar[context.recResult].no } })],
                            target: "who",
                        },
                        {
                            cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                            actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                            target: "#root.dm.init"
                        },
                        {
                            target: '.help',
                            cond: (context)=>context.recResult === 'help'
                        },
                        {   cond: (context)=> context.recResult !== 'stop',
                            target: ".nomatch" }]
                    },
                
                    states: {
                        prompt: {
                            entry: send((context) => ({
                                type: "SPEAK",
                                value: `Do you want me to create an appointment with ${context.person} on ${context.day} for the whole day?`
                            })),
                            on: { ENDSPEECH: "ask" },
                        },
                        help:{
                            ...getHelp("Say either yes or no")
                        },
                        ask: {
                            entry: [listen(), 
                            send('MAXSPEECH', { delay: 5000,
                                                id: 'maxsp' } )]
                        },
                        nomatch: {
                            entry: say("Sorry I didn't catch that"),
                            on: { ENDSPEECH: "prompt" }
                        },
                    }
                },
                time: {
                    initial: "begin",
                    on: { 
                        RECOGNISED: [{
                            cond: (context) => "time" in (grammar[context.recResult] || {}),
                            actions: [cancel('maxsp'), assign((context) => { return { time: grammar[context.recResult].time } })],
                            target: "confirmtime"

                        },
                        {
                            target: '.help',
                            cond: (context)=>context.recResult === 'help'
                        },
                        {   cond: (context)=> context.recResult !== 'stop',
                            target: ".nomatch" }]
                    },
                    states: {
                        begin:{
                            entry: send((context) => ({
                                type: "SPEAK",
                                value: `OK.`
                            })),
                            on: { ENDSPEECH: "prompt" }
                        },
                        prompt: {
                            ...promptAndAsk(
                                "At what time is your meeting?",
                                "When is the meeting?",
                                "What time is the meeting?",
                                "It's like you don't even want to talk to me anymore.",
                            )
                        },
                        help: {
                            ...getHelp(
                                "Say a time of day, to the closest hour",
                            )
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
                        RECOGNISED: [
                            {
                                cond: (context) => "yes" in (boolgrammar[context.recResult] || {}),
                                actions: [cancel('maxsp'), assign((context) => { return { confirm: boolgrammar[context.recResult].yes } })],
                                target: "meetingbooked",
                            },
                            {
                                cond: (context) => "no" in (boolgrammar[context.recResult] || {}),
                                actions: [cancel('maxsp'), assign((context) => { return { confirm: boolgrammar[context.recResult].no } })],
                                target: "who",
                            },
                            {
                                cond: (context)=>context.recResult === 'help',
                                target: '.help',
                            },
                            {   cond: (context)=> context.recResult !== 'stop',
                                target: ".nomatch",
                            }
                        ]
                    },
                    states: {
                        prompt: {
                            entry: send((context) => ({
                                type: "SPEAK",
                                value: `Do you want me to create an appointment with ${context.person} on ${context.day} at ${context.time}?`
                            })),
                            on: { ENDSPEECH: "ask" }
                        },
                        help:{
                            ...getHelp("Say either yes or no")
                        },
                        ask: {
                            entry: [listen(), send('MAXSPEECH', {delay: 5000,
                                                                id: 'maxsp'} )]
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
                        ENDSPEECH: "#root.dm.init" ,
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
            },
        stop: {
            entry: say("Okay, stopping now."),
            always: "init",
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
        maxspeech: {
            entry: say("You have to say something."),
            on: { 'ENDSPEECH': 'makeAppointment.hist'}
        },
    },
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