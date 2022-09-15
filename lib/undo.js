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
    if(object && (object.schema || object.constructor.name === 'Object')){//Under this reverted types we have to go deeper with the recursion
      const object_keys = object.schema && Object.keys(object.schema.paths) || object.constructor.name === 'Object' && Object.keys(object)
      const result = {};
      for(const key of object_keys){
        const value = object.schema && object.get(key) || object[key];
        if(key in partial_previous_value){//This change affects to this key, so we go deep inside
          result[key] = undo(value, partial_previous_value[key]);
        }else{//The partial_previous_value does not affect this key, so we just copy the reference
          result[key] = value;
        }
      }
      return result;
    }else if(object instanceof Array){
      return object.map((value, index) => {//Here the index will be the first path part from the change's path.
        if(String(index) in partial_previous_value){//This change affects to this item, so we have to go deeper over this item
          return undo(value, partial_previous_value[index]);
        }else{//This change does not affect to this object key, so we return the current objectument key value
          return value;
        }
      });
    }else{
      /**
       * If this else is reached, it means that the partial_previous_value is missing some partial changes and we don't support this
       * This function expects that the parameter object is as deep as the partial_previous_value
       *
       * TODO: support this scenario
       */
      throw new Error('Change\'s path is deeper than object');
    }
  }
}

module.exports = undo;
