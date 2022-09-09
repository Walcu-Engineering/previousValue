const undo          = require('./undo.js');
const isJsonPointer = require('@walcu-engineering/isjsonpointer');
const isAncestor    = require('@walcu-engineering/isancestor');
const getPathValue  = require('@walcu-engineering/getpathvalue');

/**
 * This function returns the previous value for a path, given an object, a changes array
 * assuming that the array is ordered from most recent changes to the oldest changes, and
 * a string path in JSON pointer format.
 *
 * If the given path has not changed then it will return the current value for the given
 * path, and if the path does not exist or never existed then it will return undefined.
 *
 * PROBLEM: Changes have been made in deeply nested paths, but we want to read a partial nested path
 * Example:
 * We have this document:
 * {
 *   a: {
 *     b: {
 *       c1: 1,
 *       c2: 2,
 *       c3: 3,
 *     }
 *   }
 * }
 *
 * And two changes have been made:
 * [
 *   {op: 'replace', path: '/a/b/c2', value: 22},
 *   {op: 'replace', path: '/a/b/c3', value: 33},
 * ]
 *
 * So the resulting document is:
 * {
 *   a: {
 *     b: {
 *       c1: 1,
 *       c2: 22,
 *       c3: 33,
 *     }
 *   }
 * }
 * And in our changes array we will have this changes:
 * [
 *   {path: '/a/b/c2', old_value: 2},
 *   {path: '/a/b/c3', old_value: 3},
 * ]
 *
 * What happens if you call my_document.getPreviousValue('/a/b')?
 * In the changes array there is not any change for the path '/a/b'
 * so it may return undefined, but this is not actually true. That's why
 * we need to take all the changes whose path is a descendant from
 * the requested path and revert those changes for the partial subpath
 * that has been requested.
 *
 * An optimization that can be done is to not do this process if there
 * is any change whose path is the same as the requested path.
 *
 * @param object: any object
 * @param changes: Array of objects where each object must have at least
 * one property called "path" that must be a string representing a path
 * in JSON Pointer as defined in RFC6901.
 *
 * Each change object may have a "old_value" property that can be any value
 * if no present it will be undefined.
 * 
 * @param path: String with the format JSON pointer as defined in RFC6901
 * This is the path we want to take the previous value of.
 */
const getPreviousValue = (object = {}, changes = [], path = '') => {
  if(!isJsonPointer(path)){
    throw new Error(`${path} is not a JSON pointer path`);
  }
  if(changes.length > 0){
    const path_change = changes.find(change => change.path === path); //This is for the optimization. This should be the most used case.
    if(path_change) return path_change.old_value;//This is the dessirable case
    const affected_changes = changes.filter(change => isAncestor(change.path, path) || isAncestor(path, change.path));
    if(affected_changes.length > 0){
      const shortest_path = affected_changes // if requested path is /a/b/c/d but there is a change for the path /a/b we have to undo the whole /a/b path to take the old value for the requested path. And the same way if the requested path is /a and there is a change that affects to /a/b/c we have to undo everything for /a. And the values that have not changed will be pointers.
        .reduce((current_shortest_path, {path}) => path.length > current_shortest_path.length ? current_shortest_path : path, path);
      const shortest_path_subobjectument = getPathValue(object, shortest_path); //This is the value that have to be reverted
      const rerooted_affected_changes = affected_changes.map(change => ({//now we have to change the path for the changes because the root objectument has changed.
        path_parts: shortest_path.length > 0 ? change.path.split(shortest_path)[1].split('/') : change.path.split('/'),//path_parts is an array with the path parts, and the 0th part will always be '' because of the split('/');
        old_value: change.old_value,
      }));
      const old_value = rerooted_affected_changes.reduce((reverted, change) => undo(reverted, change, 1), shortest_path_subobjectument); //the undo fn is called with 1 because we want to skip the 0th value that is always ''. We do this way for performance reasons.
      const rerooted_requested_path = shortest_path ? path.split(shortest_path)[1] : path;
      return getPathValue(old_value, rerooted_requested_path);
    }
  }
  return getPathValue(object, path);
}

module.exports = getPreviousValue;

