'use strict';

// Standard packages
var express = require('express');
var uuid = require('uuid');
var Mixpanel = require('mixpanel');
var couchbase = require('couchbase');
var bodyParser = require('body-parser');

// create an instance of the mixpanel client
var mixpanel = Mixpanel.init('47e18e247967cb68c64ac5d77ea17676');

// Models
var gameModel = require('./models/gamemodel');
var appModel = require('./models/appmodel');
var teamModel = require('./models/teammodel');

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, APIKey, Authorization");
  next();
});
app.use(function(err, req, res, next){
  console.log(err.stack);
  res.status(500).send('Something broke!');
});

// Auth methods
function authApp(req, res, next) {
    if (req.get('APIKey'))
    {
        appModel.get(req.get('APIKey'), function (err, result) {
            if (err && err.code === couchbase.errors.keyNotFound) {
                //Tell mixpanel
                mixpanel.track("Unauthorized API Request", {
                                            APIKey: req.get('APIKey'),
                                            Path: req.route.path,
                                            Method: req.route.method,
                                            Keys: req.route.keys,
                                            Params: req.route.params
                                            });
                next(res.status(401).send('The specified API Key does not exist.'));
            }
            else if (err) {
                next(err);
            }
            else {
                //Validate app flags
                if (result.isActive == false)
                {
                    //Tell mixpanel
                    mixpanel.track("Disabled API Request", {
                                                distinct_id: req.get('APIKey'),
                                                APIKey: req.get('APIKey'),
                                                Path: req.route.path,
                                                Method: req.route.method,
                                                Keys: req.route.keys,
                                                Params: req.route.params
                                                });
                    return callback(res.status(401).send('The specified API Key is currently disabled'));
                }
                else
                    next();

            }
        });
    }
    else {
        next(res.status(401).send('Must be an authorized app to access this endpoint'));
    }
}

// Routing methods //
// Game Routes //

// Add a game
app.post('/v1/games', authApp, function(req, res, next) {
    console.log(req.body);
    if (!req.body.sport) {
        return res.status(400).send('Must specify a sport');
    }
    if (!req.body.homeTeamID) {
        return res.status(400).send('Must specify a home team');
    }
    if (!req.body.awayTeamID) {
        return res.status(400).send('Must specify a away team');
    }
    if (!req.body.gameDate) {
        return res.status(400).send('Must specify a game date');
    }
    if (!req.body.gameStartDateTime) {
        return res.status(400).send('Must specify a game start time');
    }
    gameModel.create(req.body, function(err, game) {
        if (err) {
            return next(err);
        }
        //Tell mixpanel
        mixpanel.track("Add A Game", {
                                        distinct_id: req.get('APIKey'),
                                        APIKey: req.get('APIKey'),
                                        Game: game.gameID,
                                        Sport: req.body.sport,
                                        HomeTeam: req.body.homeTeam,
                                        AwayTeam: req.body.awayTeam,
                                        GameDate: req.body.gameDate
                                    });
        res.json(game);
    });
});

//Get a game by ID
app.get('/v1/games/:id', authApp, function(req, res, next) {
    gameModel.get(req.params.id, function(err, game) {
        if (err) {
            return next(err);
        }
        //Tell mixpanel
        mixpanel.track("Get A Game", {
                                        distinct_id: req.get('APIKey'),
                                        APIKey: req.get('APIKey'),
                                        GameID: game.gameID,
                                        HomeTeam: game.hometeam,
                                        AwayTeam: game.awayteam,
                                        GameDate: game.gamedate,
                                        League: game.league
                                    });
        mixpanel.people.track_charge(req.get('APIKey'), 0.01);
        res.json(game);
    });
});

//Update a game
app.put('/v1/games/:id', authApp, function(req, res, next) {

    gameModel.set(req.params.id, req.body, function(err, game) {
       if (err) {
           return next(err);
       }

        //Tell mixpanel
        mixpanel.track("Update A Game", {
                                        distinct_id: req.get('APIKey'),
                                        APIKey: req.get('APIKey'),
                                        GameID: game.gameID,
                                        HomeTeam: game.hometeam,
                                        AwayTeam: game.awayteam,
                                        GameDate: game.gamedate,
                                        League: game.league,
                                        CurrentPeriod: game.currentperiod,
                                        CurrentTime: game.currenttime,
                                        CurrentDisplayTime: game.currentdisplaytime,
                                        CurrentHomeScore: game.currenthomescore,
                                        CurrentAwayScore: game.currentawayscore,
                                        });
       res.json(game);
   });
});

//Update a game's score
app.put('/v1/games/:id/score', authApp, function(req, res, next) {

    if (!req.body.currentHomeScore) {
        return res.status(400).send('Must include a home team score');
    }
    if (!req.body.currentAwayScore) {
        return res.status(400).send('Must include an away team score');
    }


    gameModel.updateScore(req.params.id, req.body, function(err, game) {
        if (err) {
            return next(err);
        }

        //Tell mixpanel
        mixpanel.track("Update A Game Score", {
                                        distinct_id: req.get('APIKey'),
                                        APIKey: req.get('APIKey'),
                                        GameID: req.params.id,
                                        CurrentPeriod: req.body.currentPeriod,
                                        CurrentTime: req.body.currentTime,
                                        CurrentDisplayTime: req.body.currentDisplayTime,
                                        CurrentHomeScore: req.body.currentHomeScore,
                                        CurrentAwayScore: req.body.currentAwayScore,
                                        });


        res.json(game);
    });
});

//Get all games for specified sport, league, and date
app.get('/v1/games/:sport/:league/:date', authApp, function(req, res, next) {

    gameModel.getGamesBySportLeagueDate(req.params.date, req.params.sport, req.params.league, function(err, gameList) {
        if (err) {
            return res.status(400).send('error getting list of games: ' + JSON.stringify(err));
        }
        else{

            //Tell mixpanel
            mixpanel.track("Get Games By Sport, League, And Date", {
                                                            distinct_id: req.get('APIKey'),
                                                            APIKey: req.get('APIKey'),
                                                            Sport: req.params.sport,
                                                            League: req.params.league,
                                                            Date: req.params.date,
                                                            GameCount: gameList.length
                                                            });
            mixpanel.people.track_charge(req.get('APIKey'), 0.01);
            return res.send({games: gameList});
        }
    });
});

//Get all games for specified sport and date
app.get('/v1/games/:sport/:date', authApp, function(req, res, next) {

    gameModel.getGamesBySportDate(req.params.date, req.params.sport, function(err, gameList) {
        if (err) {
            return res.status(400).send('error getting list of games: ' + JSON.stringify(err));
        }
        else{

            //Tell mixpanel
            mixpanel.track("Get Games By Sport And Date", {
                                                            distinct_id: req.get('APIKey'),
                                                            APIKey: req.get('APIKey'),
                                                            Sport: req.params.sport,
                                                            Date: req.params.date,
                                                            GameCount: gameList.length
                                                            });
            mixpanel.people.track_charge(req.get('APIKey'), 0.01);
            return res.send({games: gameList});
        }
    });
});
//End Game Routes //

//App Routes //
//Create a new app
app.post('/v1/apps', function(req, res, next) {
    if (!req.body.name) {
        console.log(req.body);
        return res.status(400).send('Must specify a name');
    }

    appModel.create(req.body, function(err, newApp) {
    if (err) {
      return next(err);
    }

    //Create a new identity in mixpanel
    mixpanel.people.set(newApp.appID, {
        $created: newApp.createDate,
        $name: newApp.name,
        $email: newApp.email
    });

    res.json(newApp);
  });
});


//Team Routes //
//Create a new team
app.post('/v1/teams', function(req, res, next) {
    if (!req.body.fullName) {
        console.log(req.body);
        return res.status(400).send('Must specify a full name');
    }
    if (!req.body.shortName) {
        console.log(req.body);
        return res.status(400).send('Must specify a short name');
    }
    if (!req.body.sport) {
        console.log(req.body);
        return res.status(400).send('Must specify a sport');
    }
    if (!req.body.league) {
        console.log(req.body);
        return res.status(400).send('Must specify a league');
    }

    teamModel.create(req.body, function(err, newTeam) {
    if (err) {
      return next(err);
    }

    res.json(newTeam);
  });
});

//Search teams by name
app.get('/v1/teams', function(req, res, next){

    if (!req.query.fullName) {
        return res.status(400).send('Must specify a fullName to search on.');
    }

    teamModel.searchByFullName(req.query.fullName, function(err, team) {
        if (err) {
            return next(err);
        }

        res.json(team);
    });

});

//Get a team by ID
app.get('/v1/teams/:id', authApp, function(req, res, next) {

    teamModel.get(req.params.id, function(err, team) {
        if (err) {
            return next(err);
        }

        res.json(team);
    });
});

//Get teams by sport & league
app.get('/v1/teams/:sport/:league', authApp, function(req, res, next) {


    if (req.query.shortName) {
        teamModel.searchBySportAndLeagueAndShortName(req.params.sport, req.params.league, req.query.shortName, function(err, team) {
            if (err) {
                return next(err);
            }

            res.json(team);
        });

    }
    else {
        if (req.params.league == "*") {
            teamModel.searchBySport(req.params.sport, function(err, teams) {
                if (err) {
                    return next(err);
                }

                res.json(teams);
            });
        }
        else {
            teamModel.searchBySportAndLeague(req.params.sport, req.params.league, function(err, teams) {
                if (err) {
                    return next(err);
                }

                res.json(teams);
            });
        }
    }

});


//Get teams by sport & league
app.get('/v1/teams/:sport/:league/:division', authApp, function(req, res, next) {
    teamModel.searchBySportAndLeagueAndDivision(req.params.sport, req.params.league, req.params.division, function(err, teams) {
        if (err) {
            return next(err);
        }

        res.json(teams);
    });
});

app.listen(3000, function () {
  console.log('Listening on port 3000');
});
