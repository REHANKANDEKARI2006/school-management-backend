// src/migrations/seedUtils.js
import { addressDictionary } from './addressDictionary.js';

// export this so other files can import it
export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomAddress() {
  const houseNo = Math.floor(1 + Math.random() * 250);
  const street  = randomFrom(addressDictionary.streets);
  const area    = randomFrom(addressDictionary.areas);
  const city    = randomFrom(addressDictionary.cities);
  const state   = addressDictionary.states[0];
  const pincode = 416000 + Math.floor(Math.random() * 1000);

  return `${houseNo}, ${street}, ${area}, ${city}, ${state} - ${pincode}`;
}
