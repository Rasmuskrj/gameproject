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

function Game(gameplayers, initiator){
    //TODO create game identifier, and use this to find games. Also tie identifier to client object in a many to many relation
    this.players = gameplayers;
    this.entered = false;
    this.started = false;
    this.initiator = initiator
}
var players = [],
    games = [],
    colors = ['red','blue','yellow','green'],
    gameType = "turnBased",
    idHasTurn = 0,
    colorPointer = 0;

function addPlayer(pos, identifier, color, socketId, username) {
    var adder = new Player(pos, identifier, color, socketId, username);
    players.push(adder);
}

function addGame(gameplayers, initiator){
    var adder = new Game(gameplayers, initiator);
    games.push(adder);
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

io.sockets.on('connection', function(socket){
    socket.on('newPlayer', function(data){
       addPlayer(0,players.length, colors[colorPointer++],socket.id, data.playerName);
       socket.broadcast.emit('newPlayer',players);
       socket.emit('init', players);
       console.log("player joined");
    });

    socket.on('playerMoved', function(data){
        for(var i=0;i<players.length;i++){
            if(players[i].socketId==socket.id){
                players[i].position = (players[i].position + 1)%8;
                if(players[i].position == 0){
                    players[i].winner = true;
                    socket.emit('playerWon');
                    socket.broadcast.emit('playerLost');
                }
            }
        }
        socket.broadcast.emit('playerMoved',players);
        socket.emit('playerMoved',players);

    });

    socket.on('question', function(data){
       getQuestion(function(question){
           socket.emit('questionResponse', question);
       });
    });

    socket.on('startGame', function(data) {
        gameType = data.gameType;
        for(i = 0; i < players.length; i++){
            players[i].position = 0;
            players[i].winner = false;
            players[i].ready = false;
        }
        io.sockets.emit('gameStarted',players, gameType);
        console.log("game Started");
        for (var i = 0; i < players.length; i++) {
            if (socket.id === players[i].socketId) {
                idHasTurn = players[i].socketId;
            }
        }

    });

    socket.on('ready', function(data){
        playersReady = 0;
        for (var i = 0; i < players.length; i++) {
            if(players[i].socketId == socket.id){
                players[i].ready = true;
            }
        }
        for (var j = 0; j < players.length; j++) {
            if(players[j].ready){
                playersReady++;
            }
        }
        if(playersReady >= players.length && gameType == 'turnBased'){
            for (i = 0; i < players.length; i++) {
                if(players[i].socketId == idHasTurn){
                    io.sockets.socket(players[i].socketId).emit('startTurn');
                }
            }
        }
    });

    socket.on('disconnect', function(){
        for(var i = 0; i < players.length; i++){
            if(players[i].socketId == socket.id){
                colors.push(players[i].color);
                players.splice(i,1);
            }
        }
        socket.broadcast.emit('playerDisconnected', players);
    });

    socket.on('turnEnded', function(data) {
        console.log("Player " + data.player + " ended turn");
        if(gameType == "turnBased"){
            for (var i = 0; i < players.length; i++) {
                if (players[i].socketId === socket.id) {
                    console.log("Asked player " + (i+1)%players.length + " to start turn");
                    if(!players[i].winner){
                        io.sockets.socket(players[(i+1)%players.length].socketId).emit('startTurn');
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
                            socket.emit('waitForResponse');
                            io.sockets.socket(players[j].socketId).emit("promptEnterGame", socket.id);
                            requestSent = true;
                            involvedPlayers.push(players[j]);
                        } else {
                            socket.emit('playerBusy', players[j]);
                            requestSent = false;
                        }
                    }
                }
            }
            for(var k=0; k < players.length; k++){
                if(socket.id === players[k].socketId && requestSent){
                    players[k].idle = false;
                    involvedPlayers.push(players[k]);
                    addGame(involvedPlayers,players[k]);
                }
            }
        }
    });

    socket.on('playerDenied', function(initiatorId){
        for(var i=0; i < games.length; i++){
            if(games[i].initiator.socketId === initiatorId){
                for(var j=0; j < games[i].players.length; j++){
                    console.log("someone pressed no");
                    io.sockets.socket(games[i].players[j].socketId).emit("abortGame");
                }
                games.splice(i,1);
                console.log(games);
            }
        }
        for(var k=0; k < players.length; k++){
            if(initiatorId === players[k].socketId){
                players[k].idle = true;
            }
        }
    });

    socket.on('confirmEnterGame', function(){
        var currentGame = null;
        for(var i=0; i < games.length; i++){
            for(var j=0; j < games[i].players.length; j++){
                if(games[i].players[j].socketId === socket.id){
                    currentGame = games[i];
                }
            }
        }
    });

});


