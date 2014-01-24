/**
 * Object to hold the Board
 * @param Array<string> categoriesArr 
 * @param GameSession newGameSession
 */
function Board(categoriesArr, newGameSession){
    //init
    var canvas = $('#board'),
        ctx = canvas[0].getContext("2d"),
        midx = canvas.width() / 2,
        midy = canvas.height() / 2,
        rectWidth = 550,
        rectHeight = 550,
        fieldSize = 50,
        myCategoriesArr = categoriesArr,
        colorCategoryRelations = {
            'historie' : 'red',
            'dansk' : 'green',
            'engelsk' : 'yellow',
            'naturteknik' : 'blue',
            'endField'  : 'black'
        },
        gameStarted = false,
        movementPoints = 0;
        currentMessage = '';
        gameSession = newGameSession;
        boardPoints = [];
    //public functions
    this.drawBoard = function() {
        //clear canvas
        ctx.clearRect(0,0,canvas[0].width,canvas[0].height);
        //draw board border
        this.drawRect(midx,midy, rectWidth, rectHeight, 'white', 'black', 6);
        //draw a sqaure for each category with the matching color
        for (var i = 0; i < myCategoriesArr.length; i++) {
            for(var j = 0; j < myCategoriesArr[i].length; j++){
                this.drawRect(midx - (rectWidth/2) + fieldSize * i + (fieldSize/2), midy - (rectHeight/2) + fieldSize * j + (fieldSize/2), fieldSize, fieldSize, colorCategoryRelations[myCategoriesArr[i][j]], 'black', 1)
            }
        }
        //define write message on canvas
        ctx.font = "28px Arial";
        ctx.strokeStyle = 'black';
        ctx.strokeText(currentMessage,midx,midy - rectHeight/2 - 100);
    }

    /*helper functions to draw rectangles
     *@param int centerX
     *@param int centerY
     *@param int widht
     *@param int height
     *@param string fill
     *@param string stroke
     *@param int linewidth
     */
    this.drawRect = function(centerX,centerY,width,height,fill,stroke, lineWidth){
        ctx.beginPath();
        ctx.rect(centerX-(width/2),centerY-(height/2),width,height);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();

    }

    /*helper function to draw a line
     *@param int fromX
     *@param int fromY
     *@param int toX
     *@param int toY
     *@param int lineWidth
     */
    this.drawLine = function(fromX,fromY, toX,toY, lineWidth){
        ctx.lineWidth = lineWidth;
        ctx.moveTo(fromX,fromY);
        ctx.lineTo(toX,toY);
        ctx.stroke();
    }

    /*allow gameStarted var to be set
     *@param string state
     */
    this.setGameStarted = function(state){
        gameStarted = state;
    }

    /*
     *returns the boardpoints array
     */
    this.getBoardPointsArr = function(){
        return boardPoints;
    }

    /*helper function to draw a boardpiece at a position with a given color
     *@param {x: int, y: int} atPos
     *@param string color
     */
    this.drawBoardPiece = function(atPos, color){
        var baseX = boardPoints[atPos.x][atPos.y].x,
            baseY = boardPoints[atPos.x][atPos.y].y,
            pieceSideWidth = 15,
            pieceBottomWidth = 10,
            pieceSeperationLength = 50;

        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(baseX-pieceBottomWidth,baseY+pieceSideWidth);
        ctx.lineTo(baseX, baseY-pieceSideWidth);
        ctx.lineTo(baseX+pieceBottomWidth,baseY+pieceSideWidth);
        ctx.lineTo(baseX-pieceBottomWidth,baseY+pieceSideWidth);
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    /*
     *returns the boardpoints array
     */
    this.clearboard = function() {
        ctx.clearRect(0,0,canvas[0].width,canvas[0].height);
    }

    /*
     *Adds movement points
     */
    this.addMovementPoint = function() {
        movementPoints++;
    }

    /*
     *removes all movement points
     */
    this.removeMovementPoint = function() {
        movementPoints = 0;
    }

    /*returns the movementPoints
     */
    this.getMovementPoint = function(){
        return movementPoints;
    }

    /*
     *sets the board message
     *@param string message
     */
    this.setMessage = function(message){
        currentMessage = message;
    }

    /*gives the mouse position on the canvas
     *@param Canvas canvas
     *@param MouseEvent event
     */
    function getMousePos(canvas, event){
        var rect = canvas[0].getBoundingClientRect();
        return {x: event.clientX - rect.left, y: event.clientY - rect.top};
    }

    /*
     *@param {x: int, y: int} mousePos
     */
    function checkMousePos(mousePos){
        var returnObj = {x: -1, y: -1}
        //check all boardpoints to find out which best match the mouse position
        for (var i = 0; i < boardPoints.length; i++) {
            for(var j = 0; j < boardPoints[i].length; j++){
                if(mousePos.x > boardPoints[i][j].x - fieldSize/2 && mousePos.x < boardPoints[i][j].x + fieldSize - fieldSize/2){
                    returnObj.x = i;
                }
                if(mousePos.y > boardPoints[i][j].y - fieldSize/2 && mousePos.y < boardPoints[i][j].y + fieldSize - fieldSize/2){
                    returnObj.y = j;
                }
            }
        }
        return returnObj;
    }

    /*event handler for mouseclick
     *@param MouseEvent event
     */
    canvas.on('click', function(event){
        var mousePos = getMousePos(canvas, event),
            boardMousePos = checkMousePos(mousePos);
        //if movement is enabled and click is within the canvas
        if(movementPoints > 0 && boardMousePos.x > -1 && boardMousePos.y > -1) {
            //pass mouseposition to gamesession
            gameSession.requestMove(boardMousePos);
            console.log("click event called");

        }
    });
    //set all possible boardPiece positions
    for (var i = 0; i < myCategoriesArr.length; i++) {
        boardPoints[i] = [];
        for(var j = 0; j < myCategoriesArr[i].length; j++){
            boardPoints[i][j] = { 
                x : midx - (rectWidth/2) + fieldSize * i + (fieldSize/2),
                y : midy - (rectHeight/2) + fieldSize * j + (fieldSize/2)
            }
        }
    }


}

/**
 * Object to hold the Board
 * @param GameSession
 */
function Inputs(newGameSession) {
    //init
    var questionButton = $('#question-button'),
        startButton = $('#start-button'),
        enterGameButton = $('#enterGame-button'),
        abortEnterGameButton = $('#abortEnterGame-button'),
        turnBasedToggle = $('#turnBasedLabel'),
        raceToggle = $('#raceLabel'),
        playerColorInfo = $('#yourColorInfo'),
        selectPlayers = $('#select-players'),
        enterGamePrompt = $('#enterGame-prompt'),
        usernameInput = $('#username'),
        gameSession = newGameSession,
        selectPlayers = $('#select-players');

    /*Creates the prompt used for the promptEnterGame event
     *@param string header
     *@param string body
     *@param Array<function> buttons
     */
    function createEnterGamePromt(header,body,buttons) {
        //show prompt and set header and body 
        enterGamePrompt.show();
        $('.panel-heading',enterGamePrompt).empty().append(header);
        $('.panel-body',enterGamePrompt).empty().append(body);
        //set body and create 'Enter' and 'decline buttons'
        $('.panel-body',enterGamePrompt).append("<br><div class='btn-group'><button id='confirmEnterGame-button' type='button' class='btn btn-default'>Yes</button><button id='denyEnterGame-button' type='button' class='btn btn-default'>No</button></div>");
        //bind the functions in the buttons array to the two new buttons
        $('#confirmEnterGame-button').on('click', buttons[0]);
        $('#denyEnterGame-button').on('click', buttons[1]);
    }

    /*blocks the ui based on a gametype
     *@param string type
     */
    this.blockButtons = function(type){
        if(type == "turnBased"){
            questionButton.prop("disabled", true);
        }
        startButton.prop("disabled", true);
    }
    /*
     *enables the ui
     */
    this.enableButtons = function() {
        questionButton.prop("disabled", false);
        startButton.prop("disabled", false);
    }

    /*sets a message in the entergamepromt container
     *@param string header
     *@param string body
     *@param Array<function> buttons
     */
    this.enterGameMessage = function(header, body, buttons){
        enterGamePrompt.show();
        if(buttons == undefined){
            $('.panel-heading',enterGamePrompt).empty().append(header);
            $('.panel-body',enterGamePrompt).empty().append(body);
        } else {
            createEnterGamePromt(header, body, buttons);
        }
    }

    /*hides the enterGame prompt
     *
     */
    this.hideEnterGamePrompt = function(){
        enterGamePrompt.hide();
    }

    /*adds the loading class
     *this cause the overlay and loading giff to appear(see styles.css)
     */
    this.waitForResponse = function(){
        $('body').addClass("loading");
    }

    /*removes loading class
     *
     */
    this.responseRecieved = function(){
        $('body').removeClass("loading");
    }

    /*updates the <option> element
     *@param Object players
     */
    this.updatePlayerSelector = function(players){
        //emtpy selecter
        selectPlayers.empty();
        //body to username and value to socketId
        for(var id in players){
            if(players[id].socketId != player.socketId){
                selectPlayers.append('<option value="' + players[id].socketId + '">' + players[id].username+ '</option>');
            }
        }
    }

    /*sets the infobox that informs the user of his own color
     *
     */
    this.setPlayerColorInfo = function(){
        playerColorInfo.html('<p style="color:' + player.color + ';">Your Color is ' + player.color + '</p>');
    }

    //handler for all buttons
    questionButton.on('click', function(){
        gameSession.questionButtonEvent();
    });

    turnBasedToggle.on('click', function() {
        gameSession.setGameMode('turnBased');
    });

    raceToggle.on('click', function() {
        gameSession.setGameMode('race');
    });

    startButton.on('click', function(){
        gameSession.startGameEvent();
    });

    enterGameButton.on('click', function(){
        gameSession.enterGameEvent(selectPlayers.val());
    });

    abortEnterGameButton.on('click', function() {
        gameSession.abortEnterGameEvent();
    });

    $('.btn-group').button();
    turnBasedToggle.addClass("active");
    usernameInput.keypress(function(e){
        gameSession.usernameInputEvent(e, usernameInput.val())
    });

}

function GameSession() {
    //variables
    var socket = io.connect(window.location.hostname),
        gamehtml = $('#gamehtml'),
        madeFirstMove = false;
        lobbyhtml = $('#lobbyhtml'),
        uiblock = $('#cover'),
        loadingBox = $('#loadingBox'),
        chooseHandlehtml = $('#chooseHandle'),
        gameType = 'turnBased',
        programState = '',
        myUsername = '',
        players = [],
        player = {},
        myGame = {},
        thisObj = this,
        gameStarted = false,
        inputs = new Inputs(this),
        playerId = Math.round($.now()*Math.random()),
        board = null;

    // private functions
    /*
     * clears the board and draws again. Then draws all boardpieces based on the gameSessions data
     */
    function updatePositions(){
        board.clearboard();
        board.drawBoard();
        var drawnAtPos = [];

        for(var k = 0; k<myGame.players.length;k++){
            board.drawBoardPiece(myGame.players[k].position,myGame.players[k].color);
        }
    }

    /*
     * checks the Answer the user proveided
     *@param boolean isCorrect
     */
    function checkAnswer(isCorrect){
        //if answer is correct
        if(isCorrect){
            //add movementPoints() will allow the board to pass on the mouseevent coordinates to the gameSession
            board.addMovementPoint();
            board.setMessage("Click adjescent field to move");
            updatePositions();
            if(!madeFirstMove){
                //if first time infrom player how he can move
                madeFirstMove = true;
                bootbox.alert("Correct! Now click an adjescent field to move.")
            }
        }
        else{
            //if answer is wrong
            bootbox.alert("Sorry, that's wrong!");
            socket.emit('turnEnded', myGame);
        }
    }

    /*Displays a question for the use
     *@param Object data
     */
    function showQuestion(data){
        var num = 'num';
        //set title and body for bootbox popup
        bootboxObj = {
            title   : data.title,
            message : data.question,
            closeButton: false,
            buttons : {}
        };
        //set buttons
        for(var i = 0; i < data.options.length; i++){
            bootboxObj.buttons[num + i] = {};
            bootboxObj.buttons[num + i].label = data.options[i].label;
            bootboxObj.buttons[num + i].className = "btn-primary";
            if(data.options[i].correct){
                bootboxObj.buttons[num + i].callback = function(){
                    checkAnswer(true);
                }
            } else {
                bootboxObj.buttons[num + i].callback = function(){
                    checkAnswer(false);
                }
            }
        }
        bootbox.dialog(bootboxObj);
    }

    /*Inform playerSelector of changes
     */
    function updatePlayerSelector(){
        inputs.updatePlayerSelector(players);
    }

    //public funcions
    /*called by the board when movement is enabled
     *@param {x: int, y: int} boardMousePos
     */
    this.requestMove = function(boardMousePos){
        console.log("requestMove called");
        //pass event to server
        if(board != null && board.getMovementPoint != 0){
            socket.emit('requestMove', boardMousePos, myGame);
        }
    }

    /*triggered by the Questionbutton
     */
    this.questionButtonEvent = function(){
        socket.emit('question', myGame);
    }

    /*triggered by the gameToggle
     *@param string mode
     */
    this.setGameMode = function(mode) {
        gameType = mode;
    }

    /*triggered by the startButton
     */
    this.startGameEvent = function(){
        socket.emit('startGame',{
            'player' : playerId,
            'game'  : myGame,
            'gameType': gameType
        });
    }

    /*triggered by the EnterGameButton
     *@param Array<string> selectedPlayers
     */
    this.enterGameEvent = function(selectedPlayers){
        if(programState === "lobby"){
            socket.emit('requestEnterGame',selectedPlayers);
        }
    }

    /*triggered by the abortButton
     */
    this.abortEnterGameEvent = function(){
         socket.emit('playerDenied', myGame.initiator.socketId, myGame);
    }

    /*triggered on keypress in the usernameInput
     *@param Key key
     *@param string val
     */
    this.usernameInputEvent = function(key, val){
         //if enter is pressed
         if(key.keyCode == 13){
            //save string as username
            myUsername = val;
            key.preventDefault();
            key.stopPropagation();
            //hide usernameInput
            chooseHandlehtml.hide();
            //enter lobby
            lobbyhtml.show();
            inputs.hideEnterGamePrompt();
            socket.emit('newPlayer', {
                'playerName' : myUsername
            });
            socket.emit("queryPlayerList");
            programState = 'lobby';
        }
    }
    //socket events
    /*triggered when a new player joins the server
     *@param Object data
     */
    socket.on('newPlayer',function(data){
        console.log("Event: New Player");
        //save players object
        players = data;
        if(programState === 'lobby') {
            //if shown update the selector
            updatePlayerSelector();
        }

    });

    /*triggered when a player move is accepted by the server
     *@param Game game
     *@param string movingPlayerId
     */
    socket.on('playerMoved',function(game, movingPlayerId){
        console.log("Event: Player Moved");
        //save game object
        myGame = game;
        if(socket.socket.sessionid === movingPlayerId){
            //if this user was the one who moved, remove the movementPoint
            board.removeMovementPoint();
            if(gameStarted){
                //reset board message and pass turn if game is started
                board.setMessage("");
                socket.emit('turnEnded', myGame);
            }
        }
        //update board
        updatePositions();
    });

    /*triggered when the server accepts connection from this user
     *@param Object data
     */
    socket.on('init',function(data){
       console.log("Event: Init");
       //save players and this player
       players = data;
       player = players[socket.socket.sessionid];
       if(programState === 'game'){
            updatePositions();
        }
    });

    /*triggered when the server has retreived a question
     *@param Object data (question object)
     */
    socket.on('questionResponse',function(data){
        console.log("Event: QuestionResponse");
        showQuestion(data);
    });

    /*called when a player disconnects from the server
     *@param Object players
     *@param Game game
     */
    socket.on('playerDisconnected', function(data, game){
       console.log("Event: PlayerDisconnected");
       //save new players object and update the selected
       players = data;
       updatePlayerSelector();
       if(game != null) {
            if(game.id == myGame.id && programState === "game"){
                //if player is in my game, and game is entered save game and update board
                myGame = game;
                updatePositions();
            }
        }

    });

    /*triggered when someone starts the game
     *@param Game game
     *@param string gameTypeServer
     */
    socket.on('gameStarted', function(game, gameTypeServer) {
        console.log("Event: Game Started");
        //reset game vars and update board
        gameType = gameTypeServer;
        board.setGameStarted(true);
        inputs.blockButtons(gameType);
        gameStarted = true;
        myGame = game;
        board.setMessage("game Started");
        updatePositions();
        socket.emit('ready',myGame);
    });

    /*triggered when the server determines that this user has the turn
     */
    socket.on('startTurn', function() {
        console.log("Event: startTurn");
        socket.emit('question', myGame);
    });

    /*triggered when this player has won the game
     */
    socket.on('playerWon',function() {
        console.log("Event: PlayerWon");
        bootbox.alert("You won! Congratulations!");
        gameStarted = false;
        inputs.enableButtons();
        board.setGameStarted(false);
    });

    /*triggered when this player has lost the game
     */
    socket.on('playerLost', function() {
        console.log("Event: PlayerLost");
        bootbox.alert("You lost! Better luck next time!");
        gameStarted = false;
        inputs.enableButtons();
        board.setGameStarted(false);
    });

    /*emitted as a response to queryPlayerList
     *@param Object players
     */
    socket.on('playerList', function(players){
        console.log("Event: PlayerList");
        this.players = players;
        updatePlayerSelector();
    });

    /*triggered when a another player invites this player to a game
     *@param string id
     *@param Game game
     */
    socket.on('promptEnterGame', function(id, game){
        console.log("Event: PromptEnterGame");
        var promptingPlayerName;
        myGame = game
        programState = 'prompted';
        promptingPlayerName = players[id].username;
        //define functions for the buttons
        var buttonFunctions = [
            function(){
                console.log("it's confirmed!");
                socket.emit('confirmEnterGame', myGame);
            },
            function(){
                socket.emit('playerDenied', id, myGame);
            }
        ]
        //display message for user
        inputs.enterGameMessage("Player " + promptingPlayerName + " wants to start a game with you","Do you want to enter enter a new game with " + promptingPlayerName + "?", buttonFunctions);       
    });

    /*triggered if an invited player is busy
     *@param Player player
     */
    socket.on('playerBusy', function(player){
        console.log("Event: PlayerBusy");
        inputs.enterGameMessage("Player " + player.username + " is busy","Try to find a player that is not busy.");
    });

    /*triggered when this user accepts an invitation, but not all invited players has accepted
     *@param Game game
     */
    socket.on('waitForResponse', function(game){
        console.log("Event: WaitForResponse");
        inputs.waitForResponse();
        programState = 'waiting';
        myGame = game;
    });

    /*triggered if another player declines a game you have accepted
     *@param string aborterId
     */
    socket.on('abortGame', function(aborterId){
        console.log("Event: AbortGame");
        //decide what to do based on the state of the GUI
        if(programState === 'prompted') {
            inputs.hideEnterGamePrompt();
        } else if(programState === 'waiting'){
            inputs.responseRecieved();
            if(socket.socket.sessionid === aborterId){
                inputs.hideEnterGamePrompt();
            } else {
                inputs.enterGameMessage("Game Cancelled", "Someone turned down your request");    
            }
        }
        programState = 'lobby';
    });

    /*triggered if this user tries to start more than 1 game at a time
     */
    socket.on('gameAmountOverflow', function(){
        console.log("Event: gameAmountOverFlow");
        inputs.enterGameMessage("Cannot start another game", "you cannot initiate more than one game at a time");
    });

    /*triggered if this user tries to start with more than 3 other players
     */
    socket.on('tooManyPlayers', function(){
        console.log("Event: TooManyPlayers");
        inputs.enterGameMessage("Cannot start game", "You must select between 1 and 3 players");
    });

    /*triggered when all players invited to a game have accepted
     *@param Game game
     *@oaram Player playerObject
     */
    socket.on('enterGame', function (game, playerObject) {
        console.log("Event: EnterGame");
        //hide all lobby html and show game
        programState = 'game';
        lobbyhtml.hide();
        uiblock.hide();
        gamehtml.show();
        myGame = game;
        player = playerObject;
        inputs.setPlayerColorInfo();
        //create board object and draw board based on myGame
        board = new Board(game.categoriesArr, thisObj);
        updatePositions();
    });

    /*triggered if this user has tried to make an illegal move
     */
    socket.on('illegalMove', function(){
        console.log("Event: IllegalMove");
        board.setMessage("You can only move 1 field");
        updatePositions();
    });   

    //input events
   
    //initialize
    gamehtml.hide();
    lobbyhtml.hide();
    programState = 'welcome';






    //ctx.clearRect(0,0,canvas[0].width,canvas[0].height)
    //drawBoardPiece(boardPoints[0].x,boardPoints[0].y);

}

$(function(){
    if(!('getContext' in document.createElement('canvas'))){
        alert('Sorry, it looks like your browser does not support canvas!');
        $('header').innerHTML = "Browser does not support canvas";
    }

    var session = new GameSession;
});