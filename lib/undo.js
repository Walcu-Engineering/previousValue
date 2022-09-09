/**
 * This function is able to undo a single change for the given object
 * and it has support to work with Mongoose documents.
 * Returns a new object that it is not a copy of the given object.
 * The properties that have not changed are going to be pointers to the
 * original object properties, and the only new data that this object is
 * going to hold, is the previous value for the given path.
 *
 * @param object: The object that we want to undo the change to. It can be a Mongoose document.
 * @param change: Object describing the change.
 * @@change specification:
 * @@@path_parts: [mandatory] Array of strings where each string is a path part.
 * @@@old_value: [optional] any value.
 * @paramchange_path_part_idx: integer representing the index of the path part for the current change path. It will start always in 1 because the change's path_parts 0th part will always be '', and we want to skip it.
 *
 * Returns: a new object
 */
const undo = (object, change, change_path_part_idx) => {
  if(!change.path_parts[change_path_part_idx]){//The change.path_parts array is going to hold always strings, so if we find a nullish value it is going to be an undefined because we are checking the array.length value, and this means that we have reached the end of the path specified by the change, so we have to return at this point the change's old value.
    return change.old_value;
  }else{
    const change_first_path_part = change.path_parts[change_path_part_idx];
    if(object && (object.schema || object.constructor.name === 'Object')){//Under this reverted types we have to go deeper with the recursion
      const object_keys = object.schema && Object.keys(object.schema.paths) || object.constructor.name === 'Object' && Object.keys(object)
      const result = {};
      for(const key of object_keys){
        const value = object.schema && object.get(key) || object[key];
        if(change_first_path_part === key){//This change affects to this key, so we go deep inside
          result[key] = undo(value, change, change_path_part_idx + 1);//Go depeer in the change's path increasing the change_path_part_idx.
        }else{//This change does not affect to this object key, so we return the current objectument key value
          //This is going to be executed the most part of the time because only one path is changed, the rest are references, so we have to do this the fastest we can.
          //That's why inside the change object we have a path_parts instead of a path
          //because if we had the change path as in the previous version, we had to create the array inside this function, that it is called
          //a lot of times, so at the end, you executed the path's split function at least as many time as keys the object had.
          //With this version, we already have the path in array format, and we can iterate the array with an index resulting in a much
          //efficient way of undoing the changes.
          result[key] = value;
        }
      }
      return result;
    }else if(object instanceof Array){
      return object.map((value, index) => {//Here the index will be the first path part from the change's path.
        if(change_first_path_part === String(index)){//This change affects to this item, so we have to go deeper over this item
          return undo(value, change, change_path_part_idx + 1);
        }else{//This change does not affect to this object key, so we return the current objectument key value
          return value;
        }
      });
    }else{
      return object;
    }
  }
}

module.exports = undo;
