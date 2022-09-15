const undo          = require('./undo.js');
const isJsonPointer = require('@walcu-engineering/isjsonpointer');
const getPathValue  = require('@walcu-engineering/getpathvalue');
const isAncestor    = require('@walcu-engineering/isancestor');

/**
 * This function returns an array of objects for an array of changes, and assumes
 * that the array is ordered from most recent changes to oldest.
 *
 * Each change is an object with 2 fields:
 *  - path: a JSON pointer specifying the path of that change
 *  - old_value: the old value of that path
 *
 * Each object returned is what we call a batch. A batch is an aggregated virtual change of
 * several consecutive compatible changes.
 *
 * What are compatible changes?
 * A change is compatible with the current batch if none of the changes in the batch is an ancestor
 * of that change's path. As ancestor paths are done first and ends the reconstruction, if a change
 * is chronologically previous to another one which is its ancestor, they are incompatible ergo
 * it needs to be reconstructed in another batch.
 *
 * Example:
 * We have this document:
 * {a: {b: 'b2'}};
 *
 * And these changes:
 * [
 *   {path: '/a', old_value: {b: null, c: 123}},
 *   {path: '/a/b', old_value: 'b1'},
 * ]
 *
 * The change to /a/b is previous to the change to /a. If they were part of the same batch,
 * which would look like this:
 * {
 *   a: {
 *     __old_value: {
 *       b : null
 *     },
 *     b: {
 *       __old_value: 'b1',
 *     },
 *   }
 * }
 *
 * With our current implementation of the 'undo' function, as soon as an '__old_value' is found
 * in the change batch, that value is returned for the given path and no further recursion is executed.
 * In the example, the '/a' old value will be returned and the '/a/b' change will be ignored.
 *
 * As the '/a/b' change is older than the change to '/a', the previous value obtained would be incorrect.
 * This forces us to separate them in different batches.
 *
 */

const calculateBatches = (affected_changes, shortest_path) => {
  const batches = [{}]; //Starts as an array with an empty object, to use it as base for the first batch
  for (const change of affected_changes) {
    let batch = batches.at(-1); //Use a reference for ease of use
    const path_splitted = shortest_path.length > 0 ? //Split the path at the lowest point, keep the second part and that split again by '/' to obtain the parts of the JSON pointer
      change.path.split(shortest_path)[1].split('/') : change.path.split('/');
    if (path_splitted.length === 1 && path_splitted[0] === '') //If the path is the root (['']), the batch itself is just that
      batch.__old_value = change.old_value;
    else {
      let compatible = true;
      //Follow the splitted path by creating the new subpath if they don't exists or just access the current batch value for the given subpath
      for (let i = 1; i < path_splitted.length; ++i) { //Skip the first element as it's always the root ('')
        if (!batch[path_splitted[i]]) //If the current object batch does not have this property, we can safely create an empty object, as this change will be always compatible
          batch[path_splitted[i]] = {};
        //If the property exists we need to check for '__old_value' with 'hasOwnProperty' as the property may exists but be undefined (if the object is new)
        //If it indeed has the property, there exists another change in this same batch that is an ancestor of the current one, making them incompatibles
        if (batch[path_splitted[i]].hasOwnProperty('__old_value')) {
          compatible = false;
          break; //We exit the loop as soon as we detect an incompatibility
        }
        batch = batch[path_splitted[i]]; //We recursively enter the current object batch, to efficiently detect ancestors in the batch and set __old_values if compatible
      }
      if (compatible) //If the change is compatible with the current path just assign the old_value
        batch.__old_value = change.old_value;
      else { //If not, we push an empty object to the batches list
        batches.push({});
        let current_batch = batches.at(-1); //And recursively create and access each part of the path
        for (let i = 1; i < path_splitted.length; ++i) {
          current_batch[path_splitted[i]] = {};
          current_batch = current_batch[path_splitted[i]];
        }
        current_batch.__old_value = change.old_value;
      }
    }
  }
  return batches;
}

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
      const partial_old_values = calculateBatches(affected_changes, shortest_path);
      const old_value = partial_old_values.reduce((reverted, partial_old_value) => undo(reverted, partial_old_value), shortest_path_subobjectument);
      const rerooted_requested_path = shortest_path ? path.split(shortest_path)[1] : path;
      return getPathValue(old_value, rerooted_requested_path);
    }
  }
  return getPathValue(object, path);
}

module.exports = getPreviousValue;

