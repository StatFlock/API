'use strict';

var N1qlQuery = require('couchbase').N1qlQuery;
var db = require('./../database').mainBucket;
var uuid = require('uuid');

function TeamModel()
{
}

TeamModel.create = function(team, callback)
{
    team.teamID = uuid.v4();
    var teamDocName = 'team::' + team.teamID;
    var today = new Date();
    var UTCString = today.toUTCString();

    //Make sure we don't create a duplicate
    console.log(team);

    var teamDoc =
    {
        teamID: team.teamID,
        type: 'team',
        fullName: team.fullName,
        shortName: team.shortName,
        mascot: team.mascot,
        sport: team.sport,
        league: team.league,
        division: team.division,
        createDate: UTCString,
        lastUpdateDate: UTCString
    };

    db.insert(teamDocName, teamDoc, function(err)
    {
        if (err) return callback(err);
        return callback(null, teamDoc);
    });
};

TeamModel.get = function(teamID, callback)
{
    var teamDocName = 'team::' + teamID;
    db.get(teamDocName, function(err, result) {
        if (err) {
            return callback(err);
        }
        callback(null, result.value);
    });
};

TeamModel.searchByFullName = function(searchString, callback)
{
    var query = 'SELECT statflock.* FROM statflock WHERE type="team" AND fullName LIKE "' + searchString + '%"';
    var n1qlQuery = N1qlQuery.fromString(query);
    db.query(n1qlQuery, function(err, result) {
        if (err) {
            console.log('query failed', err);
            return;
        }
        callback(null, result);
    });
};

TeamModel.searchBySport = function(sport, callback)
{
    var query = 'SELECT statflock.* FROM statflock WHERE type="team" AND sport = "' + sport + '"';
    var n1qlQuery = N1qlQuery.fromString(query);
    db.query(n1qlQuery, function(err, result) {
        if (err) {
            console.log('query failed', err);
            return;
        }
        callback(null, result);
    });
};

TeamModel.searchBySportAndLeague = function(sport, league, callback)
{
    var query = 'SELECT statflock.* FROM statflock WHERE type="team" AND sport = "' + sport + '" AND league =  "' + league + '"';
    var n1qlQuery = N1qlQuery.fromString(query);
    db.query(n1qlQuery, function(err, result) {
        if (err) {
            console.log('query failed', err);
            return;
        }
        callback(null, result);
    });
};

TeamModel.searchBySportAndLeagueAndShortName = function(sport, league, searchString, callback)
{
    var query = 'SELECT statflock.* FROM statflock WHERE type="team" AND sport = "' + sport + '" AND league =  "' + league + '" AND shortName LIKE "' + searchString + '%"';;
    var n1qlQuery = N1qlQuery.fromString(query);
    db.query(n1qlQuery, function(err, result) {
        if (err) {
            console.log('query failed', err);
            return;
        }
        callback(null, result);
    });
};


TeamModel.searchBySportAndLeagueAndDivision = function(sport, league, division, callback)
{
    var query = 'SELECT statflock.* FROM statflock WHERE type="team" AND sport = "' + sport + '" AND league =  "' + league + '" AND division =  "' + division + '"';
    var n1qlQuery = N1qlQuery.fromString(query);
    db.query(n1qlQuery, function(err, result) {
        if (err) {
            console.log('query failed', err);
            return;
        }
        callback(null, result);
    });
};


module.exports = TeamModel;
