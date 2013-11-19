function Board(){
    var doc = $(document);
    var canvas = $('#board');
    var ctx = canvas[0].getContext("2d");
    var midx = canvas.width() / 2,
        midy = canvas.height() / 2,
        rectWidth = 1000,
        rectHeight = 600,
        gamePathWidth = 200,
        innerRectWidth = rectWidth - gamePathWidth,
        innerRectHeight = rectHeight - gamePathWidth,
        colors = ['red','blue','yellow','black'],
        colorKey = 0,
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
        console.log("drawing board");
    };

    this.drawBoardPiece = function (atPos, color, drawnAtPos){
        var baseX = boardPoints[atPos].x,
            baseY = boardPoints[atPos].y,
            alignment = boardPoints[atPos].alignment;

        if(alignment==='horizontal' && drawnAtPos>0){
            baseX = baseX - (drawnAtPos)*50
        } else if(drawnAtPos >0){
            baseY = baseY - (drawnAtPos)*50;
        }
        ctx.beginPath();
        ctx.moveTo(baseX-20,baseY+30);
        ctx.lineTo(baseX, baseY-30);
        ctx.lineTo(baseX+20,baseY+30);
        ctx.lineTo(baseX-20,baseY+30);
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


    var socket = io.connect(window.location.hostname),
        moveButton = $('#move-button'),
        questionButton = $('#question-button'),
        startButton = $('#start-button'),
        playerPos = 0,
        players = [],
        myColor = '',
        answer = false,
        gameStarted = false;
        playerId = Math.round($.now()*Math.random());
        board = new Board;

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

    socket.on('newPlayer',function(data){
        players = data;
        console.log("newPlayer called this" + players);
        updatePositions();

    });
    socket.on('playerMoved',function(data){
        players = data;
        updatePositions();
    });

    socket.on('init',function(data){
       players = data;
       playerId = data.length-1;
       myColor = data[playerId].color;
       playerPos = data[playerId].position;
       console.log("init called this" + players);
       updatePositions();
    });

    socket.on('questionResponse',function(data){
        console.log(data);
        bootbox.dialog({
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
        });
    });

    socket.on('playerDisconnected', function(data){
       players = data;
       updatePositions();
    });

    socket.on('gameStarted', function() {
        moveButton.prop("disabled", true);
        questionButton.prop("disabled", true);
        startButton.prop("disabled", true);
        gameStarted = true;
    });

    socket.on('startTurn', function() {
        console.log("start turn called");
        socket.emit('question',{
            'player' : playerId
        });
    });

    socket.on('playerWon',function() {
        bootbox.alert("You won! Congratulations!");
    });

    socket.on('playerLost', function() {
        bootbox.alert("You lost! Better luck next time!");
    });

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

    startButton.on('click', function(){
        socket.emit('startGame',{
            'player' : playerId
        });
    });


    socket.emit('newPlayer', {
        'player' : playerId
    });

    //ctx.clearRect(0,0,canvas[0].width,canvas[0].height)
    //drawBoardPiece(boardPoints[0].x,boardPoints[0].y);

});