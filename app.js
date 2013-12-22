var express = require("express");
var app = express();
var $ = require('jquery');
var port = 3700;

var database = require("./mysql.js");

/*app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res) {
    res.render("home");
});*/

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/layout.html')
});
database.connect();
var io = require('socket.io').listen(app.listen(port));
io.set('log level', 0);
function Player(pos, identifier, color, socketId, username){
    this.position = pos;
    this.color = color;
    this.id = identifier;
    this.socketId = socketId;
    this.winner = false;
    this.ready = false;
    this.idle = true;
    this.waitingToEnter = false;
    this.readyToEnter = false;
    this.username = username;
}

function Game(gameplayers, initiator, id){
    //TODO create game identifier, and use this to find games. Also tie identifier to client object in a many to many relation
    this.players = gameplayers;
    this.entered = false;
    this.started = false;
    this.initiator = initiator;
    this.id = id;
    this.colors = ['red','blue','yellow','green'];
    this.gameType = 'turnBased';
    this.idHasTurn = '';
}
var players = [],
    games = [],
    colors = ['red','blue','yellow','green'],
    gameType = "turnBased",
    idHasTurn = 0,
    nextGameId = 0,
    colorPointer = 0;

function addPlayer(pos, identifier, color, socketId, username) {
    var adder = new Player(pos, identifier, color, socketId, username);
    players.push(adder);
}

function getQuestion(callback){
    database.getQuestion('historie',function(questionObj){
        var question = {
            title: questionObj.subcategory,
            question: questionObj.question,
            options: []
        }
        var answers = questionObj.answer.split(",");
        for(var i = 0; i < answers.length; i++){
            question.options.push({label : answers[i], correct : true});
        }
        var posibles = questionObj.possibilities.split(",");
        for(i = 0; i < posibles.length; i++){
            question.options.push({label : posibles[i], correct : false});
        }
        shuffle(question.options);
        callback(question);
    });


}

function shuffle(array) {
    var currentIndex = array.length
        , temporaryValue
        , randomIndex
        ;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

//Will cause all players in a game with the initator to go back to idle screen. There should only be one game with this initiator.
function abort(initiatorId, socketid){
        var involvedPlayers = [];
        for(var i=0; i < games.length; i++){
            if(games[i].initiator.socketId === initiatorId){
                for(var j=0; j < games[i].players.length; j++){
                    console.log("someone pressed no");
                    io.sockets.socket(games[i].players[j].socketId).emit("abortGame", socketid);
                    involvedPlayers.push(games[i].players[j]);
                }
                games.splice(i,1);
                console.log(games);
            }
        }
        //slightly ineffecient code
        for(var k=0; k < players.length; k++){
            for (var h = 0; h < involvedPlayers.length; h++) {
                if(players[k].socketId === involvedPlayers[h].socketId){
                    players[k].idle = true;
                }
            };
        }
    }

io.sockets.on('connection', function(socket){
    socket.on('newPlayer', function(data){
       addPlayer(0,players.length, colors[colorPointer++],socket.id, data.playerName);
       socket.broadcast.emit('newPlayer',players);
       socket.emit('init', players);
       console.log("player joined");
    });

    socket.on('playerMoved', function(clientGame){
        var winningMove = false;
        for (var i = 0; i < games.length; i++) {
            if(games[i].id == clientGame.id){
                for(var j = 0; j < games[i].players.length; j++){
                    if(games[i].players[j].socketId === socket.id){
                        games[i].players[j].position = (games[i].players[j].position +1)%8;
                        socket.emit('playerMoved', games[i]);
                        if (games[i].players[j].position == 0) {
                            games[i].players[j].winner = true;
                            socket.emit('playerWon');
                            winningMove = true;
                        }
                    }
                }
                for(j = 0; j < games[i].players.length; j++){
                    if(games[i].players[j].socketId != socket.id){
                        io.sockets.socket(games[i].players[j].socketId).emit('playerMoved', games[i]);
                        if(winningMove){
                            io.sockets.socket(games[i].players[j].socketId).emit('playerLost');
                        }
                    }
                }
                break
            }
        }
    });

    socket.on('question', function(data){
       getQuestion(function(question){
           socket.emit('questionResponse', question);
       });
    });

    socket.on('startGame', function(data) {
        console.log("Event: Start Game");

        gameType = data.gameType;
        for(var i = 0; i < games.length; i++){
            if(games[i].id == data.game.id){
                games[i].gameType = data.gameType;
                for(var j = 0; j < games[i].players.length; j++){
                    games[i].players[j].position = 0;
                    games[i].players[j].winner = false;
                    games[i].players[j].ready = false;
                }
                break
            }
        }
        for(i = 0; i < games.length; i++){
            console.log("serverGame: " + games[i].id + ", clientGame: " + data.game.id);
            if(games[i].id == data.game.id){
                for(j = 0; j < games[i].players.length; j++){
                    io.sockets.socket(games[i].players[j].socketId).emit('gameStarted', games[i], gameType);
                    console.log("Sending game started event");
                    if(socket.id === games[i].players[j].socketId){
                        games[i].idHasTurn = games[i].players[j].socketId;
                        console.log(games[i].players[j].username + " has next turn");
                    }
                }
                break

            }
        }
        console.log("game Started");
    });

    socket.on('ready', function(game){
        console.log("Event: ready");

        var playersReady = 0,
            currentGame = null;
        for (var i = 0; i < games.length; i++) {
            if(game.id == games[i].id){
                currentGame = games[i];
                for(var j = 0; j < games[i].players.length; j++){
                    if(games[i].players[j].socketId == socket.id){
                        games[i].players[j].ready = true;
                        playersReady++;
                    } else if(games[i].players[j].ready){
                        playersReady++;
                    }
                }
                break

            }
        }
        if(currentGame != null && playersReady >= currentGame.players.length && gameType == 'turnBased'){
            for (i = 0; i < currentGame.players.length; i++) {
                if(currentGame.players[i].socketId == currentGame.idHasTurn){
                    io.sockets.socket(currentGame.players[i].socketId).emit('startTurn');
                }
            }
        }
    });

    socket.on('disconnect', function(){
        var currentGame = null;
        for(var i = 0; i < players.length; i++){
            if(players[i].socketId == socket.id){
                colors.push(players[i].color);
                players.splice(i,1);
            }
        }
        //handling games where players are prompting other players to join
        for (var j = 0; j < games.length; j++) {
            for(var k = 0; k < games[j].players.length; k++){
                console.log(games[j].initiator.username);
                if(games[j].players[k].socketId === socket.id){
                    if(!games[j].entered) {
                        abort(games[j].initiator.socketId);
                        break
                    } else {
                        games[j].players.splice(k,1);
                        currentGame = games[j];
                        if(games[j].players.length == 0){
                            games.splice(j,1);
                        }
                        break
                    }
                }
            }
        }
        socket.broadcast.emit('playerDisconnected', players, currentGame);
    });

    socket.on('turnEnded', function(game) {
        console.log("Event: Turn Ended");
        var currentGame = null;
        for (var i = 0; i < games.length; i++) {
            if(games[i].id == game.id){
                currentGame = games[i];
            }
        }
        console.log(currentGame.gameType);
        if(currentGame.gameType == "turnBased"){
            for (i = 0; i < currentGame.players.length; i++) {
                if (currentGame.players[i].socketId === socket.id) {
                    console.log("Asked player " + (i+1)%currentGame.players.length + " to start turn");
                    if(!players[i].winner){
                        io.sockets.socket(currentGame.players[(i+1)%currentGame.players.length].socketId).emit('startTurn');
                    }
                }
            }
        }
    });

    socket.on('queryPlayerList', function(){
       socket.emit('playerList', players)
    });

    socket.on('requestEnterGame',function(selectedPlayers){
        var requestSent = false;
        var involvedPlayers = [];
        var numIdle = 0;
        for(var h=0; h < games.length; h++){
            if(games[h].initiator.socketId === socket.id){
                socket.emit("gameAmountOverflow");
                return
            }
        }
        if(selectedPlayers != null && selectedPlayers.length > 0){
            for(var i=0; i<selectedPlayers.length; i++){
                for(var j=0; j < players.length; j++){
                    if(selectedPlayers[i] === players[j].socketId){
                        if(players[j].idle){
                            numIdle++;
                            involvedPlayers.push(players[j]);
                            if(numIdle == selectedPlayers.length){
                                requestSent = true;
                            }
                        } else {
                            socket.emit('playerBusy', players[j]);
                            requestSent = false;
                            break
                        }
                    }
                }
            }
            if(requestSent){
                for(var k=0; k < players.length; k++){
                    if(socket.id === players[k].socketId){
                        players[k].idle = false;
                        involvedPlayers.push(players[k]);
                        involvedPlayers[involvedPlayers.length - 1].readyToEnter = true;
                        games.push(new Game(involvedPlayers, players[k], nextGameId));
                        console.log(games);
                        socket.emit('waitForResponse', games[games.length - 1]);
                        if(nextGameId < Math.pow(2,32) - 2){
                            nextGameId++;
                        } else {
                            nextGameId = 0;
                        }
                        //addGame(involvedPlayers,players[k]);
                    }
                    for(i = 0; i < selectedPlayers.length; i++){
                        if(players[k].socketId === selectedPlayers[i]){
                            io.sockets.socket(players[k].socketId).emit("promptEnterGame", socket.id);
                            players[k].idle = false;
                        }
                    } 
                }
            }
        }
    });
    
    socket.on('playerDenied', function(id) {
        abort(id, socket.id);
    });

    socket.on('confirmEnterGame', function(){
        var currentGame = null,
            numReadyToEnter = 0;
        for(var i=0; i < games.length; i++){
            for(var j=0; j < games[i].players.length; j++){
                if(games[i].players[j].socketId === socket.id){
                    games[i].players[j].readyToEnter = true;
                    currentGame = games[i];
                    break
                }
            }
        }
        for (var k = 0; k < currentGame.players.length; k++) {
            if(currentGame.players[k].readyToEnter){
                numReadyToEnter++;
                console.log("numReadyToEnter: " + numReadyToEnter + ", length: " + currentGame.players.length);
            }
            currentGame.players[k].color = currentGame.colors[k];
        }

        //After all colors have been set, send game to clients with enterGame event
        for (k = 0; k < currentGame.players.length; k++) {
            if(numReadyToEnter == currentGame.players.length){
                io.sockets.socket(currentGame.players[k].socketId).emit("enterGame",currentGame);
            }
        }
        if(numReadyToEnter == currentGame.players.length){
            for(i = 0; i < games.length; i++){
                if(currentGame.id == games[i].id){
                    games[i].entered = true;
                    games[i] = currentGame;
                }
            }
        }
        if(!(numReadyToEnter == currentGame.players.length)){
            socket.emit('waitForResponse', currentGame);
        }
    });

});


