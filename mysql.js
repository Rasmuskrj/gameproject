var mysql = require('mysql');

var mysqlConnection = mysql.createConnection({
    host    :   '127.0.0.1',
    user    :   'root',
    password:   'S3rv3rMu5e',
    database:   'Quiz_questions'
});


exports.connect = function(){
    mysqlConnection.connect(function(err){
        if(err != null){
            console.log("ERROR: " + err);
        }
    });
};

exports.getQuestion = function(category, callback){
    var id = 1,
        sql = "SELECT count(*) FROM " + category + ";",
        response = null;

    console.log(category);
    mysqlConnection.query(sql,function(err1, rows1, fields1){
        var maxId = rows1[0]["count(*)"];
        id = Math.floor(Math.random() * maxId) + 1;
        sql = "SELECT * FROM " + category + " WHERE id=" + id + ";";
        console.log(id);
        mysqlConnection.query(sql, function(err, rows, fields){
            callback(rows[0]);
        });
    });

};