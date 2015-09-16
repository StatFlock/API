/**
 * Created by joshanderson on 11/4/13.
 */
'use strict';

var N1qlQuery = require('couchbase').N1qlQuery;
var db = require('./../database').mainBucket;
var couchbase = require('couchbase');
var uuid = require('uuid');
var teamModel = require('./teammodel');
var async = require('async');

function GameModel()
{
}

GameModel.create = function(game, callback)
{
    game.gameID = uuid.v4();
    var gameDocName = 'game::' + game.gameID;
    var today = new Date();
    var UTCString = today.toUTCString();
    var teamArray = ['team::'+game.awayTeamID, 'team::'+game.homeTeamID];

    //TODO: Make sure we don't create a duplicate

    //Validate that we have real, appropriate team IDs
    //Do a multiget on all of the docs in the array
    db.getMulti(teamArray, function(err, result) {
        if (err) {
            return callback(err + ': ' + result);
        }

        //TODO: Validate that teams are logical

    });

    var gameDoc =
    {
        gameID: game.gameID,
        type: 'game',
        sport: game.sport,
        homeTeamID: game.homeTeamID,
        awayTeamID: game.awayTeamID,
        season: game.season,
        currentPeriod: game.currentPeriod,
        currentTime: game.currentTime,
        currentDisplayTime: game.currentDisplayTime,
        currentHomeScore: game.currentHomeScore,
        currentAwayScore: game.currentAwayScore,
        gameDate: game.gameDate,
        gameStartTime: game.gameStartTime,
        createDate: UTCString,
        lastUpdateDate: UTCString
    };

    db.insert(gameDocName, gameDoc, function(err)
    {
        if (err) return callback(err);
        return callback(null, gameDoc);
    });
};


GameModel.set = function(gameID, game, callback)
{
    var gameDocName = 'game::' + gameID;
    var today = new Date();
    var UTCString = today.toUTCString();

    db.get(gameDocName, function(err) {
        if (err && err.code === couchbase.errors.keyNotFound) {
            return callback('Game not found' + gameDocName);
        } else if (err) {
            return callback(err);
        }
    });

    var newGameDoc =
    {
        gameID: gameID,
        sport: game.sport,
        homeTeamLeague: game.homeTeamLeague,
        awayTeamLeague: game.awayTeamLeague,
        season: game.season,
        currentPeriod: game.currentPeriod,
        currentTime: game.currentTime,
        currentDisplayTime: game.currentDisplayTime,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        currentHomeScore: game.currentHomeScore,
        currentAwayScore: game.currentAwayScore,
        gameDate: game.gameDate,
        gameStartTime: game.gameStartTime,
        createDate: game.createDate,
        lastUpdateDate: UTCString
    };

    db.replace(gameDocName, newGameDoc, function(err, result) {
        if (err) return callback(err);

        return callback(null, result.value);
    });
};

GameModel.get = function(gameID, callback)
{
    var gameDocName = 'game::' + gameID;

    db.get(gameDocName, function(err, result) {
        if (err) {
            return callback(err);
        }

        getTeamDocsArray(result.value, function(err, teamDocArray) {
            if (err) {
                return callback(err);
            }
            result.value.teams = teamDocArray;
            callback(null, result.value);
        });

    });
};

GameModel.updateScore = function (gameID, scoreData, callback)
{
    //Make sure the game actually exists
    var gameDocName = 'game::' + gameID;
    var today = new Date();
    var UTCString = today.toUTCString();

    db.get(gameDocName, function(err, result)
    {
        if (err)
        {
            return callback(err);
        }

        var gameDoc = result.value;

        //Change the score data in the game doc
        gameDoc.currentAwayScore = scoreData.currentAwayScore;
        gameDoc.currentHomeScore = scoreData.currentHomeScore;
        gameDoc.currentTime = scoreData.currentTime;
        gameDoc.currentPeriod = scoreData.currentPeriod;
        gameDoc.currentDisplayTime = scoreData.currentDisplayTime;
        gameDoc.lastUpdateDate = UTCString;

        console.log(gameDoc);

        //Update the game doc
        db.replace(gameDocName, gameDoc, function(err, result) {
            if (err)
            {
                return callback(err);
            }
            return callback(null, result.value);
        });

    });

};

GameModel.getGamesBySportDate = function (date, sport, callback)
{

    var query = 'SELECT statflock.* FROM statflock WHERE type="game" AND sport = "' + sport + '" AND gameDate =  "' + date + '"';
    var n1qlQuery = N1qlQuery.fromString(query);
    db.query(n1qlQuery, function(err, result) {
        if (err) {
            console.log('query failed', err);
            callback(err);
        }

        callback(null, result);

    });

};

GameModel.getGamesBySportLeagueDate = function (date, sport, league, callback)
{
    var query = 'SELECT statflock.* FROM statflock WHERE type="game" AND sport = "' + sport + '" AND gameDate =  "' + date + '" AND league =  "' + league + '"';
    var n1qlQuery = N1qlQuery.fromString(query);
    db.query(n1qlQuery, function(err, result) {
        if (err) {
            console.log('query failed', err);
            return;
        }
        callback(null, result);
    });

};


//Utility Methods//
function getTeamDocsArray(game, next) {

    teamModel.get(game.homeTeamID, function(err, team) {
        if (err) {
            return next(err);
        }
        game.homeTeam = team;

        teamModel.get(game.awayTeamID, function(err, team) {
            if (err) {
                return next(err);
            }
            game.awayTeam = team;

            //Return
            return next(null);
        });
    });

}

function checkForGameDupes(newGame, next) {

    //Build N1QL query
}

module.exports = GameModel;
