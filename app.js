var express = require("express");
var app = express();
var $ = require('jquery');
var port = 3700;

app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res) {
    res.render("home");
});

app.use(express.static(__dirname + '/public'));
var io = require('socket.io').listen(app.listen(port));
io.set('log level', 0);
function Player(pos, identifier, color, socketId){
    this.position = pos;
    this.color = color;
    this.id = identifier;
    this.socketId = socketId;
    this.winner = false;
}
var players = [],
    colors = ['red','blue','yellow','green'],
    idHasTurn = 0;
    colorPointer = 0;

function addPlayer(pos, identifier, color, socketId) {
    var adder = new Player(pos, identifier, color, socketId);
    players.push(adder);
}

function getQuestion(){

    var question = {
        title: 'World War II',
        question: 'Which year did World War II start?',
        answers: {
            first: {
                label: '1938',
                correct: false
            },
            second: {
                label: '1939',
                correct: true
            },
            third: {
                label: '1940',
                correct: false
            }
        }
    };
    return question;
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
            if(players[i].id==data.player){
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
        var question = getQuestion();
        socket.emit('questionResponse', question);
    });

    socket.on('startGame', function(data) {
        for(i = 0; i < players.length; i++){
            players[i].position = 0;
            players[i].winner = false;
        }
        io.sockets.emit('gameStarted',players);
        console.log("game Started");
        for (var i = 0; i < players.length; i++) {
            if (data.player === players[i].id) {
                idHasTurn = players[i].id;
            };
        };

    });

    socket.on('ready', function(data){
       if(data.player == idHasTurn){
           socket.emit("startTurn");
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
        for (var i = 0; i < players.length; i++) {
            if (players[i].id === data.player) {
                console.log("Asked player " + (i+1)%players.length + " to start turn");
                if(!players[i].winner){
                    io.sockets.socket(players[(i+1)%players.length].socketId).emit('startTurn');
                }
            };
        };
    });
});
