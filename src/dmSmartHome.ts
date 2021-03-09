import { MachineConfig, send, Action, assign } from "xstate";

// SRGS parser and example (logs the results to console on page load)
import { loadGrammar } from './runparser'
import { parse } from './chartparser'
import { grammar } from './grammars/homeGrammar'

export const getObjects = (input: any) => {
    const gram = loadGrammar(grammar)
    const prs = parse(input.split(/\s+/), gram)
    const result = prs.resultsForRule(gram.$root)[0]
    if (result.action1) {
        return [result.action1, result.object1]
    } else {
        return [result.action2, result.object2]
    }
}

function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
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
                RECOGNISED: [{
                    actions: [assign((context) => { return { action: getObjects(context.recResult)[0] } }),
                    assign((context) => { return { object: getObjects(context.recResult)[1] } })],
                    target: "confirm"
                }]
            },
            states: {
                prompt: {
                    entry: say("What would you like to do?"),
                    on: { ENDSPEECH: "ask" }
                },
                ask: {
                    entry: listen()
                }
            }
        },
        confirm: {
            entry: send((context) => ({
                type: "SPEAK",
                value: `OK. I will ${context.action} the ${context.object}.`
            })),
            on: { ENDSPEECH: "init" }
        }
    }
})