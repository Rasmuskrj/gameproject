function Board(){
    var doc = $(document);
    var canvas = $('#board');
    var ctx = canvas[0].getContext("2d");
    var midx = canvas.width() / 2 - 200,
        midy = canvas.height() / 2,
        rectWidth = 500,
        rectHeight = 300,
        gamePathWidth = 100,
        innerRectWidth = rectWidth - gamePathWidth,
        innerRectHeight = rectHeight - gamePathWidth,
        colorKey = 0,
        gameStarted = false,
        players = {},
        boardPiece = new Image(),
        boardPoints = [
            {
                x : midx-(innerRectWidth/4),
                y : midy-(innerRectHeight/2)-(gamePathWidth/4),
                alignment: 'horizontal'
            },
            {
                x : midx+(innerRectWidth/4),
                y : midy-(innerRectHeight/2)-gamePathWidth/4,
                alignment: 'horizontal'
            },
            {
                x : midx+(innerRectWidth/2)+gamePathWidth/4,
                y : midy-(innerRectHeight/4),
                alignment: 'vertical'
            },
            {
                x : midx+(innerRectWidth/2)+gamePathWidth/4,
                y : midy+(innerRectHeight/4),
                alignment: 'vertical'
            },
            {
                x : midx+(innerRectWidth/4),
                y : midy+(innerRectHeight/2)+gamePathWidth/4,
                alignment: 'horizontal'
            },
            {
                x : midx-(innerRectWidth/4),
                y : midy+(innerRectHeight/2)+gamePathWidth/4,
                alignment: 'horizontal'
            },
            {
                x : midx-(innerRectWidth/2)-gamePathWidth/4,
                y : midy+(innerRectHeight/4),
                alignment: 'vertical'
            },
            {
                x : midx-(innerRectWidth/2)-gamePathWidth/4,
                y : midy-(innerRectHeight/4),
                alignment: 'vertical'
            }
        ];

    this.setGameStarted = function(state){
        gameStarted = state;
    };

    this.getBoardPointsArr = function(){
        return boardPoints;
    };

    this.drawRect = function(centerX,centerY,width,height,fill,stroke){
        ctx.beginPath();
        ctx.rect(centerX-(width/2),centerY-(height/2),width,height);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = stroke;
        ctx.stroke();

    };

    this.drawLine = function(fromX,fromY, toX,toY){
        ctx.lineWidth = 4;
        ctx.moveTo(fromX,fromY);
        ctx.lineTo(toX,toY);
        ctx.stroke();
    };

    this.drawBoard = function(){
        ctx.clearRect(0,0,canvas[0].width,canvas[0].heigh);
        this.drawRect(midx,midy,rectWidth,rectHeight,'white','black');
        this.drawRect(midx,midy,innerRectWidth,innerRectHeight,'white','black');
        this.drawLine(midx-(rectWidth/2),midy-(rectHeight/2),midx-(innerRectWidth/2),midy-(innerRectHeight/2));
        this.drawLine(midx,midy-(rectHeight/2),midx,midy-(innerRectHeight/2));
        this.drawLine(midx+(rectWidth/2),midy-(rectHeight/2),midx+(innerRectWidth/2),midy-(innerRectHeight/2));
        this.drawLine(midx+(rectWidth/2),midy,midx+(innerRectWidth/2),midy);
        this.drawLine(midx+(rectWidth/2),midy+(rectHeight/2),midx+(innerRectWidth/2),midy+(innerRectHeight/2));
        this.drawLine(midx,midy+(rectHeight/2),midx,midy+(innerRectHeight/2));
        this.drawLine(midx-(rectWidth/2),midy+(rectHeight/2),midx-(innerRectWidth/2),midy+(innerRectHeight/2));
        this.drawLine(midx-(rectWidth/2),midy,midx-(innerRectWidth/2),midy);

        if(gameStarted){
            ctx.font = "28px Arial";
            ctx.strokeStyle = 'green';
            ctx.strokeText("Game Started",midx-100,midy);
        }
    };

    this.drawBoardPiece = function (atPos, color, drawnAtPos){
        var baseX = boardPoints[atPos].x,
            baseY = boardPoints[atPos].y,
            pieceSideWidth = 15,
            pieceBottomWidth = 10,
            pieceSeperationLength = 50,
            alignment = boardPoints[atPos].alignment;

        if(alignment==='horizontal' && drawnAtPos>0){
            baseX = baseX - (drawnAtPos)*pieceSeperationLength
        } else if(drawnAtPos >0){
            baseY = baseY - (drawnAtPos)*pieceSeperationLength;
        }
        ctx.beginPath();
        ctx.moveTo(baseX-pieceBottomWidth,baseY+pieceSideWidth);
        ctx.lineTo(baseX, baseY-pieceSideWidth);
        ctx.lineTo(baseX+pieceBottomWidth,baseY+pieceSideWidth);
        ctx.lineTo(baseX-pieceBottomWidth,baseY+pieceSideWidth);
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = color;
        ctx.stroke();
        colorKey++;
    };

    this.clearboard = function() {
        ctx.clearRect(0,0,canvas[0].width,canvas[0].height);
    };

    //this.drawnAtPos = 0;

}

$(function(){
    if(!('getContext' in document.createElement('canvas'))){
        alert('Sorry, it looks like your browser does not support canvas!');
        $('header').innerHTML = "Browser does not support canvas";
    }

    //variables
    var socket = io.connect(window.location.hostname),
        moveButton = $('#move-button'),
        questionButton = $('#question-button'),
        startButton = $('#start-button'),
        enterGameButton = $('#enterGame-button'),
        turnBasedToggle = $('#turnBasedLabel'),
        enterGamePrompt = $('#enterGame-prompt'),
        raceToggle = $('#raceLabel'),
        gamehtml = $('#gamehtml'),
        lobbyhtml = $('#lobbyhtml'),
        uiblock = $('#cover'),
        loadingBox = $('#loadingBox'),
        chooseHandlehtml = $('#chooseHandle'),
        usernameInput = $('#username'),
        selectPlayers = $('#select-players'),
        gameType = 'turnBased',
        programState = '',
        myUsername = '',
        players = [],
        player = {},
        gameStarted = false;
        playerId = Math.round($.now()*Math.random());
        board = new Board;

    //functions
    function updatePositions(){
        board.clearboard();
        board.drawBoard();
        var drawnAtPos = [];
        for(var i=0;i<board.getBoardPointsArr().length;i++){
            drawnAtPos[i] = 0;
        }
        for(var k = 0; k<players.length;k++){
            board.drawBoardPiece(players[k].position,players[k].color,drawnAtPos[players[k].position]);
            drawnAtPos[players[k].position]++;
        }
    }

    function checkAnswer(isCorrect){
        if(isCorrect){socket.emit('playerMoved',{player: playerId})}
        else{bootbox.alert("Sorry, that's wrong!")}
        console.log(gameStarted);
        if(gameStarted){socket.emit('turnEnded',{
            'player' : playerId
        });}
    }

    function showQuestion(data){
        var num = 'num';
        bootboxObj = {
            title   : data.title,
            message : data.question,
            buttons : {}
        };
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
        console.log(bootboxObj);
        bootbox.dialog(bootboxObj);
        /*bootbox.dialog({
            title: data.title,
            message: data.question,
            buttons: {
                first: {
                    label: data.answers.first.label,
                    className: "btn-primary",
                    callback: function(){
                        checkAnswer(data.answers.first.correct);
                    }
                },
                second: {
                    label: data.answers.second.label,
                    className: "btn-primary",
                    callback: function(){
                        checkAnswer(data.answers.second.correct);
                    }
                },
                third: {
                    label: data.answers.third.label,
                    className: "btn-primary ",
                    callback: function(){
                        checkAnswer(data.answers.third.correct);
                    }
                }
            }
        });*/
    }

    function updatePlayerSelector(){
        selectPlayers.empty();
        for(var i=0; i < players.length; i++){
            if(players[i].socketId != player.socketId){
                selectPlayers.append('<option value="' + players[i].socketId + '">' + players[i].username+ '</option>')
            }
        }
    }

    function waitForResponse(){
        $('body').addClass("loading");
    }

    function responseRecieved(){
        $('body').removeClass("loading");
    }

    function enterGameMessage(header, body){
        $('.panel-heading',enterGamePrompt).empty().append(header);
        $('.panel-body',enterGamePrompt).empty().append(body);
    }

    //socket events
    socket.on('newPlayer',function(data){
        players = data;
        console.log("newPlayer called this" + players);
        updatePositions();
        if(programState === 'lobby') {
            updatePlayerSelector();
        }

    });
    socket.on('playerMoved',function(data){
        players = data;
        updatePositions();
    });

    socket.on('init',function(data){
       players = data;
       player = players[players.length - 1];
       console.log("init called this" + players);
       updatePositions();
    });

    socket.on('questionResponse',function(data){
        console.log(data);
        showQuestion(data);
    });

    socket.on('playerDisconnected', function(data){
       players = data;
       updatePositions();
    });

    socket.on('gameStarted', function(data, gameTypeServer) {
        console.log("Game Started");
        gameType = gameTypeServer;
        board.setGameStarted(true);
        if(gameType == "turnBased"){
            questionButton.prop("disabled", true);
        }
        moveButton.prop("disabled", true);
        startButton.prop("disabled", true);
        gameStarted = true;
        players = data;
        updatePositions();
        socket.emit('ready',{
            'player' : playerId
        })
        console.log(gameType);
    });

    socket.on('startTurn', function() {
        console.log("start turn called");
        socket.emit('question',{
            'player' : playerId
        });
    });

    socket.on('enterGameRequest',function() {

    });

    socket.on('playerWon',function() {
        bootbox.alert("You won! Congratulations!");
        gameStarted = false;
        moveButton.prop("disabled", false);
        questionButton.prop("disabled", false);
        startButton.prop("disabled", false);
        board.setGameStarted(false);
    });

    socket.on('playerLost', function() {
        bootbox.alert("You lost! Better luck next time!");
        gameStarted = false;
        moveButton.prop("disabled", false);
        questionButton.prop("disabled", false);
        startButton.prop("disabled", false);
        board.setGameStarted(false);
    });

    socket.on('playerList', function(players){
        this.players = players;
        updatePlayerSelector();
    });

    socket.on('promptEnterGame', function(id){
        var promptingPlayerName;
        programState = 'prompted';
        for(var i=0; i < players.length; i++){
            if(id === players[i].socketId){
                promptingPlayerName = players[i].username;
            }
        }
        enterGamePrompt.show();
        enterGameMessage("Player " + promptingPlayerName + " wants to start a game with you", "Do you want to enter enter a new game with " + promptingPlayerName + "? <br>" + "<div class='btn-group'><button id='confirmEnterGame-button' type='button' class='btn btn-default'>Yes</button><button id='denyEnterGame-button' type='button' class='btn btn-default'>No</button></div>");
        $('#confirmEnterGame-button').on('click', function(){
            console.log("it's confirmed!");
            socket.emit('confirmEnterGame');
        });
        $('#denyEnterGame-button').on('click', function(){
            socket.emit('playerDenied', id);
        });
    });

    socket.on('playerBusy', function(player){
        enterGamePrompt.show();
        $('.panel-heading',enterGamePrompt).empty().append("Player " + player.username + " is busy");
        $('.panel-body',enterGamePrompt).empty().append("Try to find a player that is not busy.");
    });

    socket.on('waitForResponse', function(){
        waitForResponse();
        programState = 'waiting';
    });

    socket.on('abortGame', function(){
        console.log("it's over");
        if(programState === 'prompted') {
            enterGamePrompt.hide();
        } else if(programState === 'waiting'){
            responseRecieved();
            enterGameMessage("Game Cancelled", "Someone turned down your request");
        }
        programState = 'lobby';
    });

    socket.on('gameAmountOverflow', function(){
        enterGameMessage("Cannot start another game", "you cannot initiate more than one game at a time");
    });

    //input events
    moveButton.on('click',function(){
        socket.emit('playerMoved',{
            'player' : playerId
        });
    });

    questionButton.on('click', function(){
        socket.emit('question', {
           'player' : playerId
       });
    });

    turnBasedToggle.on('click', function() {
        gameType = 'turnBased';
        console.log(gameType);
    });

    raceToggle.on('click', function() {
        gameType = 'race';
        console.log(gameType);
    });

    startButton.on('click', function(){
        socket.emit('startGame',{
            'player' : playerId,
            'gameType': gameType
        });
    });

    enterGameButton.on('click', function(){
        if(programState === "lobby"){
            console.log(selectPlayers.val());
            socket.emit('requestEnterGame',selectPlayers.val());
        }
    });

    $('.btn-group').button();
    turnBasedToggle.addClass("active");
    gamehtml.hide();
    lobbyhtml.hide();
    programState = 'welcome';
    usernameInput.keypress(function(e){
        if(e.keyCode == 13){
            myUsername = usernameInput.val();
            e.preventDefault();
            e.stopPropagation();
            chooseHandlehtml.hide();
            lobbyhtml.show();
            enterGamePrompt.hide();
            socket.emit('newPlayer', {
                'playerName' : myUsername
            });
            socket.emit("queryPlayerList");
            programState = 'lobby';
        }

    });





    //ctx.clearRect(0,0,canvas[0].width,canvas[0].height)
    //drawBoardPiece(boardPoints[0].x,boardPoints[0].y);

});