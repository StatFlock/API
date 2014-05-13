'use strict';

var couchbase = require('couchbase');

// Connect to our Couchbase server
module.exports.mainBucket = new couchbase.Connection({bucket:'statflock'}, function(){});