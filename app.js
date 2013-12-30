//Load node modules
var express = require("express");
var app = express();
var $ = require('jquery');
var port = 3700;
var database = require("./mysql.js");
var io = require('socket.io').listen(app.listen(port));


//set public folder for holding resources
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/layout.html')
});
//connect to database
database.connect();

//disable native socket.io loggings, to avoid console spam
io.set('log level', 0);

//datastructure for Player object
function Player(pos, color, socketId, username){
    this.position = pos;
    this.color = color;
    this.socketId = socketId;
    this.winner = false;
    this.ready = false;
    this.idle = true;
    this.waitingToEnter = false;
    this.readyToEnter = false;
    this.username = username;
}
//Datastructure for game object
function Game(gameplayers, initiator, id){
    this.players = gameplayers;
    this.entered = false;
    this.started = false;
    this.initiator = initiator;
    this.id = id;
    this.colors = ['pink','teal','orange','darkgreen'];
    this.gameType = 'turnBased';
    this.idHasTurn = '';
    this.categoriesArr = [];
    this.boardSize = 11;
}

//server global variables
var players = [],
    games = [],
    colors = ['red','blue','yellow','green'],
    categories = ['historie', 'dansk', 'engelsk', 'naturteknik'],
    idHasTurn = 0,
    nextGameId = 0;

//function for shuffling the options in the question object
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
    //array to hold players that need to be informed
    var involvedPlayers = [];
    //find initiators game
    for(var i=0; i < games.length; i++){
        if(games[i].initiator.socketId === initiatorId){
            //send abortGame event to all players in this game
            for(var j=0; j < games[i].players.length; j++){
                console.log("someone pressed no");
                io.sockets.socket(games[i].players[j].socketId).emit("abortGame", socketid);
                involvedPlayers.push(games[i].players[j]);
            }
            //remove game from games array
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
        }
    }
}

//function for assigning categories to the game board
function setCategoriesArr(game){
    var index;
    for(var i = 0; i < game.boardSize; i++){
        //create second dimension of categoriesArr
        game.categoriesArr[i] = [];
        //iterate through and set category to a randomly chosen one from categories array
        for(var j = 0; j < game.boardSize; j++){
            index = Math.floor(Math.random() * categories.length);
            game.categoriesArr[i][j] = categories[index];
            //set center field to end field
            if(j == (game.boardSize - 1)/2 && i == (game.boardSize - 1)/2) {
                game.categoriesArr[i][j] = 'endField';
            }
        }
    }
}

//function to check if the move requested by a player is legal
function checkLegalMove(coords, player){
    //if the coords represent an adjecent field, return true
    if(((coords.x - player.position.x == 1 || player.position.x - coords.x == 1) && (coords.y - player.position.y == 1 || player.position.y - coords.y == 1)) || (coords.x - player.position.x == 0 && (coords.y - player.position.y == 1 || player.position.y - coords.y == 1)) || ((coords.x - player.position.x == 1 || player.position.x - coords.x == 1) && (coords.y - player.position.y == 0) ) ) {
        return true;
    } else {
        return false;
    }
}

//function to reset player positions to each corner of the board. Only works with 4 or less players
function resetToBasePos(actPlayers, boardSize){
     for(k = 0; k < actPlayers.length; k++){
                switch(k){
                    case 0:
                        actPlayers[k].position = {x: 0, y: 0};
                        break;
                    case 1:
                        actPlayers[k].position = {x: 0,y: boardSize - 1};
                        break;
                    case 2:
                        actPlayers[k].position = {x: boardSize - 1, y: 0};
                        break;
                    case 3:
                        actPlayers[k].position = {x: boardSize - 1, y: boardSize - 1};
                }
            }
    return actPlayers;
}

//
io.sockets.on('connection', function(socket){

    //emitted by a  client when they establish connection to the server
    socket.on('newPlayer', function(data){
        //add player to players array
        var player = new Player({x: 0, y: 0}, 'red', socket.id, data.playerName);
        players.push(player);
        //inform other players of new player
       socket.broadcast.emit('newPlayer',players);
       // inform new player of the current server state
       socket.emit('init', players);
       console.log("player joined");
    });

    //Event called by client when they request a question from the server
    socket.on('question', function(game){
        var questionCategory,
            player;
        //find game and player to get the position, and set questionCategory with the corresponding category
        for(var i = 0; i < games.length; i++){
            if(games[i].id == game.id){
                for(var j = 0; j < games[i].players.length; j++){
                    if(games[i].players[j].socketId === socket.id){
                        player = games[i].players[j];
                        console.log(player.username);
                        questionCategory = games[i].categoriesArr[player.position.x][player.position.y];
                    }
                }
                break;
            }
        }
        //call database module and provide anonymous function as callback. questionObj provided by database module
        database.getQuestion(questionCategory ,function(questionObj){
        //init question
        var question = {
            title: questionObj.subcategory,
            question: questionObj.question,
            options: []
        }
        //provide answer as option is set correctness
        var answers = questionObj.answer.split(",");
        for(var i = 0; i < answers.length; i++){
            question.options.push({label : answers[i], correct : true});
        }
        //rest of options are wrong answers, also from the database
        var posibles = questionObj.possibilities.split(",");
        for(i = 0; i < posibles.length; i++){
            question.options.push({label : posibles[i], correct : false});
        }
        //shuffle the order
        shuffle(question.options);
        //emit to client
        socket.emit('questionResponse', question);
        });
    });
    
    //Event called when cleints press start game. Argument is an object
    socket.on('startGame', function(data) {
        var gameType = '';
        console.log("Event: Start Game");

        gameType = data.game.gameType;
        //reset position and status for all players in game
        for(var i = 0; i < games.length; i++){
            if(games[i].id == data.game.id){
                games[i].gameType = data.gameType;
                for(var j = 0; j < games[i].players.length; j++){
                    games[i].players = resetToBasePos(games[i].players, games[i].boardSize);
                    games[i].players[j].winner = false;
                    games[i].players[j].ready = false;
                }
                break
            }
        }
        //Inform clients that the startGame button has been pressed, and set the initiator to have the first turn
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
    
    //clients emit ready, when they are ready to start the game
    socket.on('ready', function(game){
        console.log("Event: ready");

        var playersReady = 0,
            currentGame = null;
        //find game, set caller as ready and count ready players
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
        // if all players are ready, tell the correct player to start turn
        if(currentGame != null && playersReady >= currentGame.players.length && currentGame.gameType == 'turnBased'){
            for (i = 0; i < currentGame.players.length; i++) {
                if(currentGame.players[i].socketId == currentGame.idHasTurn){
                    io.sockets.socket(currentGame.players[i].socketId).emit('startTurn');
                }
            }
        }
    });
    
    //event called when a player/client disconnects. Native in socket.io
    socket.on('disconnect', function(){
        var currentGame = null;
        //remove player form players array
        for(var i = 0; i < players.length; i++){
            if(players[i].socketId == socket.id){
                colors.push(players[i].color);
                players.splice(i,1);
            }
        }
        //handling games where players are prompting other players to join and games in progress
        //check if there is a game with the disconnecting player
        for (var j = 0; j < games.length; j++) {
            for(var k = 0; k < games[j].players.length; k++){
                console.log(games[j].initiator.username);
                if(games[j].players[k].socketId === socket.id){
                    //if game hasn't started yet, cancel the game completely
                    if(!games[j].entered) {
                        abort(games[j].initiator.socketId);
                        break
                    } else {
                        //else just remove the player
                        games[j].players.splice(k,1);
                        currentGame = games[j];
                        //if game is empty, delete the game
                        if(games[j].players.length == 0){
                            games.splice(j,1);
                        }
                        break
                    }
                }
            }
        }
        //inform all other players of the changes in status
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


        if(numReadyToEnter == currentGame.players.length){
            setCategoriesArr(currentGame);
            currentGame.players = resetToBasePos(currentGame.players, currentGame.boardSize);
            for (k = 0; k < currentGame.players.length; k++) {
                io.sockets.socket(currentGame.players[k].socketId).emit("enterGame",currentGame, currentGame.players[k]);                
            }
            for(i = 0; i < games.length; i++){
                if(currentGame.id == games[i].id){
                    games[i].entered = true;
                    games[i] = currentGame;
                }
            }

        } else {
            socket.emit('waitForResponse', currentGame);
        }
    });

/*
*
* parameters: {x: int, y: int}, game
*/
socket.on('requestMove',function(coords, game) {
    console.log('Event: requestMove');
    var movement = false,
        winningMove = false;
    for (var i = 0; i < games.length; i++) {
        if(games[i].id == game.id){
            for(var j = 0; j < games[i].players.length; j++){
                if(games[i].players[j].socketId === socket.id){
                    if(checkLegalMove(coords, games[i].players[j])){
                        games[i].players[j].position = coords;
                        movement = true;
                        if(coords.x == (games[i].boardSize-1)/2 && coords.y == (games[i].boardSize-1)/2){
                            winningMove = true;
                            games[i].players[j].winner = true;
                        }
                    } else {
                        console.log("Emitted: illegalMove")
                        socket.emit('illegalMove');
                    }
                }
            }
            if(movement){
                for(j = 0; j < games[i].players.length; j++){
                    io.sockets.socket(games[i].players[j].socketId).emit('playerMoved', games[i], socket.id);
                    if(winningMove){
                        if(games[i].players[j].socketId != socket.id){
                            io.sockets.socket(games[i].players[j].socketId).emit('playerLost');
                        } else {
                            socket.emit('playerWon');
                        }
                    }
                }
            }
        }
        break;
    }
});

});


