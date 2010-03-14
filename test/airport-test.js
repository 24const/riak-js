// This file is provided to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file
// except in compliance with the License.  You may obtain
// a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

require.paths.unshift("../lib");

var Riak = require('riak-node'),
  assert = require('assert');

process.mixin(require('sys'));

var db = new Riak.Client(),
  airline_bucket = 'test-airlines',
  airport_bucket = 'test-airports',
  flight_bucket = 'test-flights';

// setup

db.save(airport_bucket, 'EZE', {city: 'Buenos Aires'})();
db.save(airport_bucket, 'BCN', {city: 'Barcelona'})();
db.save(airport_bucket, 'AMS', {city: 'Amsterdam'})();
db.save(airport_bucket, 'CDG', {city: 'Paris'})();
db.save(airport_bucket, 'MUC', {city: 'Munich'})();
db.save(airport_bucket, 'JFK', {city: 'New York'})();
db.save(airport_bucket, 'HKK', {city: 'Hong Kong'})();
db.save(airport_bucket, 'MEX', {city: 'Mexico DF'})();

db.save(flight_bucket, 'KLM-8098', {code: 'KLM-8098', to: 'JFK', from: 'AMS', departure: 'Mon, 05 Jul 2010 17:05:00 GMT'})();
db.save(flight_bucket, 'AFR-394', {code: 'AFR-394', to: 'CDG', from: 'EZE', departure: 'Mon, 12 Jul 2010 05:35:00 GMT'})();
db.save(flight_bucket, 'CPA-112', {code: 'CPA-112', to: 'HKK', from: 'AMS', departure: 'Wed, 11 Aug 2010 01:20:00 GMT'})();
db.save(flight_bucket, 'IBE-5624', {code: 'IBE-5624', to: 'MUC', from: 'BCN', departure: 'Mon, 15 Mar 2010 22:10:00 GMT'})();
db.save(flight_bucket, 'ARG-714', {code: 'ARG-714', to: 'EZE', from: 'BCN', departure: 'Mon, 08 Mar 2010 20:50:00 GMT'})();
db.save(flight_bucket, 'DLH-4001', {code: 'DLH-4001', to: 'JFK', from: 'MUC', departure: 'Tue, 23 Aug 2010 13:30:00 GMT'})();
db.save(flight_bucket, 'AMX-1344', {code: 'AMX-1344', to: 'EZE', from: 'MEX', departure: 'Wed, 21 Jul 2010 08:45:00 GMT'})();
db.save(flight_bucket, 'AMX-1346', {code: 'AMX-1346', to: 'MEX', from: 'EZE', departure: 'Mon, 08 Mar 2010 19:40:00 GMT'})();
db.save(flight_bucket, 'KLM-1196', {code: 'KLM-1196', to: 'AMS', from: 'CDG', departure: 'Fri, 20 Aug 2010 14:59:00 GMT'})();
db.save(flight_bucket, 'CPA-729', {code: 'CPA-729', to: 'CDG', from: 'HKK', departure: 'Thu, 19 Aug 2010 07:30:00 GMT'})();
db.save(flight_bucket, 'ARG-909', {code: 'ARG-909', to: 'AMS', from: 'EZE', departure: 'Tue, 24 Aug 2010 15:25:00 GMT'})();
db.save(flight_bucket, 'IBE-4418', {code: 'IBE-4418', to: 'BCN', from: 'JFK', departure: 'Sat, 24 Jul 2010 12:00:00 GMT'})();

var klm_header = {headers: {link: db.makeLinks([
  { bucket: flight_bucket, key: 'KLM-8098', tag: 'flight' },
  { bucket: flight_bucket, key: 'KLM-1196', tag: 'flight' }
])}};

var klm2 = {headers: {link: db.makeLinks([{ bucket: airport_bucket, key: 'AMS', tag: 'base'},
  { bucket: airport_bucket, key: 'CDG', tag: 'base' }
])}};

db.save(airline_bucket, 'KLM', {name: 'KLM', fleet: 111, alliance: 'SkyTeam', european: true}, klm_header)();
db.save(airline_bucket, 'AFR', {name: 'Air France', fleet: 263, alliance: 'SkyTeam', european: true})();
db.save(airline_bucket, 'AMX', {name: 'Aeroméxico', fleet: 43, alliance: 'SkyTeam', european: false})();
db.save(airline_bucket, 'ARG', {name: 'Aerolíneas Argentinas', fleet: 40, european: false})();
db.save(airline_bucket, 'DLH', {name: 'Lufthansa', fleet: 262, alliance: 'Star Alliance', european: true})();
db.save(airline_bucket, 'IBE', {name: 'Iberia', fleet: 183, alliance: 'One World', european: true})();
db.save(airline_bucket, 'CPA', {name: 'Cathay Pacific', fleet: 127, alliance: 'One World', european: false})();

// querying

var map = function(v, keydata, args) {
  if (v.values) {
    var ret = [], a = Riak.mapValuesJson(v)[0];
    if ((a.from === args.from) && (new Date(a.departure) < new Date(args.before) )) {
      ret.push(a);
    }
    return ret;
  } else {
    return [];
  }
};

var from = 'EZE', before = 'Wed, 14 Jul 2010',
  query = {
    inputs: flight_bucket,
    query: [ {map: {source: map, arg: {from: from, before: before}}} ]
  };

var flight_print = function(flight) {
  db.log('Flight ' + flight.code + ' with destination ' + flight.to + ' departing ' + flight.departure);
};

db.mapReduce(query)(function(response) {
  assert.equal(response.length, 2);
  db.log('Flights from ' + from + ' before ' + before + ':');
  response.forEach(flight_print);
  db.log("");
});

// link-walking

db.walk(airline_bucket, 'KLM', [["_", "flight"]])(function(response) {
  assert.equal(response.length, 2);
  db.log('Flights for airline KLM:');
  response.forEach(flight_print);
  db.log("");
});

// cleanup

[airline_bucket, airport_bucket, flight_bucket].forEach(function(bucket) {
  db.get(bucket)(function(response) {
    response.keys.forEach(function(key) {
      db.remove(bucket, key)(function(){});
    })
  })
});