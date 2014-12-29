'use strict';

var couchbase = require('couchbase');

// Connect to our Couchbase server
var cluster = new couchbase.Cluster('couchbase://127.0.0.1');

module.exports.mainBucket = cluster.openBucket('statflock');