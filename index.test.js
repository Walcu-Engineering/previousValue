const previousValue = require('./lib/getPreviousValue.js'); 

const changed_customer = {
  name: 'Test name',
  surname: 'Test surname',
  theundefined: 'some value',
  nested: {
    nested: 'Hello',
    nested2: 'Bye2',
  },
  nested2: {
    nested: '2Bye',
    nested2: '2Hello2',
  },
  contacts: [{
    name: 'Test contact 1 name',
    phones: ['Test contact 1 phone 1', 'Test contact 1 phone 2'],
    emails: ['Test contact 1 email 1', 'Test contact 1 email 2'],
  }],
};
const diffs = [
  {path: '/theundefined'}, //old value was not defined.
  {path: '/name', old_value: 'old name'},
  {path: '/contacts/0', old_value: {name: 'old contact name', phones: ['old phone 1', 'old phone 2'], emails: ['old email 1', 'old email 2']}},
  {path: '/nested/nested2', old_value: 'Hello2'},
  {path: '/nested2', old_value: { nested: '2Hello', nested2: '2Hello2' }},
]
const undone_customer = {
  name: 'old name',
  surname: 'Test surname',
  nested: {
    nested: 'Hello',
    nested2: 'Hello2',
  },
  nested2: {
    nested: '2Hello',
    nested2: '2Hello2',
  },
  contacts: [{
    name: 'old contact name',
    phones: ['old phone 1', 'old phone 2'],
    emails: ['old email 1', 'old email 2'],
  }],
}

describe('previousValue', () => {
  test('/theundefined previous value should be undefined', () => {
    const prev = previousValue(changed_customer, diffs, '/theundefined');
    expect(prev).toBe(undefined);
  });
  test('/contacts/0/phones previous value should be ["Test contact 1 phone 1", "Test contact 1 phone 2"]', () => {
    const prev = previousValue(changed_customer, diffs, '/contacts/0/phones');
    expect(prev).toEqual(undone_customer.contacts[0].phones);
  });
  test('/contacts/0/phones/0 previous value should be "Test contact 1 phone 1"', () => {
    const prev = previousValue(changed_customer, diffs, '/contacts/0/phones/0');
    expect(prev).toEqual(undone_customer.contacts[0].phones[0]);
  });
  test('/contacts/0 previous value should be {name: "old name", phones: ["old phone 1", "old phone 2"], emails: ["old email 1", "old email 2"]}', () => {
    const prev = previousValue(changed_customer, diffs, '/contacts/0');
    expect(prev).toEqual(undone_customer.contacts[0]);
  });
  test('/nested previous value should be previous object', () => {
    const prev = previousValue(changed_customer, diffs, '/nested');
    expect(prev).toEqual(undone_customer.nested);
  });
  test('/nested2 previous value should be previous object', () => {
    const prev = previousValue(changed_customer, diffs, '/nested2');
    expect(prev).toEqual(undone_customer.nested2);
  });
  test('/nested/nested previous value should be Hello', () => {
    const prev = previousValue(changed_customer, diffs, '/nested/nested');
    expect(prev).toEqual(undone_customer.nested.nested);
  });
  test('/nested/nested2 previous value should be Hello2', () => {
    const prev = previousValue(changed_customer, diffs, '/nested/nested2');
    expect(prev).toEqual(undone_customer.nested.nested2);
  });
  test('/nested2/nested previous value should be 2Hello', () => {
    const prev = previousValue(changed_customer, diffs, '/nested2/nested');
    expect(prev).toEqual(undone_customer.nested2.nested);
  });
  test('/nested2/nested2 previous value should be 2Hello2', () => {
    const prev = previousValue(changed_customer, diffs, '/nested2/nested2');
    expect(prev).toEqual(undone_customer.nested2.nested2);
  });
  test('fully restored customer', () => {
    const fully_restored = previousValue(changed_customer, diffs, '');
    expect(fully_restored).toEqual(undone_customer);
  });
  test('Restored without changes. Should return the same object', () => {
    expect(previousValue(changed_customer, [], '')).toEqual(changed_customer);
  });
  test('Prev deep path value without changes. Should return undefined', () => {
    expect(previousValue(undone_customer, diffs, '/deep/path')).toBe(undefined);
  });
  test('Incompatible changes', () => {
    const changes = [
      {path: '/a', old_value: {b: null}},
      {path: '/a/b', old_value: 'b1'},
    ];
    const obj = {a: {b: 'b2'}};
    expect(previousValue(obj, changes, '')).toEqual({a: {b: 'b1'}});
  });
  test('Incompatible changes even deeper', () => {
    const changes = [
      {path: '/a', old_value: {b: {c: 'c3'}}},
      {path: '/a/b', old_value: {c: 'c2'}},
      {path: '/a/b/c', old_value: 'c1'},
    ];
    const obj = {a: {b: {c: 'c4'}}};
    expect(previousValue(obj, changes, '')).toEqual({a: {b: {c: 'c1'}}});
  });
  test('Change key does not exists in object', () => {
    const changes = [ {path: '/a', old_value: 'a'} ];
    const obj = {};
    expect(previousValue(obj, changes, '')).toEqual({a: 'a'});
  });
  test('Change key does not deeply exists in object', () => {
    const changes = [ {path: '/a/b/c', old_value: 'c'} ];
    const obj = {};
    expect(previousValue(obj, changes, '')).toEqual({a: {b: {c: 'c'}}});
  });

  describe('Change keys deeper than object', () => {
    test('Object 1', () => {
      const changes = [
        {path: '/a', old_value: 'a'},
      ];
      const obj = {};
      expect(previousValue(obj, changes, '')).toEqual({a: 'a'});
    });
    test('Object 2', () => {
      const changes = [
        {path: '/a/b/c', old_value: undefined},
        {path: '/a/b/c', old_value: {c1: 'c1'}},
        {path: '/a/b/c/d/e', old_value: 'e'},
      ];
      const obj = {};
      expect(previousValue(obj, changes, '')).toEqual({a: {b: {c: {c1: 'c1', d: {e: 'e'}}}}});
    });

    test('Object 3', () => {
      const changes = [
        {path: '/a/b/c/d/e', old_value: 'e'},
        {path: '/a/b/c', old_value: undefined},
        {path: '/a/b/c', old_value: {c1: 'c1'}},
      ];
      const obj = {};
      expect(previousValue(obj, changes, '')).toEqual({a: {b: {c: {c1: 'c1'}}}});
    });
    test('Array 1', () => {
      const changes = [ {path: '/0', old_value: '0'} ];
      const obj = [];
      expect(previousValue(obj, changes, '')).toEqual(['0']);
    });
    test('Array 2', () => {
      const changes = [
        {path: '/0', old_value: ['0']},
        {path: '/0/0', old_value: '00'},
        {path: '/0/1', old_value: '01'},
      ];
      const obj = [];
      expect(previousValue(obj, changes, '')).toEqual([['00', '01']]);
    });
  });

});
