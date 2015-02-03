'use strict';

var couchbase = require('couchbase');

// Connect to our Couchbase server
var cluster = new couchbase.Cluster('couchbase://127.0.0.1');
var bucket = cluster.openBucket('statflock');
bucket.enableN1ql('127.0.0.1:8093');

module.exports.mainBucket = bucket;