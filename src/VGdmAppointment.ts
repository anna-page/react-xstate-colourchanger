import { MachineConfig, send, Action, assign, actions } from "xstate";
import { invoke } from "xstate/lib/actionTypes";
import { mapContext } from "xstate/lib/utils";
// import { dmMachine } from "./dmAppointment-old";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

function store_input(input: string, grammar: Object) {
    var person_to_meet = undefined
    var time_to_meet = undefined
    var day_to_meet = undefined

    var words = input.split(" ");
    for (var i = 0; i < words.length; i += 1) {
        if ( "person" in (grammar[words[i]] || {})){
            person_to_meet = words[i];
        } else if ("day" in (grammar[words[i]] || {})){
            day_to_meet = words[i];
        } else if (words[i] === "at") {
            var time_phrase = words[i].concat(' ', words[i + 1]);
            if ("time" in (grammar[time_phrase] || {})){
                time_to_meet = words[i + 1];
            }
        }  else {

        }
    }
    return {"person_to_meet": person_to_meet, "day_to_meet": day_to_meet, "time_to_meet": time_to_meet};
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
                RECOGNISED: [
                {   
                    actions: [
                        assign((context) => {
                            console.log(context.recResult)
                            console.log(store_input(context.recResult, grammar))
                            return {
                                appointmentData: store_input(context.recResult, grammar),
                            }
                            
                        }),
                        send('DATA_STORED'),
                    ]
                },
            ],
                DATA_STORED: [
                    {actions: [
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).person_to_meet)
                            return {
                                person: store_input(context.recResult, grammar).person_to_meet,
                            }
                        }),
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).day_to_meet)
                            return {
                                day: store_input(context.recResult, grammar).day_to_meet,
                            }
                        }),
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).time_to_meet)
                            return {
                                time: store_input(context.recResult, grammar).time_to_meet,
                            }
                        })
                    ],
                    target: 'sendnext'
                }
            ]
            },
            states: {
                prompt: {
                    entry: say("What are the details of the meeting you want to set up?"),
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
        sendnext:{
            entry: send('DIRECT'),
            on: {
                DIRECT: [
                {cond: (context)  => context.person == undefined  && context.day == undefined && context.time == undefined,
                target: 'who'},
                {cond: (context)  => context.person != undefined  && context.day != undefined && context.time != undefined,
                target: 'confirmtime'},
                {
                 cond: (context) => context.person != undefined && context.day != undefined,
                 target: 'only_allday_missing',
                },
                {
                 cond: (context)  => context.day != undefined && context.time != undefined,
                 target: 'missing_person'   
                },
                {
                 cond: (context)  => context.person != undefined && context.time != undefined,
                 target: 'missing_day'   
                },
                {
                 cond: (context) => context.person != undefined,
                 target: 'day',
                },
                {
                 cond: (context) => context.day != undefined,
                 target: 'day_only'
                },
                {
                 cond: (context) => context.time != undefined,
                 target: 'time_only'
                }
                ]
            }
        },
        missing_person: {
            initial: "prompt",
            on: { 
                RECOGNISED: [{
                    cond: (context) => "person" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { person: grammar[context.recResult].person } }),
                    target: "confirmtime"

                },
                {
                    cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                    target: "init"
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. ${context.day} at ${context.time}. With who are you meeting?`
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
        missing_day: {
            initial: "prompt",
            on: { 
                RECOGNISED: [{
                    cond: (context) => "day" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { day: grammar[context.recResult].day } }),
                    target: "confirmtime"

                },
                {
                    cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                    target: "init"
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. With ${context.person} at ${context.time}. On which day is your meeting?`
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
        day: {
            initial: "prompt",
            on: {
                RECOGNISED: [
                {   
                    actions: [
                        assign((context) => {
                            console.log(context.recResult)
                            console.log(store_input(context.recResult, grammar))
                            return {
                                appointmentData: store_input(context.recResult, grammar),
                            }
                            
                        }),
                        send('DATA_STORED'),
                    ]
                },
            ],
                DATA_STORED: [
                    {actions: [
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).day_to_meet)
                            return {
                                day: store_input(context.recResult, grammar).day_to_meet,
                            }
                        }),
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).time_to_meet)
                            return {
                                time: store_input(context.recResult, grammar).time_to_meet,
                            }
                        })
                    ],
                    target: 'sendnext'
                }
            ]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Okay, lets create an appointment with ${context.person}. When is the meeting?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I did't catch that"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        time_only: {
            initial: "prompt",
            on: {
                RECOGNISED: [
                {   
                    actions: [
                        assign((context) => {
                            console.log(context.recResult)
                            console.log(store_input(context.recResult, grammar))
                            return {
                                appointmentData: store_input(context.recResult, grammar),
                            }
                            
                        }),
                        send('DATA_STORED'),
                    ]
                },
            ],
                DATA_STORED: [
                    {actions: [
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).person_to_meet)
                            return {
                                person: store_input(context.recResult, grammar).person_to_meet,
                            }
                        }),
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).day_to_meet)
                            return {
                                day: store_input(context.recResult, grammar).day_to_meet,
                            }
                        })
                    ],
                    target: 'sendnext'
                }
            ]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Okay, lets create an appointment at ${context.time}. Who are you meeting with? And on which day?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I did't catch that"),
                    on: { ENDSPEECH: "prompt" }
                }
            }
        },
        day_only: {
            initial: "prompt",
            on: {
                RECOGNISED: [
                {   
                    actions: [
                        assign((context) => {
                            console.log(context.recResult)
                            console.log(store_input(context.recResult, grammar))
                            return {
                                appointmentData: store_input(context.recResult, grammar),
                            }
                            
                        }),
                        send('DATA_STORED'),
                    ]
                },
            ],
                DATA_STORED: [
                    {actions: [
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).person_to_meet)
                            return {
                                person: store_input(context.recResult, grammar).person_to_meet,
                            }
                        }),
                        assign((context) => {
                            console.log(store_input(context.recResult, grammar).time_to_meet)
                            return {
                                time: store_input(context.recResult, grammar).time_to_meet,
                            }
                        })
                    ],
                    target: 'sendnext'
                }
            ]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Okay, lets create an appointment on ${context.day}. Who are you meeting with? And at what time?`
                    })),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                },
                nomatch: {
                    entry: say("Sorry I did't catch that"),
                    on: { ENDSPEECH: "prompt" }
                }
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
                {
                    cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                    target: "init"
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
        only_allday_missing: {
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
                {
                    cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                    target: "init"
                },
                { target: ".nomatch" }]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. A meeting with ${context.person} on ${context.day}. Is your meeting all day?`
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
                {
                    cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                    target: "init"
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
                {
                    cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                    target: "init"
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
                {
                    cond: (context) => "cancel" in (grammar[context.recResult] || {}),
                    actions: assign((context) => { return { cancel: grammar[context.recResult].cancel } }),
                    target: "init"
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
