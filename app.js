//Load node modules
var express = require("express");
var app = express();
var $ = require('jquery');
var port = 3700;
var database = require("./mysql.js");
var io = require('socket.io').listen(app.listen(port));


//set public folder for holding resources
app.use(express.static(__dirname + '/public'));
//set server to respond with layout.html if only / is in URL
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/layout.html')
});
//connect to database
database.connect();

//disable native socket.io loggings, to avoid console spam
io.set('log level', 0);
/*datastructure for Player object
 *@param {x: int, y: int} pos
 *@param string color
 *@param string socketId
 *@param string username
 */
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
/*Datastructure for game object
 *@param Array<Player> gameplayers
 *@param Player initiator
 *@param int id
 */
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
var players = {},
    games = {},
    colors = ['red','blue','yellow','green'],
    categories = ['historie', 'dansk', 'engelsk', 'naturteknik'],
    idHasTurn = 0,
    gameSize = 4,
    nextGameId = 0;

/*function for shuffling the options in the question object
 *@param Array array
 */
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

/*Will cause all players in a game with the initator to go back to idle screen. There should only be one game with this initiator.
 *@param string initiatorId
 *@param string socketid
 *@param Game game
 */
function abort(initiatorId, socketid, game){
    //array to hold players that need to be informed
    var currentGame;    
    //find game
    currentGame = games[game.id];
    if(typeof currentGame != 'undefined'){
        //check if game is already entered
        if(!currentGame.entered){
            //send abortGame event to all players in this game
            for(var j=0; j < currentGame.players.length; j++){
                console.log("Emitted: abortGame");
                io.sockets.socket(currentGame.players[j].socketId).emit("abortGame", socketid);
                players[currentGame.players[j].socketId].idle = true;
            }
            //remove game from games array
            delete games[game.id];
        }
    }
}

/*function for assigning categories to the game board
 *@param Game game
 */
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

/*function to check if the move requested by a player is legal
 *@param {x: int, y: int} coords
 *@param Player player
 */
function checkLegalMove(coords, player){
    //if the coords represent an adjecent field, return true
    if(((coords.x - player.position.x == 1 || player.position.x - coords.x == 1) && (coords.y - player.position.y == 1 || player.position.y - coords.y == 1)) || (coords.x - player.position.x == 0 && (coords.y - player.position.y == 1 || player.position.y - coords.y == 1)) || ((coords.x - player.position.x == 1 || player.position.x - coords.x == 1) && (coords.y - player.position.y == 0) ) ) {
        return true;
    } else {
        return false;
    }
}

/*function to reset player positions to each corner of the board. Only works with 4 or less players
 *@param Array<Player> actPlayers
 *@param int boardSize
 */
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

    /*emitted by a  client when they establish connection to the server
     *@param {playerName: string} data
     */
    socket.on('newPlayer', function(data){
        console.log("Event: NewPlayer");
        //add player to players array
        var player = new Player({x: 0, y: 0}, 'red', socket.id, data.playerName);
        players[socket.id] = player;
        //inform other players of new player
        console.log("Emitted: newPlayer");
        socket.broadcast.emit('newPlayer',players);
        // inform new player of the current server state
        console.log("Emitted: init");
        socket.emit('init', players);
    });

    /*Event called by client when they request a question from the server
     *@param Game game
     */
    socket.on('question', function(game){
        var questionCategory,
            currentGame,
            player;
        console.log("Event: question");
        //find game and player to get the position, and set questionCategory with the corresponding category

        currentGame = games[game.id]
        if(typeof currentGame != 'undefined'){
            for(var j = 0; j < currentGame.players.length; j++){
                if(currentGame.players[j].socketId === socket.id){
                    player = currentGame.players[j];
                    questionCategory = currentGame.categoriesArr[player.position.x][player.position.y];
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
            console.log("Emitted: questionResponse");
            socket.emit('questionResponse', question);
            });
        }
    });
    
    /*Event called when cleints press start game. Argument is an object
     *@param {game: Game, gameType: string} data
     */
    socket.on('startGame', function(data) {
        var gameType = '',
            currentGame;
        console.log("Event: Start Game");

        //reset position and status for all players in game
        //Inform clients that the startGame button has been pressed, and set the initiator to have the first turn

        currentGame = games[data.game.id];
        if(typeof currentGame != 'undefined'){
            currentGame.gameType = data.gameType;
            for(var j = 0; j < currentGame.players.length; j++){
                currentGame.players = resetToBasePos(currentGame.players, currentGame.boardSize);
                currentGame.players[j].winner = false;
                currentGame.players[j].ready = false;
                console.log("Emitted: gameStarted");
                io.sockets.socket(currentGame.players[j].socketId).emit('gameStarted', currentGame, currentGame.gameType);
                if(socket.id === currentGame.players[j].socketId){
                    currentGame.idHasTurn = currentGame.players[j].socketId;
                }
            }

            games[data.game.id] = currentGame;
        }
    });
    
    /*clients emit ready, when they are ready to start the game
     *@param Game game
     */
    socket.on('ready', function(game){
        console.log("Event: ready");

        var playersReady = 0,
            currentGame = null;
        //find game, set caller as ready and count ready players
        
        currentGame = games[game.id];
        if(typeof currentGame != 'undefined'){        
            for(var j = 0; j < currentGame.players.length; j++){
                if(currentGame.players[j].socketId == socket.id){
                    currentGame.players[j].ready = true;
                    playersReady++;
                } else if(currentGame.players[j].ready){
                    playersReady++;
                }
            }

            // if all players are ready, tell the correct player to start turn
            if(currentGame != null && playersReady >= currentGame.players.length && currentGame.gameType == 'turnBased'){
                for (i = 0; i < currentGame.players.length; i++) {
                    if(currentGame.players[i].socketId == currentGame.idHasTurn){
                        console.log("Emitted: startTurn");
                        io.sockets.socket(currentGame.players[i].socketId).emit('startTurn');
                    }
                }
            }

            games[game.id] = currentGame;
        }
    });
    
    /*event called when a player/client disconnects. Native in socket.io
     *
     */
    socket.on('disconnect', function(){
        var currentGame = null;
        console.log("Event: Disconnect");

        //remove player form players array
        delete players[socket.id];
        //handling games where players are prompting other players to join and games in progress
        //check if there is a game with the disconnecting player
        for (var id in games) {
            currentGame = games[id];
            for(var k = 0; k < currentGame.players.length; k++){
                if(currentGame.players[k].socketId === socket.id){
                    //if game hasn't started yet, cancel the game completely
                    if(!currentGame.entered) {
                        abort(currentGame.initiator.socketId, socket.id, currentGame);
                        break
                    } else {
                        if(currentGame.players.length > 2) {
                            //If the disconnecting player has the turn, pass it on to the next
                            if(currentGame.idHasTurn === currentGame.players[k].socketId && currentGame.gameType === 'turnBased'){
                                console.log("Emitted: startTurn");
                                currentGame.idHasTurn = currentGame.players[(k+1)%currentGame.players.length].socketId;
                                io.sockets.socket(currentGame.players[(k+1)%currentGame.players.length].socketId).emit('startTurn');
                            }
                        } else
                        //If there is only 1 player left, declare this one the winner
                        {
                            currentGame.players[(k+1)%currentGame.players.length].winner = true;
                            console.log("Emitted: playerWon");
                            io.sockets.socket(currentGame.players[(k+1)%currentGame.players.length].socketId).emit('playerWon');
                        }
                        //else just remove the player
                        currentGame.players.splice(k,1);
                        //if game is empty, delete the game
                        if(currentGame.players.length == 0){
                            delete games[id];
                        } else {
                            games[id] = currentGame;
                        }
                        break
                    }
                }
            }
        }
        //inform all other players of the changes in status
        console.log("Emitted: playerDisconnected");
        socket.broadcast.emit('playerDisconnected', players, currentGame);
    });
    
    /*called when a player's turn ends
     *@param Game game
     */
    socket.on('turnEnded', function(game) {
        console.log("Event: Turn Ended");
        var currentGame = null;
        //find the player's game
        currentGame = games[game.id]
        if(typeof currentGame != 'undefined'){
            //if the gametype is turnbased pass on the turn and set idHasTurn
            if(currentGame.gameType == "turnBased"){
                for (i = 0; i < currentGame.players.length; i++) {
                    if (currentGame.players[i].socketId === socket.id) {
                        if(!currentGame.players[i].winner){
                            console.log("Emitted: startTurn");
                            io.sockets.socket(currentGame.players[(i+1)%currentGame.players.length].socketId).emit('startTurn');
                            currentGame.idHasTurn = currentGame.players[(i+1)%currentGame.players.length].socketId;
                        }
                    }
                }
            }
            //save game in games object
            games[game.id] = currentGame;
        }
    });

    /*triggered once a player enters the lobby.
     *
     */
    socket.on('queryPlayerList', function(){
       console.log("Event: QueryPlayerList");
       console.log("Emitted: playerList");
       //give the player the players object
       socket.emit('playerList', players);
    });

    /*triggered when a player has clicks the enter game butten
     *argument is the players selected from an options element
     *@param Array<string> selectedPlayers
     */
    socket.on('requestEnterGame',function(selectedPlayers){
        var requestSent = false;
        var involvedPlayers = [];
        var numIdle = 0;
        console.log("Event: RequestEnterGame");
        //check if the player is already in a game
        for(gid in games){
            for(var k = 0; k < games[gid].players.length; k++){
                //emit gameoverflow and return
                if(games[gid].players[k].socketId === socket.id){
                    console.log("Emitted: gameAmountOverflow");
                    socket.emit("gameAmountOverflow");
                    return
                }
            }
        }
        //check of selected players has the allowed size
        if(selectedPlayers != null && selectedPlayers.length > 0 && selectedPlayers.length <= gameSize - 1){
            //check if all selected players are idle
            for(var i=0; i<selectedPlayers.length; i++){
                if(players[selectedPlayers[i]].idle){
                    //and count idle players and add them to involvedPlayers
                    numIdle++;
                    involvedPlayers.push(players[selectedPlayers[i]]);
                    if(numIdle == selectedPlayers.length){
                        //if all players are idle a request will be sent
                        requestSent = true;
                    }
                } else {
                    //if 1 or more player is not idle, emit who is busy and request will not be sent
                    console.log("Emitted: playerBusy");
                    socket.emit('playerBusy', players[selectedPlayers[i]]);
                    requestSent = false;
                    break
                }
            }
            if(requestSent){
                //set the initiator as busy and ready to enter.
                players[socket.id].idle = false;
                involvedPlayers.push(players[socket.id]);
                involvedPlayers[involvedPlayers.length - 1].readyToEnter = true;
                //create new game
                games["id" + nextGameId] = new Game(involvedPlayers, players[socket.id], "id" + nextGameId);
                var thisgame = games["id" + nextGameId];
                console.log("Emitted: waitForResponse");
                //tell initator to wait for response
                socket.emit('waitForResponse', thisgame);
                //find next game id
                if(nextGameId < Math.pow(2,32) - 2){
                    nextGameId++;
                } else {
                    nextGameId = 0;
                }
                //send the prompt to all invited players and set them as busy
                for(i = 0; i < selectedPlayers.length; i++){
                    console.log("Emitted: promptEnterGame");
                    io.sockets.socket(players[selectedPlayers[i]].socketId).emit("promptEnterGame", socket.id, thisgame);
                    players[selectedPlayers[i]].idle = false;
                }
            }
        } else if(selectedPlayers.length > gameSize - 1) {
            console.log("Emitted: tooManyPlayers");
            socket.emit("tooManyPlayers");
        }
    });
    
    /*event triggered when a player clicks 'abort' or 'no' on a prompt
     *@param string id
     *@param Game game
     */
    socket.on('playerDenied', function(id, game) {
        console.log("Event: PlayerDenied");
        abort(id, socket.id, games[game.id]);
    });

    /*event called when a player clicks 'yes' in enterGame prompt
     *@param Game game
     */
    socket.on('confirmEnterGame', function(game){
        var currentGame = null,
            numReadyToEnter = 0;
        console.log("Event: confirmEnterGame");
        //find game
        currentGame = games[game.id]
        if(typeof currentGame != 'undefined'){

            for(var j=0; j < currentGame.players.length; j++){
                if(currentGame.players[j].socketId === socket.id){
                    //set emitting player as ready to enter
                    currentGame.players[j].readyToEnter = true;
                    break
                }
            }

            for (var k = 0; k < currentGame.players.length; k++) {
                if(currentGame.players[k].readyToEnter){
                    //count number of players ready to enter
                    numReadyToEnter++;
                }
                //set colors
                currentGame.players[k].color = currentGame.colors[k];
            }

            //if all players are ready
            if(numReadyToEnter == currentGame.players.length){
                //init categories array
                setCategoriesArr(currentGame);
                //reset all player positions
                currentGame.players = resetToBasePos(currentGame.players, currentGame.boardSize);
                //tell all players to enter the game
                for (k = 0; k < currentGame.players.length; k++) {
                    console.log("Emitted: enterGame");
                    io.sockets.socket(currentGame.players[k].socketId).emit("enterGame",currentGame, currentGame.players[k]);                
                }
                //gamestate is not entered
                currentGame.entered = true;
            } else {
                //wait for rest of the invited players to answer
                console.log("Emitted: waitForResponse");
                socket.emit('waitForResponse', currentGame);
            }
            //save game object
            games[game.id] = currentGame;
        }
    });

    /*
    *called when the player clicks the board once it has answered a question correctly
    *@param {x: int, y: int} coords
    *@param Game game
    */
    socket.on('requestMove',function(coords, game) {
        console.log('Event: requestMove');
        var movement = false,
            curentGame = null,
            winningMove = false;
        //find game
        currentGame = games[game.id];
        if(typeof currentGame != 'undefined'){
        //check if the emitting player has the turn, or of gametype is race
            if(socket.id === currentGame.idHasTurn || currentGame.gameType === 'race'){
                for(var j = 0; j < currentGame.players.length; j++){
                    if(currentGame.players[j].socketId === socket.id){
                        if(checkLegalMove(coords, currentGame.players[j])){
                            //if the move is legal then set new player position
                            currentGame.players[j].position = coords;
                            movement = true;
                            if(coords.x == (currentGame.boardSize-1)/2 && coords.y == (currentGame.boardSize-1)/2){
                                //if player has reached the center of the board it is a winning move.
                                winningMove = true;
                                currentGame.players[j].winner = true;
                            }
                        } else {
                            //inform player of illegal move
                            console.log("Emitted: illegalMove");
                            socket.emit('illegalMove');
                        }
                    }
                }
                if(movement){
                    for(j = 0; j < currentGame.players.length; j++){
                        //inform all players in game of the new game state
                        console.log("Emitted: playerMoved");
                        io.sockets.socket(currentGame.players[j].socketId).emit('playerMoved', currentGame, socket.id);
                        if(winningMove){
                            //if winning move all other players have lost
                            if(currentGame.players[j].socketId != socket.id){
                                console.log("Emitted: playerLost");
                                io.sockets.socket(currentGame.players[j].socketId).emit('playerLost');
                            } else {
                                //and the emitting player has won
                                currentGame.players[(j+1)%currentGame.players.length].winner = true;
                                console.log("Emitted: playerWon");
                                socket.emit('playerWon');
                            }
                        }
                    }
                }
            }
            //Save game
            games[game.id] = currentGame;
        }

    });

});


