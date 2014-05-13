'use strict';

// Standard packages
var express = require('express');
var couchbase = require('couchbase');
var uuid = require('uuid');
var Mixpanel = require('mixpanel');

// create an instance of the mixpanel client
var mixpanel = Mixpanel.init('47e18e247967cb68c64ac5d77ea17676');

// Models
var gameModel = require('./models/gamemodel');
var appModel = require('./models/appmodel');

// Connect to our Couchbase server
module.exports.mainBucket = new couchbase.Connection({bucket:'statflock'}, function(){});

var app = express();
app.use(express.bodyParser());
app.use(function(err, req, res, next){
  console.log(err.stack);
  res.send(500, 'Something broke!');
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
                next('The specified API Key does not exist.');
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
                    return callback('The specified API Key is currently disabled');
                }
                else
                    next();
                
            }
        });
    }
    else {
        next('Must be an authorized app to access this endpoint');
    }
}

// Routing methods //
// Game Routes //

// Add a game
app.post('/v1/games', authApp, function(req, res, next) {
    if (!req.query.sport) {
        return res.send(400, 'Must specify a sport');
    }
    if (!req.query.homeTeam) {
        return res.send(400, 'Must specify a home team');
    }
    if (!req.query.awayTeam) {
        return res.send(400, 'Must specify a away team');
    }
    if (!req.query.gameDate) {
        return res.send(400, 'Must specify a game date');
    }

    gameModel.create(req.query, function(err, game) {
        if (err) {
            return next(err);
        }
        //Tell mixpanel
        mixpanel.track("Add A Game", {                    
                                        distinct_id: req.get('APIKey'),
                                        APIKey: req.get('APIKey'),
                                        Game: game.gameID,
                                        Sport: req.query.sport,
                                        HomeTeam: req.query.homeTeam,
                                        AwayTeam: req.query.awayTeam,
                                        GameDate: req.query.gameDate,
                                        League: req.query.league
                                    });
        res.json({gameID: game.gameID});
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
    
    gameModel.set(req.params.id, req.query, function(err, game) {
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
    if (!req.query.currentHomeScore) {
        return res.send(400, 'Must include a home team score');
    }
    if (!req.query.currentAwayScore) {
        return res.send(400, 'Must include a away team score');
    }
    if (!req.query.currentPeriod) {
        return res.send(400, 'Must include a period');
    }
    
    gameModel.updateScore(req.params.id, req.query, function(err, game) {
        if (err) {
            return next(err);
        }
        
        //Tell mixpanel
        mixpanel.track("Update A Game Score", {
                                        distinct_id: req.get('APIKey'),
                                        APIKey: req.get('APIKey'),
                                        GameID: req.params.id,
                                        CurrentPeriod: req.query.currentPeriod,
                                        CurrentTime: req.query.currentTime,
                                        CurrentDisplayTime: req.query.currentDisplayTime,
                                        CurrentHomeScore: req.query.currentHomeScore,
                                        CurrentAwayScore: req.query.currentAwayScore,
                                        });

        
        res.json(game);
    });
});

//Get all games for specified sport, league, and date
app.get('/v1/games/:sport/:league/:date', authApp, function(req, res, next) {
            
    gameModel.getGamesBySportLeagueDate(req.params.date, req.params.sport, req.params.league, function(err, gameList) {
        if (err) {
            return res.send(400,'error getting list of games: ' + JSON.stringify(err));
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

//Get all games for specified sport, league, team and season
app.get('/v1/games/:sport/:league/:team/:season', authApp, function(req, res, next) {
            
    gameModel.getGamesBySportLeagueTeamSeason(req.params.season, req.params.sport, req.params.league, req.params.team, function(err, gameList) {
        if (err) {
            return res.send(400,'error getting list of games: ' + JSON.stringify(err));
        }
        else{
        
            //Tell mixpanel
            mixpanel.track("Get Games By Sport, League, Team, And Season", {
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
            return res.send(400,'error getting list of games: ' + JSON.stringify(err));
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
app.post('/v1/app', function(req, res, next) {
    if (!req.query.name) {
    return res.send(400, 'Must specify a name');
  }

  appModel.create(req.query, function(err, newApp) {
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

//Create default app
app.post('/v1/app/default', function(req, res, next) {
  
  appModel.createDefault(function(err, newApp) {
    if (err) {
      return next(err);
    }
    return(newApp);
  });
});

app.listen(3000, function () {
  console.log('Listening on port 3000');
});
