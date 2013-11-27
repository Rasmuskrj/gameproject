var express = require("express");
var app = express();
var $ = require('jquery');
var port = 3700;

var database = require("./mysql.js");

app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res) {
    res.render("home");
});

app.use(express.static(__dirname + '/public'));
database.connect();
var io = require('socket.io').listen(app.listen(port));
io.set('log level', 0);
function Player(pos, identifier, color, socketId){
    this.position = pos;
    this.color = color;
    this.id = identifier;
    this.socketId = socketId;
    this.winner = false;
    this.ready = false;
}
var players = [],
    colors = ['red','blue','yellow','green'],
    gameType = "turnBased",
    idHasTurn = 0,
    colorPointer = 0;

function addPlayer(pos, identifier, color, socketId) {
    var adder = new Player(pos, identifier, color, socketId);
    players.push(adder);
}

function getQuestion(callback){
    database.getQuestion('historie',function(questionObj){
        console.log(questionObj);
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
        console.log(posibles);
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
       addPlayer(0,players.length, colors[colorPointer++],socket.id);
       socket.broadcast.emit('newPlayer',players);
       socket.emit('init', players);
       console.log("player joined");
       console.log(players);
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
        console.log(players);
    })

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
    })
});


