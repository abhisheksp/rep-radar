import * as sugarwod from "./sugarwod.js";

/**
 * Registry of all available adapters.
 * To add a new source: import its module and add it to this array.
 * Each adapter must export: meta (object) and parse(csvString) → LiftEntry[].
 */
export const ADAPTERS = [sugarwod];

/**
 * Look up an adapter by its id string.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getAdapter(id) {
  return ADAPTERS.find((a) => a.meta.id === id);
}
