/**
 * Shared type definitions (JSDoc only, no runtime code).
 *
 * @typedef {Object} Medicine
 * @property {string} id            Unique id
 * @property {string} name          Drug name, for example "Metformin"
 * @property {string} dose          Strength, for example "500 mg"
 * @property {string[]} times       Daily dose times as "HH:MM" (24h)
 * @property {string} [note]        Short instruction, for example "With food"
 * @property {string} from          First day the medicine counts, YYYY-MM-DD
 * @property {number} [pillsLeft]   Remaining pills. Missing means supply is not tracked
 *
 * @typedef {Object} Dose
 * @property {string} id            "<medicineId>@<HH:MM>"
 * @property {Medicine} med
 * @property {string} time          "HH:MM"
 * @property {number} min           Minutes since midnight
 *
 * @typedef {"taken"|"upcoming"|"due"|"missed"} DoseStatus
 *
 * @typedef {Object.<string, Object.<string, number>>} TakenLog
 *   Map of day (YYYY-MM-DD) to { doseId: minuteTaken }
 *
 * @typedef {Object} AppState
 * @property {Medicine[]} meds
 * @property {TakenLog} taken
 * @property {number|null} demo     Demo clock in minutes, or null for the real clock
 *
 * @typedef {Object} ViewContext
 * @property {Medicine[]} meds
 * @property {TakenLog} taken
 * @property {string} today         YYYY-MM-DD
 * @property {number} now           Minutes since midnight
 * @property {string} person        Name of the elder
 * @property {boolean} canSpeak     Whether read aloud is available
 *
 * @typedef {Object} RxState
 * @property {string} text
 * @property {File|null} file
 * @property {Array<{name:string,dose:string,times:string[],instruction:string}>|null} pending
 * @property {Warning[]} warnings
 * @property {boolean} busy
 * @property {string} err
 * @property {boolean} aiBusy
 *
 * @typedef {Object} Warning
 * @property {"high"|"medium"|"low"} severity
 * @property {string} title
 * @property {string} plain
 * @property {string} source
 * @property {string[]} [pair]
 * @property {string[]} [drugs]
 */

export {};
