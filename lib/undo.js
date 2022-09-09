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
 * @@@path: [mandatory] String in JSON pointer format.
 * @@@old_value: [optional] any value.
 *
 * Returns: a new object
 */
const undo = (object, change, change_idx) => {
  if(!change.path[change_idx]){
    return change.old_value;
  }else{
    const change_first_path_part = change.path[change_idx];
    if(object && (object.schema || object.constructor.name === 'Object')){//Under this reverted types we have to go deeper with the recursion
      const object_keys = object.schema && Object.keys(object.schema.paths) || object.constructor.name === 'Object' && Object.keys(object)
      const result = {};
      for(const key of object_keys){
        const value = object.schema && object.get(key) || object[key];
        if(change_first_path_part === key){//This change affects to this key, so we go deep inside
          result[key] = undo(value, change, change_idx + 1);
        }else{//This change does not affect to this object key, so we return the current objectument key value
          result[key] = value;
        }
      }
      return result;
    }else if(object instanceof Array){
      return object.map((value, index) => {//Here the index will be the first path part from the change's path.
        if(change_first_path_part === String(index)){//This change affects to this item, so we have to go deeper over this item
          return undo(value, change, change_idx + 1);
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
