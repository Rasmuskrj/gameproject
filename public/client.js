function Board(categoriesArr, newGameSession){
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

    this.drawBoard = function() {
        ctx.clearRect(0,0,canvas[0].width,canvas[0].height);
        this.drawRect(midx,midy, rectWidth, rectHeight, 'white', 'black', 6);
        for (var i = 0; i < myCategoriesArr.length; i++) {
            for(var j = 0; j < myCategoriesArr[i].length; j++){
                this.drawRect(midx - (rectWidth/2) + fieldSize * i + (fieldSize/2), midy - (rectHeight/2) + fieldSize * j + (fieldSize/2), fieldSize, fieldSize, colorCategoryRelations[myCategoriesArr[i][j]], 'black', 1)
            }
        }
        ctx.font = "28px Arial";
        ctx.strokeStyle = 'black';
        ctx.strokeText(currentMessage,midx,midy - rectHeight/2 - 100);
    }

    this.drawRect = function(centerX,centerY,width,height,fill,stroke, lineWidth){
        ctx.beginPath();
        ctx.rect(centerX-(width/2),centerY-(height/2),width,height);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();

    }

    this.drawLine = function(fromX,fromY, toX,toY, lineWidth){
        ctx.lineWidth = lineWidth;
        ctx.moveTo(fromX,fromY);
        ctx.lineTo(toX,toY);
        ctx.stroke();
    }

    this.setGameStarted = function(state){
        gameStarted = state;
    }

    this.getBoardPointsArr = function(){
        return boardPoints;
    }

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

    this.clearboard = function() {
        ctx.clearRect(0,0,canvas[0].width,canvas[0].height);
    }

    this.addMovementPoint = function() {
        movementPoints++;
    }

    this.removeMovementPoint = function() {
        movementPoints = 0;
    }

    this.setMessage = function(message){
        currentMessage = message;
    }

    function getMousePos(canvas, event){
        var rect = canvas[0].getBoundingClientRect();
        return {x: event.clientX - rect.left, y: event.clientY - rect.top};
    }

    function checkMousePos(mousePos){
        var returnObj = {x: -1, y: -1}
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

    console.log(myCategoriesArr);
    canvas.on('click', function(event){
        var mousePos = getMousePos(canvas, event),
            boardMousePos = checkMousePos(mousePos);
        if(movementPoints > 0 && boardMousePos.x > -1 && boardMousePos.y > -1) {
            gameSession.requestMove(boardMousePos);
            console.log("click event called");

        }
    });
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

function Inputs(newGameSession) {
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

    function createEnterGamePromt(header,body,buttons) {
        enterGamePrompt.show();
        $('.panel-heading',enterGamePrompt).empty().append(header);
        $('.panel-body',enterGamePrompt).empty().append(body);
        $('.panel-body',enterGamePrompt).append("<br><div class='btn-group'><button id='confirmEnterGame-button' type='button' class='btn btn-default'>Yes</button><button id='denyEnterGame-button' type='button' class='btn btn-default'>No</button></div>");
        $('#confirmEnterGame-button').on('click', buttons[0]);
        $('#denyEnterGame-button').on('click', buttons[1]);
    }

    this.blockButtons = function(type){
        if(type == "turnBased"){
            questionButton.prop("disabled", true);
        }
        startButton.prop("disabled", true);
    }

    this.enableButtons = function() {
        questionButton.prop("disabled", false);
        startButton.prop("disabled", false);
    }

    this.enterGameMessage = function(header, body, buttons){
        enterGamePrompt.show();
        if(buttons == undefined){
            $('.panel-heading',enterGamePrompt).empty().append(header);
            $('.panel-body',enterGamePrompt).empty().append(body);
        } else {
            createEnterGamePromt(header, body, buttons);
        }
    }

    this.hideEnterGamePrompt = function(){
        enterGamePrompt.hide();
    }

    this.waitForResponse = function(){
        $('body').addClass("loading");
    }

    this.responseRecieved = function(){
        $('body').removeClass("loading");
    }

    this.updatePlayerSelector = function(players){
        selectPlayers.empty();
        for(var i=0; i < players.length; i++){
            if(players[i].socketId != player.socketId){
                selectPlayers.append('<option value="' + players[i].socketId + '">' + players[i].username+ '</option>')
            }
        }
    }

    this.setPlayerColorInfo = function(){
        playerColorInfo.html('<p style="color:' + player.color + ';">Your Color is ' + player.color + '</p>');
    }

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
    function updatePositions(){
        board.clearboard();
        board.drawBoard();
        var drawnAtPos = [];
        /*for(var i=0;i<board.getBoardPointsArr().length;i++){
            drawnAtPos[i] = 0;
        }*/
        for(var k = 0; k<myGame.players.length;k++){
            board.drawBoardPiece(myGame.players[k].position,myGame.players[k].color);
            //drawnAtPos[myGame.players[k].position]++;
        }
    }

    function checkAnswer(isCorrect){
        if(isCorrect){
            board.addMovementPoint();
            board.setMessage("Click adjescent field to move");
            updatePositions();
            if(!madeFirstMove){
                madeFirstMove = true;
                bootbox.alert("Correct! Now click an adjescent field to move.")
            }
        }
        else{
            bootbox.alert("Sorry, that's wrong!");
            socket.emit('turnEnded', myGame);
        }
        console.log(gameStarted);
    }

    function showQuestion(data){
        var num = 'num';
        bootboxObj = {
            title   : data.title,
            message : data.question,
            closeButton: false,
            buttons : {}
        };
        for(var i = 0; i < data.options.length; i++){
            bootboxObj.buttons[num + i] = {};
            bootboxObj.buttons[num + i].label = data.options[i].label;
            bootboxObj.buttons[num + i].className = "btn-primary";
            if(data.options[i].correct){
                //anonymous function not needed? check
                bootboxObj.buttons[num + i].callback = function(){
                    checkAnswer(true);
                }
            } else {
                bootboxObj.buttons[num + i].callback = function(){
                    checkAnswer(false);
                }
            }
        }
        console.log(bootboxObj);
        bootbox.dialog(bootboxObj);
    }

    function updatePlayerSelector(){
        inputs.updatePlayerSelector(players);
    }

    //public funcions
    this.requestMove = function(boardMousePos){
        console.log("requestMove called");
        socket.emit('requestMove', boardMousePos, myGame);
    }

    this.questionButtonEvent = function(){
        socket.emit('question', myGame);
    }

    this.setGameMode = function(mode) {
        gameType = mode;
        console.log(gameType);
    }

    this.startGameEvent = function(){
        socket.emit('startGame',{
            'player' : playerId,
            'game'  : myGame,
            'gameType': gameType
        });
    }

    this.enterGameEvent = function(selectedPlayers){
        if(programState === "lobby"){
            console.log(selectedPlayers);
            socket.emit('requestEnterGame',selectedPlayers);
        }
    }

    this.abortEnterGameEvent = function(){
         console.log(socket.socket.sessionid);
        if(programState === "waiting"){
            socket.emit('playerDenied', myGame.initiator.socketId);
        }
    }

    this.usernameInputEvent = function(key, val){
         if(key.keyCode == 13){
            myUsername = val;
            key.preventDefault();
            key.stopPropagation();
            chooseHandlehtml.hide();
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
    socket.on('newPlayer',function(data){
        console.log("Event: New Player");
        players = data;
        console.log("newPlayer called this" + players);
        if(programState === 'lobby') {
            updatePlayerSelector();
        }

    });
    socket.on('playerMoved',function(game, movingPlayerId){
        console.log("Event: Player Moved");
        myGame = game;
        if(socket.socket.sessionid === movingPlayerId){
            board.removeMovementPoint();
            if(gameStarted){
                board.setMessage("");
                socket.emit('turnEnded', myGame);
            }
        }
        updatePositions();
    });

    socket.on('init',function(data){
       console.log("Event: Init");
       players = data;
       for (var i = 0; i < players.length; i++) {
           if(players[i].socketId === socket.socket.sessionid){
                player = players[i];
           }
       }
       if(programState === 'game'){
            updatePositions();
        }
    });

    socket.on('questionResponse',function(data){
        console.log("Event: QuestionResponse");
        showQuestion(data);
    });

    socket.on('updatePlayerSelector', function(serverPlayers){
        console.log("Event: UpdatePlayerSelector");
        players = serverPlayers;
        updatePlayerSelector();
    });

    socket.on('playerDisconnected', function(data, game){
       console.log("Event: PlayerDisconnected");
       players = data;
       updatePlayerSelector();
       if(game != null) {
            if(game.id == myGame.id && programState === "game"){
                myGame = game;
                updatePositions();
            }
        }

    });

    socket.on('gameStarted', function(game, gameTypeServer) {
        console.log("Event: Game Started");
        gameType = gameTypeServer;
        board.setGameStarted(true);
        inputs.blockButtons(gameType);
        gameStarted = true;
        myGame = game;
        board.setMessage("game Started");
        updatePositions();
        socket.emit('ready',myGame);
    });

    socket.on('startTurn', function() {
        console.log("Event: startTurn");
        socket.emit('question', myGame);
    });

    socket.on('playerWon',function() {
        console.log("Event: PlayerWon");
        bootbox.alert("You won! Congratulations!");
        gameStarted = false;
        inputs.enableButtons();
        board.setGameStarted(false);
    });

    socket.on('playerLost', function() {
        console.log("Event: PlayerLost");
        bootbox.alert("You lost! Better luck next time!");
        gameStarted = false;
        inputs.enableButtons();
        board.setGameStarted(false);
    });

    socket.on('playerList', function(players){
        console.log("Event: PlayerList");
        this.players = players;
        updatePlayerSelector();
    });

    socket.on('promptEnterGame', function(id){
        console.log("Event: PromptEnterGame");
        var promptingPlayerName;
        programState = 'prompted';
        for(var i=0; i < players.length; i++){
            if(id === players[i].socketId){
                promptingPlayerName = players[i].username;
            }
        }
        var buttonFunctions = [
            function(){
                console.log("it's confirmed!");
                socket.emit('confirmEnterGame');
            },
            function(){
                socket.emit('playerDenied', id);
            }
        ]
        inputs.enterGameMessage("Player " + promptingPlayerName + " wants to start a game with you","Do you want to enter enter a new game with " + promptingPlayerName + "?", buttonFunctions);       
    });

    socket.on('playerBusy', function(player){
        console.log("Event: PlayerBusy");
        inputs.enterGameMessage("Player " + player.username + " is busy","Try to find a player that is not busy.");
    });

    socket.on('waitForResponse', function(game){
        console.log("Event: WaitForResponse");
        inputs.waitForResponse();
        programState = 'waiting';
        myGame = game;
    });

    socket.on('abortGame', function(aborterId){
        console.log("Event: AbortGame");
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

    socket.on('gameAmountOverflow', function(){
        console.log("Event: gameAmountOverFlow");
        inputs.enterGameMessage("Cannot start another game", "you cannot initiate more than one game at a time");
    });

    socket.on('tooManyPlayers', function(){
        console.log("Event: TooManyPlayers");
        inputs.enterGameMessage("Cannot start game", "You must select between 1 and 4 players");
    });

    socket.on('enterGame', function (game, playerObject) {
        console.log("Event: EnterGame");
        programState = 'game';
        lobbyhtml.hide();
        uiblock.hide();
        gamehtml.show();
        myGame = game;
        player = playerObject;
        inputs.setPlayerColorInfo();
        board = new Board(game.categoriesArr, thisObj);
        updatePositions();
    });

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