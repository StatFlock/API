/**
 * Created by joshanderson on 11/27/13.
 */
'use strict';

var db = require('./../database').mainBucket;
var couchbase = require('couchbase');
var uuid = require('uuid');

function AppModel()
{
}

//Create app
AppModel.create = function(app, callback)
{
    app.appID = uuid.v4();
    var appDocName = 'app::' + app.appID;

    var today = new Date();
    var UTCString = today.toUTCString();
    
    var appDoc =
    {
        appID: app.appID,
        type: 'app',
        name: app.name,
        createDate: UTCString,
        email: app.email,
        isActive: true,
        isPremium: false
    };

    db.insert(appDocName, appDoc, function(err, result)
    {
        if (err)
        {
            return callback(err);
        }

        return callback(null, appDoc);
    });
};

//Authorize App
AppModel.get = function(appID, callback)
{
    var appDocName = 'app::' + appID;

    db.get(appDocName, function(err, result) {
        if (err) {
            return callback(err);
        }
        else{

            //Everythign is OK
            callback(null, result.value);
        }
    });
};

module.exports = AppModel;
