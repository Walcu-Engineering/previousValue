const getAllKeys = (object, partial_previous_value) => {
  return new Set(Object.keys(object).concat(Object.keys(partial_previous_value)));
}

/**
 * This function is able to undo multiple changes for the given object
 * and it has support to work with Mongoose documents.
 * Returns a new object that it is not a copy of the given object.
 * The properties that have not changed are going to be pointers to the
 * original object properties, and the only new data that this object is
 * going to hold, is the previous value for the given path.
 *
 * @param object: The object that we want to undo the change to. It can be a Mongoose document.
 * @param partial_previous_value: Object describing the change.
 * @@partial_previous_value specification:
 * @@@any_value: a tree where in some points has '__old_value' representing the previous value
 *               of the given path to the target object
 *
 * Returns: a new object where the paths that have not changed are references to the parameter object
 *          and the paths that have actually changed will hold the real old values
 */

const undo = (object, partial_previous_value) => {
  //Use 'hasOwnProperty' as the '__old_value' key may exists and be undefined
  if(partial_previous_value.hasOwnProperty('__old_value')){
    return partial_previous_value.__old_value;
  }else{
    if(object && (object.schema || object.constructor.name === 'Object' || object.constructor.name === 'Array')){//Under this reverted types we have to go deeper with the recursion
      const object_keys = object.schema ? getAllKeys(object.schema.paths, partial_previous_value) : getAllKeys(object, partial_previous_value);
      const result = (object.schema || object.constructor.name === 'Object') ? {} : [];
      for(const key of object_keys){
        const value = object.schema && object.get(key) || object[key];
        if(key in partial_previous_value){//This change affects to this key, so we go deep inside
          result[key] = undo(value, partial_previous_value[key]);
        }else{//The partial_previous_value does not affect this key, so we just copy the reference
          result[key] = value;
        }
      }
      return result;
    }else{ //The previous value is deeper than the new object
      /**
       * We have to restore the previous value ignoring the new object, as there is nothing there
       * We call undo again with both the object and the previous value the partial previous value
       * as that is gonna be the correct value for that deeper path and we get to reuse code
       */
      return undo(partial_previous_value, partial_previous_value);
    }
  }
}

module.exports = undo;
