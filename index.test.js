const previousValue = require('./lib/getPreviousValue.js'); 

const changed_customer = {
  name: 'Test name',
  surname: 'Test surname',
  theundefined: 'some value',
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
]
const undone_customer = {
  name: 'old name',
  surname: 'Test surname',
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
});
