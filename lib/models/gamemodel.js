/**
 * Created by joshanderson on 11/4/13.
 */
'use strict';

var db = require('./../database').mainBucket;
var couchbase = require('couchbase');
var uuid = require('uuid');

function GameModel()
{
}

GameModel.create = function(game, callback)
{
    game.gameID = uuid.v4();
    var gameDocName = 'game::' + game.gameID;
    var today = new Date();
    var UTCString = today.toUTCString();
    
    //Make sure we don't create a duplicate
    
    var gameDoc =
    {
        gameID: game.gameID,
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
        createDate: UTCString,
        lastUpdateDate: UTCString
    };

    db.insert(gameDocName, gameDoc, function(err)
    {
        if (err) return callback(err);

        //Add/update reference docs//
        
        //Handle daily group lookups//
        //Date & Sport
        var dateSportRefDoc = game.sport + '::' + game.gameDate;
        var gameDocName = 'game::' + game.gameID.toString();
        createOrUpdateRefDocContainer(dateSportRefDoc, gameDocName);
        
        //Date, Sport, & League
        var dateSportLeagueRefDoc = game.sport + '::' + game.homeTeamLeague + '::' + game.gameDate;
        createOrUpdateRefDocContainer(dateSportLeagueRefDoc, gameDocName);
        
        //No dupes if we don't need them
        if (game.homeTeamLeague !== game.awayTeamLeague) {
            dateSportLeagueRefDoc = game.sport + '::' + game.awayTeamLeague + '::' + game.gameDate;
            createOrUpdateRefDocContainer(dateSportLeagueRefDoc, gameDocName);
        }
        
        //Handle team schedule/results lookups//
        //Sport, league, season, home team
        var dateSportLeagueTeamRefDoc = game.sport + '::' + game.homeTeamLeague + '::' + game.season + '::' + game.homeTeam;
        createOrUpdateRefDocContainer(dateSportLeagueTeamRefDoc, gameDocName);
        
        //Sport, league, season, away team
        dateSportLeagueTeamRefDoc = game.sport + '::' + game.awayTeamLeague + '::' + game.season + '::' + game.awayTeam;
        createOrUpdateRefDocContainer(dateSportLeagueTeamRefDoc, gameDocName);
        
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
        createDate: game.createDate,
        lastUpdateDate: UTCString
    };

    db.replace(gameDocName, newGameDoc, function(err, result) {
        if (err)
        {
            return callback(err);
        }

        //Do we have to update the sport/date reference doc?

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
        callback(null, result.value);
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
    var refDoc = sport + '::' + date;
    var gameArray = [];

    db.get(refDoc, function(err, result)
    {
        if (err && err.code === couchbase.errors.keyNotFound) {
            return callback(null, gameArray);
        } else if (err) {
            return callback(err);
        } else {
            gameArray = result.value.games;
            //Do a multiget on all of the docs in the array
            db.getMulti(gameArray, function(err, result) {
                if (err) {
                    return callback(err + ': ' + result);
                }
                else {

                    //convert multiget result into normal JSON array
                    var jsonResult = [];

                    for (var doc in result){
                        jsonResult.push(result[doc].value);
                    }

                    return callback(null, jsonResult);
                }
            });

        }
    });

};

GameModel.getGamesBySportLeagueDate = function (date, sport, league, callback)
{
    var refDoc = sport + '::' + league + '::' + date;
    var gameArray = [];

    db.get(refDoc, function(err, result)
    {
        if (err && err.code === couchbase.errors.keyNotFound) {
            return callback(null, gameArray);
        } else if (err) {
            return callback(err);
        } else {
            gameArray = result.value.split('|');
            //Do a multiget on all of the docs in the array
            db.getMulti(gameArray, function(err, result) {
                if (err) {
                    return callback(err + ': ' + result);
                }
                else {

                    //convert multiget result into normal JSON array
                    var jsonResult = [];

                    for (var doc in result){
                        jsonResult.push(result[doc].value);
                    }

                    return callback(null, jsonResult);
                }
            });

        }
    });

};

GameModel.getGamesBySportLeagueTeamSeason = function (season, sport, league, team, callback)
{
    var refDoc = sport + '::' + league + '::' + season + '::' + team;
    var gameArray = [];

    db.get(refDoc, function(err, result)
    {
        if (err && err.code === couchbase.errors.keyNotFound) {
            return callback(null, gameArray);
        } else if (err) {
            return callback(err);
        } else {
            gameArray = result.value.split('|');
            //Do a multiget on all of the docs in the array
            db.getMulti(gameArray, function(err, result) {
                if (err) {
                    return callback(err + result);
                }
                else {

                    //convert multiget result into normal JSON array
                    var jsonResult = [];

                    for (var doc in result){
                        jsonResult.push(result[doc].value);
                    }

                    return callback(null, jsonResult);
                }
            });

        }
    });

};

//Utility Methods//
function createOrUpdateRefDocContainer(refDocName, docName, next) {
    
    //Setup if we are new
    var gamesJSON = {
        games: []
    };
    
    //Do we have a reference doc that matches our date/sport combo?
    db.get(refDocName, function(err, result) {
        if (err && err.code === couchbase.errors.keyNotFound)
        {
            //Add one
            gamesJSON.games.push(docName);
            db.insert(refDocName, gamesJSON, function(err)
            {
                if (err) return next(err);
            });
        } else if (err) {
            return next(err);
        } else {
            //We have one, so let's just update it
            gamesJSON = result.value;
            gamesJSON.games.push(docName);
            db.replace(refDocName, gamesJSON, function(err)
            {
                if (err) return next(err);
            });
        }
    });
}

function checkForGameDupes(newGame, next) {

    //Build N1QL query
}

module.exports = GameModel;
