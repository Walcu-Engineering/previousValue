# previousValue
Function that returns a path's previous value for the given object with the given diffs.
If the value is an object, the function will return a new object whose keys will be references to the
previous keys, and only the paths that have actually changed will hold new data, in order to save memmory.

## API
### `previousValue(object, diffs, path)`
Describing the params list:
*object*: The target object from who we want to read the previous value for the given path. Default value empty object.
*diffs*: Array of differences (Default value empty array). Each difference is an object with the following keys:
- path: [mandatory] A string following the JSON Pointer format defined by the RFC 6901
- old_value: [optional] any value.
